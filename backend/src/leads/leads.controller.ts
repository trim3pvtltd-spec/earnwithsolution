import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadStatusDto } from './dto/lead.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { LeadStatus, UserRole } from '@prisma/client';

@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  // Submitted right before the affiliate link opens (Prompt 6 flow).
  @Post()
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: any, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip;
    const isExecutive = user.role === 'FOS' || user.role === 'SHOPKEEPER';
    return this.leadsService.createLead(dto, {
      executiveId: isExecutive ? user.id : undefined,
      executiveName: isExecutive ? user.fullName : undefined,
      customerId: user.role === 'CUSTOMER' ? user.id : undefined,
      ip,
    });
  }

  @Get('me')
  findMine(@CurrentUser() user: any) {
    return this.leadsService.findMine(user.id, user.role);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAllAdmin(
    @Query('status') status?: LeadStatus,
    @Query('state') state?: string,
    @Query('productId') productId?: string,
    @Query('executiveId') executiveId?: string,
  ) {
    return this.leadsService.findAllAdmin({ status, state, productId, executiveId });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateLeadStatusDto, @CurrentUser() admin: any) {
    return this.leadsService.updateStatus(id, dto, admin.id);
  }
}
