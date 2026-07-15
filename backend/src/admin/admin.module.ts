import { Module } from '@nestjs/common';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminContentController } from './admin-content.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminUsersService } from './admin-users.service';
import { AdminContentService } from './admin-content.service';
import { AdminSettingsService } from './admin-settings.service';

@Module({
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminContentController,
    AdminSettingsController,
  ],
  providers: [
    AdminDashboardService,
    AdminReportsService,
    AdminUsersService,
    AdminContentService,
    AdminSettingsService,
  ],
})
export class AdminModule {}
