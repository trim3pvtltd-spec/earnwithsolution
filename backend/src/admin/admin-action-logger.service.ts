import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Records every admin edit/approval action across all modules
 * (Products, Leads, Withdrawals, Users, Settings, etc.)
 * Powers the "Logs" module in the Admin Panel — nothing an admin
 * does is silent or unrecorded.
 */
@Injectable()
export class AdminActionLogger {
  constructor(private prisma: PrismaService) {}

  async log(
    actorId: string,
    module: string,
    action: string,
    targetId?: string,
    before?: any,
    after?: any,
  ) {
    return this.prisma.adminActionLog.create({
      data: { actorId, module, action, targetId, before, after },
    });
  }
}
