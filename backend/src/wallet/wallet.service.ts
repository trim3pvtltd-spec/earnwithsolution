import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletTxnStatus, WalletTxnType } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private prisma: PrismaService) {}

  private generateTxnCode() {
    return `EWS-TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  async getMyWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) {
      wallet = await this.prisma.wallet.create({ data: { userId } });
    }
    return wallet;
  }

  async getTransactions(userId: string, filters: { type?: WalletTxnType; status?: WalletTxnStatus }) {
    const wallet = await this.getMyWallet(userId);
    return this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id, ...filters },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Called ONLY as a direct result of an explicit admin action
   * (Lead status -> Approved, with confirmation). Never runs as a
   * background/automatic job — satisfies "everything manual, no
   * automatic payout" requirement while still being efficient.
   */
  async creditForApprovedLead(userId: string, amount: number, leadId: string, productId: string) {
    const wallet = await this.getMyWallet(userId);

    const txn = await this.prisma.walletTransaction.create({
      data: {
        txnCode: this.generateTxnCode(),
        walletId: wallet.id,
        type: WalletTxnType.CREDIT,
        productId,
        leadId,
        amount,
        status: WalletTxnStatus.APPROVED,
        description: 'Commission credited for approved lead',
      },
    });

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: amount },
        lifetimeEarnings: { increment: amount },
        approvedEarnings: { increment: amount },
      },
    });

    return txn;
  }

  async recordRejection(userId: string, amount: number, leadId: string, reason: string) {
    const wallet = await this.getMyWallet(userId);
    const txn = await this.prisma.walletTransaction.create({
      data: {
        txnCode: this.generateTxnCode(),
        walletId: wallet.id,
        type: WalletTxnType.CREDIT,
        leadId,
        amount,
        status: WalletTxnStatus.REJECTED,
        rejectionReason: reason,
        description: 'Lead rejected — no commission',
      },
    });
    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { rejectedEarnings: { increment: amount } },
    });
    return txn;
  }

  /** Admin manual wallet adjustment — always logged (see AdminActionLogger at call site). */
  async manualAdjustment(userId: string, amount: number, type: 'CREDIT' | 'DEBIT', reason: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getMyWallet(userId);
    if (type === 'DEBIT' && Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance for this adjustment');
    }

    const txn = await this.prisma.walletTransaction.create({
      data: {
        txnCode: this.generateTxnCode(),
        walletId: wallet.id,
        type: type === 'CREDIT' ? WalletTxnType.BONUS : WalletTxnType.DEBIT,
        amount,
        status: WalletTxnStatus.PROCESSED,
        description: `Manual adjustment by admin: ${reason}`,
      },
    });

    await this.prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: type === 'CREDIT' ? { increment: amount } : { decrement: amount },
        bonusTotal: type === 'CREDIT' ? { increment: amount } : undefined,
      },
    });

    return txn;
  }

  /** Lock funds when a withdrawal request is raised (prevents double-withdrawal). */
  async lockForWithdrawal(userId: string, amount: number) {
    const wallet = await this.getMyWallet(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }
    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { decrement: amount } },
    });
  }

  /** Refund if a withdrawal is later rejected. */
  async refundWithdrawal(userId: string, amount: number) {
    const wallet = await this.getMyWallet(userId);
    return this.prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: amount } },
    });
  }
}
