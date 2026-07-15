import { IsString, IsOptional, IsBoolean, IsIn, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsIn(['en', 'hi', 'hinglish']) language?: string;
  @IsOptional() @IsBoolean() darkMode?: boolean;
  @IsOptional() @IsBoolean() biometricEnabled?: boolean;
}

export class SubmitKycDto {
  @IsString() @Length(12, 12) aadhaarNumber: string;
  @IsString() @Length(10, 10) panNumber: string;
  @IsString() photoUrl: string;
  @IsString() addressProofUrl: string;
}

export class UpdateBankDetailsDto {
  @IsString() bankAccountNumber: string;
  @IsString() bankIfsc: string;
  @IsString() bankName: string;
  @IsOptional() @IsString() upiId?: string;
}
