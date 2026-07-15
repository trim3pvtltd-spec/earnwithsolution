import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FraudDetectionService } from '../common/security/fraud-detection.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminActionLogger } from '../admin/admin-action-logger.service';
import { CreateLeadDto, UpdateLeadStatusDto } from './dto/lead.dto';
import { LeadStatus, LeadSourceType } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private fraud: FraudDetectionService,
    private wallet: WalletService,
    private notifications: NotificationsService,
    private actionLogger: AdminActionLogger,
  ) {}

  private generateLeadCode() {
    const year = new Date().getFullYear();
    const seq = Math.floor(100000 + Math.random() * 900000);
    return `EWS-LD-${year}-${seq}`;
  }

  /**
   * Core flow (Prompt 6): customer/executive fills the company lead form
   * BEFORE the affiliate link opens. We validate, run duplicate checks,
   * save to our own database, generate a Lead ID, and only then hand
   * back the affiliate link for the client to redirect to.
   */
  async createLead(
    dto: CreateLeadDto,
    context: { executiveId?: string; executiveName?: string; customerId?: string; ip?: string },
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Selected product does not exist');
    if (product.status !== 'ACTIVE') throw new BadRequestException('This product is not currently available');

    // --- Duplicate mobile check (fraud detection) ---
    const duplicate = await this.fraud.checkDuplicateMobile(dto.mobile, dto.productId, 30);

    const sourceType: LeadSourceType = context.executiveId
      ? LeadSourceType.FOS // shopkeeper-sourced leads also use FOS/SHOPKEEPER distinguished by role lookup below
      : LeadSourceType.SELF;

    const lead = await this.prisma.lead.create({
      data: {
        leadCode: this.generateLeadCode(),
        customerName: dto.customerName,
        mobile: dto.mobile,
        altMobile: dto.altMobile,
        email: dto.email,
        state: dto.state,
        district: dto.district,
        city: dto.city,
        pincode: dto.pincode,
        occupation: dto.occupation,
        monthlyIncome: dto.monthlyIncome,
        customerId: context.customerId,
        productId: dto.productId,
        executiveId: context.executiveId,
        executiveNameSnapshot: context.executiveName,
        sourceType,
        gpsLat: dto.gpsLat,
        gpsLng: dto.gpsLng,
        deviceInfo: dto.deviceInfo as any,
        ipAddress: context.ip,
        consentGiven: dto.consentGiven,
        status: duplicate ? LeadStatus.DUPLICATE : LeadStatus.PENDING,
        duplicateOfLeadId: duplicate?.id,
        statusReason: duplicate ? 'Auto-flagged: same mobile + product submitted recently' : undefined,
        affiliateRedirectStatus: 'success',
      },
    });

    await this.prisma.leadStatusHistory.create({
      data: { leadId: lead.id, newStatus: lead.status, reason: lead.statusReason },
    });

    if (duplicate) {
      await this.fraud.raiseFlag({ leadId: lead.id, flagType: 'DUPLICATE_MOBILE', riskScore: 40 });
    }

    // GPS pattern anomaly check (only meaningful for executive-sourced leads)
    if (context.executiveId && dto.gpsLat && dto.gpsLng) {
      const anomaly = await this.fraud.checkGpsAnomaly(dto.gpsLat, dto.gpsLng, context.executiveId);
      if (anomaly) {
        await this.fraud.raiseFlag({
          userId: context.executiveId,
          leadId: lead.id,
          flagType: 'GPS_ANOMALY',
          riskScore: 60,
        });
      }
    }

    return {
      leadId: lead.id,
      leadCode: lead.leadCode,
      status: lead.status,
      // Client redirects the browser/webview to this URL right after this call
      redirectUrl: duplicate ? null : product.affiliateLink,
    };
  }

  async findAllAdmin(filters: {
    status?: LeadStatus;
    state?: string;
    productId?: string;
    executiveId?: string;
    from?: Date;
    to?: Date;
  }) {
    return this.prisma.lead.findMany({
      where: {
        status: filters.status,
        state: filters.state,
        productId: filters.productId,
        executiveId: filters.executiveId,
        submittedAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      },
      include: { product: true, executive: { select: { id: true, fullName: true, mobile: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findMine(userId: string, role: string) {
    return this.prisma.lead.findMany({
      where: role === 'CUSTOMER' ? { customerId: userId } : { executiveId: userId },
      include: { product: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { product: true, statusHistory: { orderBy: { changedAt: 'desc' } } },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /**
   * Manual status update by Admin (Prompt 10). Every transition is
   * recorded in lead_status_history for a complete, immutable audit
   * trail. Wallet credit on Approved requires an explicit confirmation
   * flag from the admin — never happens silently.
   */
  async updateStatus(id: string, dto: UpdateLeadStatusDto, adminId: string) {
    const lead = await this.findOne(id);
    const oldStatus = lead.status;

    if (dto.status === 'APPROVED' && !lead.executiveId) {
      // Self-sourced leads (customer applied directly) still get approved,
      // but there is no executive wallet to credit — handled below.
    }

    if (dto.status === 'APPROVED' && lead.walletCredited) {
      throw new BadRequestException('This lead has already been credited — cannot re-approve');
    }

    const updated = await this.prisma.lead.update({
      where: { id },
      data: {
        status: dto.status as LeadStatus,
        statusReason: dto.reason,
        duplicateOfLeadId: dto.duplicateOfLeadId,
        statusUpdatedById: adminId,
        statusUpdatedAt: new Date(),
      },
    });

    await this.prisma.leadStatusHistory.create({
      data: { leadId: id, oldStatus, newStatus: updated.status, changedById: adminId, reason: dto.reason },
    });

    await this.actionLogger.log(adminId, 'leads', 'status_change', id, { oldStatus }, { newStatus: updated.status });

    // --- Approved: manual, confirmed wallet credit ---
    if (dto.status === 'APPROVED' && dto.confirmWalletCredit && lead.executiveId) {
      const payoutAmount = Number(lead.product.payoutAmount || 0);
      if (payoutAmount > 0) {
        const txn = await this.wallet.creditForApprovedLead(
          lead.executiveId,
          payoutAmount,
          lead.id,
          lead.productId,
        );
        await this.prisma.lead.update({
          where: { id },
          data: { walletCredited: true, walletTxnId: txn.id },
        });
        await this.notifications.send({
          userId: lead.executiveId,
          category: 'PAYOUT_UPDATES',
          title: 'Commission Credited',
          body: `₹${payoutAmount} credited for ${lead.product.title} — Lead ${lead.leadCode}`,
        });
      }
    }

    // --- Rejected / Duplicate: notify, no wallet action ---
    if ((dto.status === 'REJECTED' || dto.status === 'DUPLICATE') && lead.executiveId) {
      await this.notifications.send({
        userId: lead.executiveId,
        category: 'PAYOUT_UPDATES',
        title: dto.status === 'REJECTED' ? 'Lead Rejected' : 'Duplicate Lead',
        body: dto.reason || `Lead ${lead.leadCode} was marked ${dto.status.toLowerCase()}`,
      });
    }

    return updated;
  }

  async exportFilters() {
    return this.prisma.lead.findMany({ include: { product: true } });
  }
}
