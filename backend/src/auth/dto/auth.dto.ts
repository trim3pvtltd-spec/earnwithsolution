import { IsString, IsOptional, IsEnum, MinLength, IsNotEmpty } from 'class-validator';
import { UserRole } from '@prisma/client';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  idToken: string; // Firebase ID token obtained after client-side OTP verification

  @IsOptional()
  @IsString()
  fullName?: string; // required only on first-time signup

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsEnum(UserRole)
  requestedRole?: UserRole; // Customer self-signup only; FOS/Shopkeeper need admin approval

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  deviceModel?: string;

  @IsOptional()
  @IsString()
  os?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}

export class RefreshTokenDto {
  @IsString()
  @MinLength(10)
  refreshToken: string;
}
