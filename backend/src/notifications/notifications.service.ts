import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../auth/firebase.service';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';
import { NotificationCategory, NotificationChannel, NotificationDeliveryStatus } from '@prisma/client';

interface SendParams {
  userId: string;
  category: NotificationCategory;
  title: string;
  body: string;
  channels?: NotificationChannel[]; // override default mapping if provided
  whatsappTemplate?: string;
  deepLink?: string;
}

// Default channel mapping per category (mirrors Prompt 12 spec) —
// admin panel can override this per-send, but this is the sensible default.
const DEFAULT_CHANNELS: Record<NotificationCategory, NotificationChannel[]> = {
  NEW_OFFERS: ['PUSH', 'WHATSAPP'],
  PAYOUT_UPDATES: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL'],
  WITHDRAW_UPDATES: ['PUSH', 'SMS', 'WHATSAPP', 'EMAIL'],
  TRAINING: ['PUSH'],
  ANNOUNCEMENTS: ['PUSH', 'WHATSAPP'],
  FESTIVAL_OFFERS: ['PUSH', 'WHATSAPP'],
  BANK_OFFERS: ['PUSH', 'WHATSAPP'],
  SECURITY_ALERT: ['PUSH', 'SMS'],
  GENERAL: ['PUSH'],
};

// Categories a user is NOT allowed to opt out of — critical financial alerts.
const NON_OPTIONAL: NotificationCategory[] = ['PAYOUT_UPDATES', 'WITHDRAW_UPDATES', 'SECURITY_ALERT'];

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private firebase: FirebaseService,
    private sms: SmsProvider,
    private whatsapp: WhatsappProvider,
    private email: EmailProvider,
  ) {}

  async send(params: SendParams) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      include: { devices: true },
    });
    if (!user) return;

    const channels = params.channels || DEFAULT_CHANNELS[params.category] || ['PUSH'];
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId_category: { userId: params.userId, category: params.category } },
    });

    const isOptional = !NON_OPTIONAL.includes(params.category);

    for (const channel of channels) {
      if (isOptional && prefs) {
        if (channel === 'PUSH' && !prefs.pushEnabled) continue;
        if (channel === 'SMS' && !prefs.smsEnabled) continue;
        if (channel === 'WHATSAPP' && !prefs.whatsappEnabled) continue;
        if (channel === 'EMAIL' && !prefs.emailEnabled) continue;
      }

      let deliveryStatus: NotificationDeliveryStatus = NotificationDeliveryStatus.SENT;

      if (channel === 'PUSH') {
        const activeDevice = user.devices.find((d) => d.isActive && d.fcmToken);
        if (activeDevice?.fcmToken) {
          await this.firebase.sendPush(activeDevice.fcmToken, params.title, params.body, {
            deepLink: params.deepLink || '',
          });
        } else {
          deliveryStatus = NotificationDeliveryStatus.FAILED;
        }
      } else if (channel === 'SMS') {
        const result = await this.sms.send(user.mobile, `${params.title}: ${params.body}`);
        if (!result.success) deliveryStatus = NotificationDeliveryStatus.FAILED;
      } else if (channel === 'WHATSAPP') {
        const result = await this.whatsapp.send(
          user.mobile,
          params.whatsappTemplate || 'general_update',
          [params.title, params.body],
        );
        if (!result.success) deliveryStatus = NotificationDeliveryStatus.FAILED;
      } else if (channel === 'EMAIL') {
        if (!user.email) continue;
        const result = await this.email.send(user.email, params.title, `<p>${params.body}</p>`);
        if (!result.success) deliveryStatus = NotificationDeliveryStatus.FAILED;
      }

      await this.prisma.notificationLog.create({
        data: {
          userId: params.userId,
          channel,
          title: params.title,
          content: params.body,
          status: deliveryStatus,
          triggeredBy: 'system',
        },
      });
    }
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });
  }

  async updatePreference(
    userId: string,
    category: NotificationCategory,
    prefs: Partial<{ pushEnabled: boolean; smsEnabled: boolean; whatsappEnabled: boolean; emailEnabled: boolean }>,
  ) {
    if (NON_OPTIONAL.includes(category)) {
      // Critical categories cannot be disabled — silently ignore attempts.
      return this.prisma.notificationPreference.upsert({
        where: { userId_category: { userId, category } },
        update: {},
        create: { userId, category },
      });
    }
    return this.prisma.notificationPreference.upsert({
      where: { userId_category: { userId, category } },
      update: prefs,
      create: { userId, category, ...prefs },
    });
  }

  /** Admin campaign broadcast — targeted by role/region/individual. */
  async broadcast(params: {
    category: NotificationCategory;
    title: string;
    body: string;
    channels: NotificationChannel[];
    targetRole?: string;
    targetState?: string;
  }) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(params.targetRole ? { role: params.targetRole as any } : {}),
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    for (const u of users) {
      await this.send({
        userId: u.id,
        category: params.category,
        title: params.title,
        body: params.body,
        channels: params.channels,
      });
    }
    return { sentToCount: users.length };
  }
}
