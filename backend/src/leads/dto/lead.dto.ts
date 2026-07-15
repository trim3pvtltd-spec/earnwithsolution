import { IsString, IsOptional, IsEmail, IsBoolean, IsNumber, Length, Equals } from 'class-validator';

export class CreateLeadDto {
  @IsString() customerName: string;
  @IsString() @Length(10, 10) mobile: string;
  @IsOptional() @IsString() @Length(10, 10) altMobile?: string;
  @IsOptional() @IsEmail() email?: string;

  @IsString() state: string;
  @IsString() district: string;
  @IsString() city: string;
  @IsString() @Length(6, 6) pincode: string;

  @IsString() occupation: string;
  @IsString() monthlyIncome: string;

  @IsString() productId: string;

  @IsOptional() @IsNumber() gpsLat?: number;
  @IsOptional() @IsNumber() gpsLng?: number;

  @IsOptional() deviceInfo?: Record<string, any>;

  // Consent is mandatory — cannot submit the lead form without it.
  @Equals(true, { message: 'Customer consent is required before submitting the lead' })
  consentGiven: boolean;
}

export class UpdateLeadStatusDto {
  @IsString() status: 'PENDING' | 'IN_PROCESS' | 'APPROVED' | 'REJECTED' | 'DUPLICATE';
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() duplicateOfLeadId?: string;
  // Explicit confirmation step for wallet credit on Approved (manual, not silent)
  @IsOptional() @IsBoolean() confirmWalletCredit?: boolean;
}
