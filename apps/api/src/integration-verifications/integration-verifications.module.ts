import { Module } from '@nestjs/common';
import { IntegrationVerificationsService } from './integration-verifications.service';
import { IntegrationVerificationsController } from './integration-verifications.controller';

@Module({
  controllers: [IntegrationVerificationsController],
  providers: [IntegrationVerificationsService],
  exports: [IntegrationVerificationsService],
})
export class IntegrationVerificationsModule {}
