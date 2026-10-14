import { Module } from '@nestjs/common';
import { CustomerAssignmentsService } from './customer-assignments.service';
import { CustomerAssignmentsController } from './customer-assignments.controller';

@Module({
  controllers: [CustomerAssignmentsController],
  providers: [CustomerAssignmentsService],
  exports: [CustomerAssignmentsService],
})
export class CustomerAssignmentsModule {}
