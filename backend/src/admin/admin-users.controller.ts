import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, UserStatus } from '@prisma/client';

@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller({ path: 'admin/users', version: '1' })
export class AdminUsersController {
  constructor(private adminUsersService: AdminUsersService) {}

  @Get()
  findAll(@Query('role') role?: UserRole, @Query('status') status?: UserStatus, @Query('search') search?: string) {
    return this.adminUsersService.findAll({ role, status, search });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adminUsersService.findOne(id);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body('status') status: UserStatus, @CurrentUser() admin: any) {
    return this.adminUsersService.setStatus(id, status, admin.id);
  }

  @Patch(':id/kyc')
  verifyKyc(@Param('id') id: string, @Body('decision') decision: 'VERIFIED' | 'REJECTED', @CurrentUser() admin: any) {
    return this.adminUsersService.verifyKyc(id, decision, admin.id);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Patch(':id/role')
  promoteRole(@Param('id') id: string, @Body('role') role: UserRole, @CurrentUser() admin: any) {
    return this.adminUsersService.promoteRole(id, role, admin.id);
  }
}
