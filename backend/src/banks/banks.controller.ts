import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BanksService } from './banks.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller({ path: 'banks', version: '1' })
export class BanksController {
  constructor(private banksService: BanksService) {}

  @Get()
  findAll() {
    return this.banksService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('admin/all')
  findAllAdmin() {
    return this.banksService.findAllAdmin();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Post()
  create(@Body('name') name: string, @Body('logoUrl') logoUrl?: string) {
    return this.banksService.create(name, logoUrl);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.banksService.update(id, data);
  }

  @Roles(UserRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.banksService.remove(id);
  }
}
