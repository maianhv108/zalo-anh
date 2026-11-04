import { Module } from '@nestjs/common';
import { ZaloOaPostsService } from './zalo-oa-posts.service';
import { ZaloOaPostsController } from './zalo-oa-posts.controller';

@Module({
  controllers: [ZaloOaPostsController],
  providers: [ZaloOaPostsService],
  exports: [ZaloOaPostsService],
})
export class ZaloOaPostsModule {}
