import { Module } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';
import { ExtensionSyncController } from './extension-sync.controller';
import { ExtensionSyncService } from './extension-sync.service';

@Module({
  controllers: [IntegrationsController, ExtensionSyncController],
  providers: [IntegrationsService, ExtensionSyncService],
  exports: [IntegrationsService, ExtensionSyncService],
})
export class IntegrationsModule {}
