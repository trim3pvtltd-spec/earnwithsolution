import { IsString, IsOptional, IsNumber, IsIn, Min, ValidateIf } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber() @Min(500, { message: 'Minimum withdrawal amount is ₹500' })
  amount: number;

  @IsIn(['UPI', 'BANK'])
  mode: 'UPI' | 'BANK';

  @ValidateIf((o) => o.mode === 'UPI')
  @IsString()
  upiId?: string;

  @ValidateIf((o) => o.mode === 'BANK')
  @IsString()
  bankName?: string;

  @ValidateIf((o) => o.mode === 'BANK')
  @IsString()
  accountNumber?: string;

  @ValidateIf((o) => o.mode === 'BANK')
  @IsString()
  ifsc?: string;

  @IsOptional() @IsString()
  remarks?: string;
}

export class ProcessWithdrawalDto {
  @IsIn(['APPROVED', 'REJECTED', 'COMPLETED'])
  status: 'APPROVED' | 'REJECTED' | 'COMPLETED';

  @IsOptional() @IsString()
  rejectionReason?: string;

  @IsOptional() @IsString()
  utrReference?: string;
}
