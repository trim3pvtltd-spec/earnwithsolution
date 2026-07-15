import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogType } from '@prisma/client';

interface LogInput {
  userId?: string;
  logType: LogType;
  action: string;
  ipAddress?: string;
  deviceInfo?: Record<string, any>;
  gpsLat?: number;
  gpsLng?: number;
  metadata?: Record<string, any>;
}

/**
 * Append-only logging for Activity / Admin / Audit trails.
 * These records are never updated or deleted (compliance requirement
 * for a fintech platform) — only ever inserted.
 */
@Injectable()
export class SecurityLogService {
  constructor(private prisma: PrismaService) {}

  async log(input: LogInput) {
    return this.prisma.securityLog.create({
      data: {
        userId: input.userId,
        logType: input.logType,
        action: input.action,
        ipAddress: input.ipAddress,
        deviceInfo: input.deviceInfo as any,
        gpsLat: input.gpsLat,
        gpsLng: input.gpsLng,
        metadata: input.metadata as any,
      },
    });
  }

  logActivity(userId: string, action: string, extra?: Partial<LogInput>) {
    return this.log({ userId, logType: LogType.ACTIVITY, action, ...extra });
  }

  logAdmin(adminId: string, action: string, extra?: Partial<LogInput>) {
    return this.log({ userId: adminId, logType: LogType.ADMIN, action, ...extra });
  }

  logAudit(action: string, extra?: Partial<LogInput>) {
    return this.log({ logType: LogType.AUDIT, action, ...extra });
  }
}
