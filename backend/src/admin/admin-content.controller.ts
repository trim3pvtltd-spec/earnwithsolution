import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AdminContentService } from './admin-content.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Controller({ path: 'admin/content', version: '1' })
export class AdminContentController {
  constructor(private contentService: AdminContentService) {}

  // Banners
  @Get('banners')
  getBanners() {
    return this.contentService.getBanners();
  }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('banners')
  createBanner(@Body() data: any) {
    return this.contentService.createBanner(data);
  }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('banners/:id')
  updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.contentService.updateBanner(id, data);
  }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.contentService.deleteBanner(id);
  }

  // Announcements
  @Get('announcements')
  getAnnouncements() {
    return this.contentService.getAnnouncements();
  }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('announcements')
  createAnnouncement(@Body('title') title: string, @Body('body') body: string) {
    return this.contentService.createAnnouncement(title, body);
  }

  // Training videos
  @Get('training-videos')
  getTrainingVideos() {
    return this.contentService.getTrainingVideos();
  }
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post('training-videos')
  createTrainingVideo(@Body() data: any) {
    return this.contentService.createTrainingVideo(data);
  }
  @Post('training-videos/:id/progress')
  trackProgress(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('watchedSeconds') watchedSeconds: number,
    @Body('completed') completed: boolean,
  ) {
    return this.contentService.trackProgress(user.id, id, watchedSeconds, completed);
  }

  // Support tickets
  @Get('support-tickets')
  getTickets(@Query('status') status?: string) {
    return this.contentService.getTickets(status);
  }
  @Post('support-tickets')
  createTicket(@CurrentUser() user: any, @Body('subject') subject: string, @Body('message') message: string) {
    return this.contentService.createTicket(user.id, subject, message);
  }
  @Post('support-tickets/:id/reply')
  replyTicket(@Param('id') id: string, @CurrentUser() user: any, @Body('message') message: string) {
    return this.contentService.replyTicket(id, user.id, user.role !== 'CUSTOMER', message);
  }
}
