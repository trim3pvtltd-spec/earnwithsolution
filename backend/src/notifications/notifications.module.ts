import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SmsProvider } from './providers/sms.provider';
import { WhatsappProvider } from './providers/whatsapp.provider';
import { EmailProvider } from './providers/email.provider';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsProvider, WhatsappProvider, EmailProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
