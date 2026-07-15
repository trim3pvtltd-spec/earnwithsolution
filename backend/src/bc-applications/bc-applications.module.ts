import { Module } from '@nestjs/common';
import { BcApplicationsController } from './bc-applications.controller';
import { BcApplicationsService } from './bc-applications.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [BcApplicationsController],
  providers: [BcApplicationsService],
})
export class BcApplicationsModule {}
