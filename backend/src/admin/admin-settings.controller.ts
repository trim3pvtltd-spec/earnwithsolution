import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminSettingsService } from './admin-settings.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin/settings', version: '1' })
export class AdminSettingsController {
  constructor(private settingsService: AdminSettingsService) {}

  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch()
  updateSettings(@Body() data: any) {
    return this.settingsService.updateSettings(data);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Get('roles')
  getRoles() {
    return this.settingsService.getRoles();
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Post('roles')
  createRole(@Body('name') name: string, @Body('permissions') permissions: any) {
    return this.settingsService.createRole(name, permissions);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch('roles/:id')
  updateRole(@Param('id') id: string, @Body('permissions') permissions: any) {
    return this.settingsService.updateRole(id, permissions);
  }

  @Get('logs/security')
  getSecurityLogs(@Query('logType') logType?: string, @Query('userId') userId?: string) {
    return this.settingsService.getSecurityLogs({ logType, userId });
  }

  @Get('logs/admin-actions')
  getAdminActionLogs(@Query('module') module?: string, @Query('actorId') actorId?: string) {
    return this.settingsService.getAdminActionLogs({ module, actorId });
  }

  @Get('fraud-flags')
  getFraudFlags(@Query('status') status?: string) {
    return this.settingsService.getFraudFlags(status);
  }

  @Patch('fraud-flags/:id/review')
  reviewFraudFlag(
    @Param('id') id: string,
    @Body('status') status: 'REVIEWED_SAFE' | 'CONFIRMED_FRAUD',
    @CurrentUser() admin: any,
  ) {
    return this.settingsService.reviewFraudFlag(id, status, admin.id);
  }
}
