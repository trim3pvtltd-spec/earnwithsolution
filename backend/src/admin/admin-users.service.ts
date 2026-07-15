import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminActionLogger } from './admin-action-logger.service';
import { UserRole, UserStatus, KycStatus } from '@prisma/client';

@Injectable()
export class AdminUsersService {
  constructor(
    private prisma: PrismaService,
    private actionLogger: AdminActionLogger,
  ) {}

  findAll(filters: { role?: UserRole; status?: UserStatus; search?: string }) {
    return this.prisma.user.findMany({
      where: {
        role: filters.role,
        status: filters.status,
        OR: filters.search
          ? [
              { fullName: { contains: filters.search, mode: 'insensitive' } },
              { mobile: { contains: filters.search } },
            ]
          : undefined,
      },
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { wallet: true, devices: true, teamMembers: true },
    });
    if (!user) throw new NotFoundException('User not found');
    const { aadhaarNumberEnc, panNumberEnc, bankAccountNumberEnc, ...safe } = user;
    return safe;
  }

  async setStatus(id: string, status: UserStatus, adminId: string) {
    const user = await this.prisma.user.update({ where: { id }, data: { status } });
    await this.actionLogger.log(adminId, 'users', `status_${status.toLowerCase()}`, id);
    return user;
  }

  async verifyKyc(id: string, decision: 'VERIFIED' | 'REJECTED', adminId: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        kycStatus: decision as KycStatus,
        status: decision === 'VERIFIED' ? UserStatus.ACTIVE : UserStatus.PENDING_KYC,
      },
    });
    await this.actionLogger.log(adminId, 'users', `kyc_${decision.toLowerCase()}`, id);
    return user;
  }

  /** Promote a Customer to FOS/Shopkeeper — the verified onboarding path discussed earlier. */
  async promoteRole(id: string, role: UserRole, adminId: string) {
    const user = await this.prisma.user.update({ where: { id }, data: { role } });
    await this.actionLogger.log(adminId, 'users', 'role_promoted', id, null, { role });
    return user;
  }
}
