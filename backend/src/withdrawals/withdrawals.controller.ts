import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { CreateWithdrawalDto, ProcessWithdrawalDto } from './dto/withdrawal.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { WithdrawalStatus, UserRole } from '@prisma/client';

@Controller({ path: 'withdrawals', version: '1' })
export class WithdrawalsController {
  constructor(private withdrawalsService: WithdrawalsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateWithdrawalDto) {
    return this.withdrawalsService.create(user.id, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: any) {
    return this.withdrawalsService.findMine(user.id);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get()
  findAllAdmin(@Query('status') status?: WithdrawalStatus) {
    return this.withdrawalsService.findAllAdmin(status);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch(':id/process')
  process(@Param('id') id: string, @Body() dto: ProcessWithdrawalDto, @CurrentUser() admin: any) {
    return this.withdrawalsService.process(id, dto, admin.id);
  }
}
