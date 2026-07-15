import { Global, Module } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { SecurityLogService } from './security-log.service';
import { FraudDetectionService } from './fraud-detection.service';

@Global()
@Module({
  providers: [EncryptionService, SecurityLogService, FraudDetectionService],
  exports: [EncryptionService, SecurityLogService, FraudDetectionService],
})
export class SecurityModule {}
