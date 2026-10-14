import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProviderType } from '@prisma/client';

@ApiTags('Kết nối Kênh & Connector (Integrations & Connections)')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @Get('connections')
  @ApiOperation({ summary: 'Lấy danh sách các kết nối tài khoản của nhân viên' })
  async findAllConnections(
    @Query('userId') userId?: string,
    @Query('provider') provider?: ProviderType,
  ) {
    return this.integrationsService.findAllConnections({ userId, provider });
  }

  @Post('connections/:id/check')
  @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối thực tế của connector' })
  async checkConnection(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.integrationsService.checkConnection(id, currentUserId);
  }
}
