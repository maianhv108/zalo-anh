import { Module } from '@nestjs/common';
import { ZaloPostsController } from './zalo-posts.controller';
import { ZaloPostsService } from './zalo-posts.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ZaloPostsController],
  providers: [ZaloPostsService],
  exports: [ZaloPostsService],
})
export class ZaloPostsModule {}
