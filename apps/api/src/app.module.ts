import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SalesTeamsModule } from './sales-teams/sales-teams.module';
import { CustomersModule } from './customers/customers.module';
import { CustomerAssignmentsModule } from './customer-assignments/customer-assignments.module';
import { CustomerActivitiesModule } from './customer-activities/customer-activities.module';
import { TasksModule } from './tasks/tasks.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MessagesModule } from './messages/messages.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { IntegrationVerificationsModule } from './integration-verifications/integration-verifications.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { ReportsModule } from './reports/reports.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SaleInvitesModule } from './sale-invites/sale-invites.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SalesTeamsModule,
    CustomersModule,
    CustomerAssignmentsModule,
    CustomerActivitiesModule,
    TasksModule,
    ConversationsModule,
    MessagesModule,
    AttachmentsModule,
    IntegrationsModule,
    IntegrationVerificationsModule,
    CampaignsModule,
    ReportsModule,
    AuditLogsModule,
    NotificationsModule,
    SaleInvitesModule,
  ],
})
export class AppModule {}
