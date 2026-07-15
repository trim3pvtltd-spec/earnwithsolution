import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BcApplicationsService } from './bc-applications.service';
import { ApplyBcDto, UpdateBcStatusDto } from './dto/bc.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BcStatus, UserRole } from '@prisma/client';

@Controller({ path: 'bc-applications', version: '1' })
export class BcApplicationsController {
  constructor(private bcService: BcApplicationsService) {}

  @Roles(UserRole.FOS, UserRole.SHOPKEEPER)
  @Post()
  apply(@CurrentUser() user: any, @Body() dto: ApplyBcDto) {
    return this.bcService.apply(user.id, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: any) {
    return this.bcService.findMine(user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAllAdmin(@Query('status') status?: BcStatus) {
    return this.bcService.findAllAdmin(status);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBcStatusDto, @CurrentUser() admin: any) {
    return this.bcService.updateStatus(id, dto, admin.id);
  }
}
