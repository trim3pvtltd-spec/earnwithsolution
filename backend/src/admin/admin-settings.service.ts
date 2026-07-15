import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.appSettings.findFirst();
    if (!settings) {
      settings = await this.prisma.appSettings.create({ data: {} });
    }
    return settings;
  }

  async updateSettings(data: Partial<{
    minWithdrawalAmount: number;
    referralBonusPercent: number;
    maintenanceMode: boolean;
    minAppVersionAndroid: string;
    minAppVersionIos: string;
  }>) {
    const settings = await this.getSettings();
    return this.prisma.appSettings.update({ where: { id: settings.id }, data });
  }

  // --- Role Management (custom admin roles with granular permissions) ---
  getRoles() {
    return this.prisma.adminRole.findMany();
  }
  createRole(name: string, permissions: Record<string, string[]>) {
    return this.prisma.adminRole.create({ data: { name, permissions } });
  }
  updateRole(id: string, permissions: Record<string, string[]>) {
    return this.prisma.adminRole.update({ where: { id }, data: { permissions } });
  }
  deleteRole(id: string) {
    return this.prisma.adminRole.delete({ where: { id } });
  }

  // --- Logs (Activity / Admin / Audit) ---
  getSecurityLogs(filters: { logType?: string; userId?: string; from?: Date; to?: Date }) {
    return this.prisma.securityLog.findMany({
      where: {
        logType: filters.logType as any,
        userId: filters.userId,
        createdAt: filters.from || filters.to ? { gte: filters.from, lte: filters.to } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  getAdminActionLogs(filters: { module?: string; actorId?: string }) {
    return this.prisma.adminActionLog.findMany({
      where: { module: filters.module, actorId: filters.actorId },
      include: { actor: { select: { fullName: true, mobile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  getFraudFlags(status?: string) {
    return this.prisma.fraudFlag.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  reviewFraudFlag(id: string, status: 'REVIEWED_SAFE' | 'CONFIRMED_FRAUD', reviewedById: string) {
    return this.prisma.fraudFlag.update({ where: { id }, data: { status, reviewedById } });
  }
}
