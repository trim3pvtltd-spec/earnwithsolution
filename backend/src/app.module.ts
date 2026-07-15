import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { LeadsModule } from './leads/leads.module';
import { WalletModule } from './wallet/wallet.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { BcApplicationsModule } from './bc-applications/bc-applications.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BanksModule } from './banks/banks.module';
import { LocationsModule } from './locations/locations.module';
import { AdminModule } from './admin/admin.module';
import { AdminActionLoggerModule } from './admin/admin-action-logger.module';
import { UploadsModule } from './uploads/uploads.module';
import { SecurityModule } from './common/security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL || 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT || 100),
      },
    ]),
    PrismaModule,
    SecurityModule,
    AdminActionLoggerModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    LeadsModule,
    WalletModule,
    WithdrawalsModule,
    BcApplicationsModule,
    NotificationsModule,
    BanksModule,
    LocationsModule,
    AdminModule,
    UploadsModule,
  ],
  providers: [
    // Global rate limiting on every endpoint (extra strict limits are
    // applied per-route on sensitive endpoints like OTP login)
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
