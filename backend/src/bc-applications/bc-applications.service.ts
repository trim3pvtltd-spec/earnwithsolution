import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AdminActionLogger } from '../admin/admin-action-logger.service';
import { ApplyBcDto, UpdateBcStatusDto } from './dto/bc.dto';
import { BcStatus } from '@prisma/client';

@Injectable()
export class BcApplicationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private actionLogger: AdminActionLogger,
  ) {}

  private generateCode() {
    const year = new Date().getFullYear();
    return `EWS-BC-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async apply(executiveId: string, dto: ApplyBcDto) {
    const existingActive = await this.prisma.bcApplication.findFirst({
      where: { executiveId, bankId: dto.bankId, status: { in: ['PENDING', 'VERIFIED', 'APPROVED'] } },
    });
    if (existingActive) {
      throw new BadRequestException('You already have an active/pending BC application for this bank');
    }

    const application = await this.prisma.bcApplication.create({
      data: {
        applicationCode: this.generateCode(),
        executiveId,
        bankId: dto.bankId,
        aadhaarDocUrl: dto.aadhaarDocUrl,
        panDocUrl: dto.panDocUrl,
        photoUrl: dto.photoUrl,
        cancelledChequeUrl: dto.cancelledChequeUrl,
        addressProofUrl: dto.addressProofUrl,
        status: BcStatus.PENDING,
      },
    });

    await this.prisma.bcStatusHistory.create({
      data: { applicationId: application.id, newStatus: BcStatus.PENDING },
    });

    await this.notifications.send({
      userId: executiveId,
      category: 'GENERAL',
      title: 'BC Application Submitted',
      body: `Your BC ID application (${application.applicationCode}) has been submitted for review.`,
    });

    return application;
  }

  async findMine(executiveId: string) {
    return this.prisma.bcApplication.findMany({
      where: { executiveId },
      include: { bank: true },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findAllAdmin(status?: BcStatus) {
    return this.prisma.bcApplication.findMany({
      where: status ? { status } : {},
      include: { bank: true, executive: { select: { id: true, fullName: true, mobile: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async updateStatus(id: string, dto: UpdateBcStatusDto, adminId: string) {
    const application = await this.prisma.bcApplication.findUnique({ where: { id } });
    if (!application) throw new NotFoundException('BC application not found');

    if (dto.status === 'APPROVED' && !dto.bcIdNumber) {
      throw new BadRequestException('BC ID Number is required to mark as Approved');
    }
    if (dto.status === 'REJECTED' && !dto.reason) {
      throw new BadRequestException('Rejection reason is mandatory');
    }

    const data: any = { status: dto.status, rejectionReason: dto.reason };
    if (dto.status === 'VERIFIED') { data.verifiedById = adminId; data.verifiedAt = new Date(); }
    if (dto.status === 'APPROVED') { data.approvedById = adminId; data.approvedAt = new Date(); data.bcIdNumber = dto.bcIdNumber; }

    const updated = await this.prisma.bcApplication.update({ where: { id }, data });

    await this.prisma.bcStatusHistory.create({
      data: { applicationId: id, oldStatus: application.status, newStatus: dto.status as BcStatus, changedById: adminId, reason: dto.reason },
    });

    await this.actionLogger.log(adminId, 'bc_applications', `status_${dto.status.toLowerCase()}`, id);

    const messages: Record<string, string> = {
      VERIFIED: 'Your documents have been verified. Approval pending from bank.',
      APPROVED: `Congratulations! Your BC ID is approved. BC ID: ${dto.bcIdNumber}`,
      REJECTED: `Your BC application was rejected. Reason: ${dto.reason}. Please re-upload.`,
    };

    await this.notifications.send({
      userId: application.executiveId,
      category: 'GENERAL',
      title: `BC Application ${dto.status}`,
      body: messages[dto.status],
    });

    return updated;
  }
}
