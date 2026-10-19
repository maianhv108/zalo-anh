import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SaleInvitesController } from './sale-invites.controller';
import { SaleInvitesService } from './sale-invites.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'sales-zalo-super-secret-key-production-change-me',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [SaleInvitesController],
  providers: [SaleInvitesService],
  exports: [SaleInvitesService],
})
export class SaleInvitesModule {}
