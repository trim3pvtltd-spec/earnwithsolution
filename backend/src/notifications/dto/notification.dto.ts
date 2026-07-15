import { IsString, IsEnum, IsArray, IsOptional } from 'class-validator';
import { NotificationCategory, NotificationChannel } from '@prisma/client';

export class BroadcastNotificationDto {
  @IsEnum(NotificationCategory) category: NotificationCategory;
  @IsString() title: string;
  @IsString() body: string;
  @IsArray() channels: NotificationChannel[];
  @IsOptional() @IsString() targetRole?: string;
  @IsOptional() @IsString() targetState?: string;
}

export class UpdateNotificationPreferenceDto {
  @IsOptional() pushEnabled?: boolean;
  @IsOptional() smsEnabled?: boolean;
  @IsOptional() whatsappEnabled?: boolean;
  @IsOptional() emailEnabled?: boolean;
}
