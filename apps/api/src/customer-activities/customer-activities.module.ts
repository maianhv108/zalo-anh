import { Module } from '@nestjs/common';
import { CustomerActivitiesService } from './customer-activities.service';
import { CustomerActivitiesController } from './customer-activities.controller';

@Module({
  controllers: [CustomerActivitiesController],
  providers: [CustomerActivitiesService],
  exports: [CustomerActivitiesService],
})
export class CustomerActivitiesModule {}
