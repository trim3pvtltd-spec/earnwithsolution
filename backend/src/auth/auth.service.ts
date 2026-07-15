import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuid } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from './firebase.service';
import { SecurityLogService } from '../common/security/security-log.service';
import { VerifyOtpDto, RefreshTokenDto } from './dto/auth.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private firebase: FirebaseService,
    private securityLog: SecurityLogService,
  ) {}

  private generateReferralCode(name: string) {
    const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase() || 'EWS';
    return `${prefix}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private async issueTokenPair(userId: string, role: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, role },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: process.env.JWT_ACCESS_EXPIRY || '20m' },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, role, type: 'refresh', jti: uuid() },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: process.env.JWT_REFRESH_EXPIRY || '30d' },
    );
    return { accessToken, refreshToken };
  }

  /**
   * Single entry point for both login and signup — Firebase already
   * confirmed the OTP client-side; we just verify the token server-side,
   * then find-or-create the user.
   */
  async verifyOtpAndLogin(dto: VerifyOtpDto, ip: string) {
    const decoded = await this.firebase.verifyIdToken(dto.idToken);
    const mobile = decoded.phone_number as string;

    let user = await this.prisma.user.findUnique({ where: { mobile } });
    let isNewUser = false;

    if (!user) {
      if (!dto.fullName) {
        throw new BadRequestException('fullName is required for first-time signup');
      }

      // Only Customer can self-signup with a role; FOS/Shopkeeper always
      // start as Customer and get promoted after Admin verification —
      // this matches fintech onboarding best practice.
      const role = UserRole.CUSTOMER;

      let referredById: string | undefined;
      if (dto.referralCode) {
        const referrer = await this.prisma.user.findUnique({
          where: { referralCode: dto.referralCode },
        });
        if (!referrer) throw new BadRequestException('Invalid referral code');
        referredById = referrer.id;
      }

      user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          mobile,
          role,
          status: 'PENDING_KYC',
          referralCode: this.generateReferralCode(dto.fullName),
          referredByCode: dto.referralCode,
          referredById,
          wallet: { create: {} },
        },
      });
      isNewUser = true;
    }

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('Your account has been blocked. Contact support.');
    }

    // Device tracking
    const existingDevice = dto.deviceId
      ? await this.prisma.userDevice.findFirst({ where: { userId: user.id, deviceId: dto.deviceId } })
      : null;

    if (dto.deviceId && !existingDevice) {
      await this.prisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: dto.deviceId,
          deviceModel: dto.deviceModel,
          os: dto.os,
          appVersion: dto.appVersion,
          fcmToken: dto.fcmToken,
          lastIp: ip,
        },
      });
      // New-device alert (skip on very first login/signup)
      if (!isNewUser) {
        await this.securityLog.logActivity(user.id, 'NEW_DEVICE_LOGIN', {
          ipAddress: ip,
          deviceInfo: { deviceId: dto.deviceId, deviceModel: dto.deviceModel },
        });
      }
    } else if (dto.deviceId && existingDevice) {
      await this.prisma.userDevice.update({
        where: { id: existingDevice.id },
        data: { lastIp: ip, lastLoginAt: new Date(), fcmToken: dto.fcmToken || existingDevice.fcmToken },
      });
    }

    await this.securityLog.logActivity(user.id, isNewUser ? 'SIGNUP' : 'LOGIN', { ipAddress: ip });

    const tokens = await this.issueTokenPair(user.id, user.role);
    return { ...tokens, isNewUser, user: this.sanitizeUser(user) };
  }

  async refresh(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwt.verifyAsync(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.status === 'BLOCKED') throw new UnauthorizedException();

      // Rotation: issue a brand new pair every time a refresh token is used
      return this.issueTokenPair(user.id, user.role);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, deviceId?: string) {
    if (deviceId) {
      await this.prisma.userDevice.updateMany({
        where: { userId, deviceId },
        data: { isActive: false, fcmToken: null },
      });
    }
    await this.securityLog.logActivity(userId, 'LOGOUT');
    return { success: true };
  }

  private sanitizeUser(user: any) {
    const { aadhaarNumberEnc, panNumberEnc, bankAccountNumberEnc, ...safe } = user;
    return safe;
  }
}
