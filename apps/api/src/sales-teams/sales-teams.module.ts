import { Module } from '@nestjs/common';
import { SalesTeamsService } from './sales-teams.service';
import { SalesTeamsController } from './sales-teams.controller';

@Module({
  controllers: [SalesTeamsController],
  providers: [SalesTeamsService],
  exports: [SalesTeamsService],
})
export class SalesTeamsModule {}
