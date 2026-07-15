import { Controller, Get, Query } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { WalletTxnStatus, WalletTxnType } from '@prisma/client';

@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get('me')
  getMyWallet(@CurrentUser() user: any) {
    return this.walletService.getMyWallet(user.id);
  }

  @Get('me/transactions')
  getTransactions(
    @CurrentUser() user: any,
    @Query('type') type?: WalletTxnType,
    @Query('status') status?: WalletTxnStatus,
  ) {
    return this.walletService.getTransactions(user.id, { type, status });
  }
}
