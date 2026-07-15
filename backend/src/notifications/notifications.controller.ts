import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { BroadcastNotificationDto, UpdateNotificationPreferenceDto } from './dto/notification.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { NotificationCategory, UserRole } from '@prisma/client';

@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get('me')
  getMine(@CurrentUser() user: any) {
    return this.notificationsService.getMyNotifications(user.id);
  }

  @Patch('me/preferences/:category')
  updatePreference(
    @CurrentUser() user: any,
    @Param('category') category: NotificationCategory,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.notificationsService.updatePreference(user.id, category, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('broadcast')
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.broadcast(dto);
  }
}
