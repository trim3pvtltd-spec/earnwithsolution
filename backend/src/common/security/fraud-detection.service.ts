import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FraudFlagType } from '@prisma/client';
import { EncryptionService } from './encryption.service';

@Injectable()
export class FraudDetectionService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /** Check if a mobile number already has a lead for the same product within `days`. */
  async checkDuplicateMobile(mobile: string, productId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const existing = await this.prisma.lead.findFirst({
      where: { mobile, productId, submittedAt: { gte: since } },
      orderBy: { submittedAt: 'desc' },
    });
    return existing;
  }

  async checkDuplicatePan(panNumber: string) {
    const hash = this.encryption.hashForLookup(panNumber);
    return this.prisma.user.findFirst({ where: { panNumberHash: hash } });
  }

  async checkDuplicateAadhaar(aadhaarNumber: string) {
    const hash = this.encryption.hashForLookup(aadhaarNumber);
    return this.prisma.user.findFirst({ where: { aadhaarNumberHash: hash } });
  }

  async raiseFlag(params: {
    userId?: string;
    leadId?: string;
    flagType: FraudFlagType;
    riskScore: number;
  }) {
    return this.prisma.fraudFlag.create({
      data: {
        userId: params.userId,
        leadId: params.leadId,
        flagType: params.flagType,
        riskScore: params.riskScore,
      },
    });
  }

  /**
   * Basic pattern anomaly check: same GPS point used for many distinct
   * leads in a short window suggests fabricated field visits.
   */
  async checkGpsAnomaly(gpsLat: number, gpsLng: number, executiveId: string, windowHours = 24) {
    const since = new Date();
    since.setHours(since.getHours() - windowHours);

    const nearbyCount = await this.prisma.lead.count({
      where: {
        executiveId,
        submittedAt: { gte: since },
        gpsLat: { gte: gpsLat - 0.0005, lte: gpsLat + 0.0005 },
        gpsLng: { gte: gpsLng - 0.0005, lte: gpsLng + 0.0005 },
      },
    });

    return nearbyCount >= 10; // threshold — tune based on real usage patterns
  }
}
