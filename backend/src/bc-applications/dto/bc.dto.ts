import { IsString, IsOptional, IsIn } from 'class-validator';

export class ApplyBcDto {
  @IsString() bankId: string;
  @IsString() aadhaarDocUrl: string;
  @IsString() panDocUrl: string;
  @IsString() photoUrl: string;
  @IsString() cancelledChequeUrl: string;
  @IsString() addressProofUrl: string;
}

export class UpdateBcStatusDto {
  @IsIn(['VERIFIED', 'APPROVED', 'REJECTED'])
  status: 'VERIFIED' | 'APPROVED' | 'REJECTED';

  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() bcIdNumber?: string; // required when marking APPROVED
}
