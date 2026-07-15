import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, SubmitKycDto, UpdateBankDetailsDto } from './dto/user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Post('me/kyc')
  submitKyc(@CurrentUser() user: any, @Body() dto: SubmitKycDto) {
    return this.usersService.submitKyc(user.id, dto);
  }

  @Post('me/bank-details')
  updateBank(@CurrentUser() user: any, @Body() dto: UpdateBankDetailsDto) {
    return this.usersService.updateBankDetails(user.id, dto);
  }

  @Roles('SHOPKEEPER' as any)
  @Get('me/team')
  getTeam(@CurrentUser() user: any) {
    return this.usersService.getTeam(user.id);
  }

  @Roles('SHOPKEEPER' as any)
  @Post('me/team/:fosUserId')
  addToTeam(@CurrentUser() user: any, @Param('fosUserId') fosUserId: string) {
    return this.usersService.addToTeam(user.id, fosUserId);
  }
}
