import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/security/encryption.service';
import { FraudDetectionService } from '../common/security/fraud-detection.service';
import { UpdateProfileDto, SubmitKycDto, UpdateBankDetailsDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private fraud: FraudDetectionService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.sanitize(user);
  }

  async submitKyc(userId: string, dto: SubmitKycDto) {
    const panHash = this.encryption.hashForLookup(dto.panNumber);
    const aadhaarHash = this.encryption.hashForLookup(dto.aadhaarNumber);

    // Fraud check: same PAN/Aadhaar already registered against another account
    const existingPan = await this.fraud.checkDuplicatePan(dto.panNumber);
    if (existingPan && existingPan.id !== userId) {
      await this.fraud.raiseFlag({ userId, flagType: 'DUPLICATE_PAN', riskScore: 80 });
      throw new ConflictException('This PAN is already registered with another account');
    }

    const existingAadhaar = await this.fraud.checkDuplicateAadhaar(dto.aadhaarNumber);
    if (existingAadhaar && existingAadhaar.id !== userId) {
      await this.fraud.raiseFlag({ userId, flagType: 'DUPLICATE_AADHAAR', riskScore: 80 });
      throw new ConflictException('This Aadhaar is already registered with another account');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        aadhaarNumberHash: aadhaarHash,
        aadhaarNumberEnc: this.encryption.encrypt(dto.aadhaarNumber),
        panNumberHash: panHash,
        panNumberEnc: this.encryption.encrypt(dto.panNumber),
        photoUrl: dto.photoUrl,
        addressProofUrl: dto.addressProofUrl,
        kycStatus: 'PENDING',
      },
    });
    return this.sanitize(user);
  }

  async updateBankDetails(userId: string, dto: UpdateBankDetailsDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        bankAccountNumberEnc: this.encryption.encrypt(dto.bankAccountNumber),
        bankIfsc: dto.bankIfsc,
        bankName: dto.bankName,
        upiId: dto.upiId,
      },
    });
    return this.sanitize(user);
  }

  /** Shopkeeper's team of FOS members with their performance summary */
  async getTeam(shopkeeperId: string) {
    return this.prisma.user.findMany({
      where: { parentShopkeeperId: shopkeeperId },
      include: { wallet: true },
    });
  }

  async addToTeam(shopkeeperId: string, fosUserId: string) {
    const fos = await this.prisma.user.findUnique({ where: { id: fosUserId } });
    if (!fos || fos.role !== 'FOS') throw new BadRequestException('User is not an FOS');
    return this.prisma.user.update({
      where: { id: fosUserId },
      data: { parentShopkeeperId: shopkeeperId },
    });
  }

  private sanitize(user: any) {
    const { aadhaarNumberEnc, panNumberEnc, bankAccountNumberEnc, ...safe } = user;
    return safe;
  }
}
