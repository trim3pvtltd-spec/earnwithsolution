import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EncryptionService } from '../common/security/encryption.service';
import { AdminActionLogger } from '../admin/admin-action-logger.service';
import { CreateWithdrawalDto, ProcessWithdrawalDto } from './dto/withdrawal.dto';
import { WithdrawalStatus } from '@prisma/client';

const MIN_WITHDRAWAL = 500;

@Injectable()
export class WithdrawalsService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
    private notifications: NotificationsService,
    private encryption: EncryptionService,
    private actionLogger: AdminActionLogger,
  ) {}

  private generateCode() {
    const year = new Date().getFullYear();
    return `EWS-WD-${year}-${Math.floor(100000 + Math.random() * 900000)}`;
  }

  async create(userId: string, dto: CreateWithdrawalDto) {
    if (dto.amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}`);
    }

    // Locks the amount out of available balance immediately —
    // prevents the same funds being withdrawn twice.
    await this.wallet.lockForWithdrawal(userId, dto.amount);

    const request = await this.prisma.withdrawalRequest.create({
      data: {
        withdrawalCode: this.generateCode(),
        userId,
        amount: dto.amount,
        mode: dto.mode,
        upiId: dto.mode === 'UPI' ? dto.upiId : undefined,
        bankName: dto.mode === 'BANK' ? dto.bankName : undefined,
        accountNumberEnc: dto.mode === 'BANK' && dto.accountNumber ? this.encryption.encrypt(dto.accountNumber) : undefined,
        ifsc: dto.mode === 'BANK' ? dto.ifsc : undefined,
        remarks: dto.remarks,
        status: WithdrawalStatus.PENDING,
      },
    });

    await this.notifications.send({
      userId,
      category: 'WITHDRAW_UPDATES',
      title: 'Withdrawal Requested',
      body: `Your withdrawal request of ₹${dto.amount} has been received.`,
    });

    return request;
  }

  async findMine(userId: string) {
    return this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findAllAdmin(status?: WithdrawalStatus) {
    return this.prisma.withdrawalRequest.findMany({
      where: status ? { status } : {},
      include: { user: { select: { id: true, fullName: true, mobile: true, role: true } } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  /**
   * Admin manually approves/rejects/completes — no automated payout job.
   * Notification is sent after every single status transition (Prompt 8).
   */
  async process(id: string, dto: ProcessWithdrawalDto, adminId: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Withdrawal request not found');

    const data: any = { status: dto.status, processedById: adminId };

    if (dto.status === 'REJECTED') {
      if (!dto.rejectionReason) throw new BadRequestException('Rejection reason is mandatory');
      data.rejectionReason = dto.rejectionReason;
      data.processedAt = new Date();
      await this.wallet.refundWithdrawal(request.userId, Number(request.amount));
    }

    if (dto.status === 'APPROVED') {
      data.processedAt = new Date();
    }

    if (dto.status === 'COMPLETED') {
      if (!dto.utrReference) throw new BadRequestException('UTR/reference number is required to mark as completed');
      data.utrReference = dto.utrReference;
      data.completedAt = new Date();
    }

    const updated = await this.prisma.withdrawalRequest.update({ where: { id }, data });

    await this.actionLogger.log(adminId, 'withdrawals', `status_${dto.status.toLowerCase()}`, id, {
      oldStatus: request.status,
    }, { newStatus: dto.status });

    const messages: Record<string, string> = {
      APPROVED: `Your withdrawal of ₹${request.amount} has been approved and is being processed.`,
      REJECTED: `Your withdrawal request of ₹${request.amount} was rejected. Reason: ${dto.rejectionReason}. Amount refunded to wallet.`,
      COMPLETED: `₹${request.amount} has been credited to your account. Ref: ${dto.utrReference}`,
    };

    await this.notifications.send({
      userId: request.userId,
      category: 'WITHDRAW_UPDATES',
      title: `Withdrawal ${dto.status}`,
      body: messages[dto.status],
    });

    return updated;
  }
}
