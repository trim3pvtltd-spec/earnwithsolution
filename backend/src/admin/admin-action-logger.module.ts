import { Global, Module } from '@nestjs/common';
import { AdminActionLogger } from './admin-action-logger.service';

@Global()
@Module({
  providers: [AdminActionLogger],
  exports: [AdminActionLogger],
})
export class AdminActionLoggerModule {}
