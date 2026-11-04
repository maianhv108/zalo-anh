import { Controller, Get, Post, Param, Query, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { ProfileLauncherService } from './profile-launcher.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProviderType } from '@prisma/client';

export const Public = () => SetMetadata('isPublic', true);

@ApiTags('Kết nối Kênh & Connector (Integrations & Connections)')
@Controller('integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationsController {
  constructor(
    private integrationsService: IntegrationsService,
    private profileLauncherService: ProfileLauncherService,
  ) {}

  @Get('oa/status')
  @ApiOperation({ summary: 'Lấy trạng thái kết nối Zalo OA hiện tại của hệ thống' })
  async getOaStatus(@CurrentUser('id') currentUserId: string) {
    return this.integrationsService.getOaStatus(currentUserId);
  }

  @Get('oa/qr-code')
  @ApiOperation({ summary: 'Lấy mã QR xác thực Zalo OA' })
  async getOaQrCode() {
    return this.integrationsService.getOaQrCode();
  }

  @Post('oa/connect')
  @ApiOperation({ summary: 'Thiết lập hoặc kích hoạt kết nối Zalo OA (qua QR hoặc Credentials)' })
  async connectOa(
    @Body() dto: { oaId?: string; oaName?: string; appId?: string; secretKey?: string; connectMethod: 'QR_SCAN' | 'CREDENTIALS' },
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.integrationsService.connectOa(dto, currentUserId);
  }

  @Post('oa/disconnect')
  @ApiOperation({ summary: 'Ngắt kết nối Zalo OA' })
  async disconnectOa(@CurrentUser('id') currentUserId: string) {
    return this.integrationsService.disconnectOa(currentUserId);
  }

  @Post('oa/sync')
  @ApiOperation({ summary: 'Đồng bộ danh bạ khách hàng và tin nhắn lịch sử từ Zalo OA' })
  async syncOaData(@CurrentUser('id') currentUserId: string) {
    return this.integrationsService.syncOaData(currentUserId);
  }

  @Public()
  @Post('oa/webhook')
  @ApiOperation({ summary: 'Webhook nhận sự kiện thời gian thực từ Zalo OA (Tin nhắn, quan tâm OA)' })
  async handleOaWebhook(@Body() payload: any) {
    return this.integrationsService.handleOaWebhook(payload);
  }

  @Post('oa/simulate-inbound')
  @ApiOperation({ summary: 'Thử nghiệm nhận tin nhắn khách hàng gửi vào Zalo OA' })
  async simulateOaInbound(
    @Body() dto: { customerName?: string; phone?: string; text?: string },
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.integrationsService.simulateOaInbound(dto, currentUserId);
  }

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

  @Post('connections/:id/disconnect')
  @ApiOperation({ summary: 'Ngắt kết nối tài khoản Zalo' })
  async disconnectConnection(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.integrationsService.disconnectConnection(id, currentUserId);
  }

  @Post('connections/:id/reconnect')
  @ApiOperation({ summary: 'Thử kết nối lại hoặc kích hoạt xác minh kênh' })
  async reconnectConnection(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.integrationsService.reconnectConnection(id, currentUserId);
  }

  @Get('connections/logs')
  @ApiOperation({ summary: 'Lấy nhật ký hoạt động kết nối tài khoản Zalo' })
  async getConnectionLogs(@Query('connectionId') connectionId?: string) {
    return this.integrationsService.getConnectionLogs(connectionId);
  }

  // --- QUẢN LÝ CỬA SỔ GIẢ LẬP THIẾT BỊ PROFILE CHROME ĐA TÀI KHOẢN ---

  @Get('profiles')
  @ApiOperation({ summary: 'Lấy danh sách các profile Chrome giả lập thiết bị đa tài khoản Zalo' })
  async getAllProfiles() {
    return this.profileLauncherService.getAllProfiles();
  }

  @Post('profiles/launch')
  @ApiOperation({ summary: 'Khởi chạy cửa sổ Chrome giả lập thiết bị để quét mã QR cho Sale' })
  async launchProfile(
    @Body('salesCode') salesCode: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.profileLauncherService.launchProfile(salesCode, currentUserId);
  }

  @Post('profiles/stop')
  @ApiOperation({ summary: 'Đóng cửa sổ Chrome giả lập thiết bị của Sale' })
  async stopProfile(
    @Body('salesCode') salesCode: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.profileLauncherService.stopProfile(salesCode, currentUserId);
  }

  @Post('profiles/reset')
  @ApiOperation({ summary: 'Xóa dữ liệu phiên để quét lại mã QR mới từ đầu' })
  async resetProfile(
    @Body('salesCode') salesCode: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.profileLauncherService.resetProfile(salesCode, currentUserId);
  }

  @Get('profiles/:salesCode/qr')
  @ApiOperation({ summary: 'Lấy ảnh mã QR trực tiếp từ trình giả lập CDP' })
  async getProfileQr(@Param('salesCode') salesCode: string) {
    return this.profileLauncherService.getProfileQr(salesCode);
  }

  @Post('profiles/:salesCode/focus')
  @ApiOperation({ summary: 'Đưa cửa sổ trình duyệt Chrome của Sale lên đầu màn hình' })
  async focusProfileWindow(@Param('salesCode') salesCode: string) {
    return this.profileLauncherService.focusProfileWindow(salesCode);
  }

  @Post('profiles/:salesCode/refresh-qr')
  @ApiOperation({ summary: 'Làm mới mã QR cho profile' })
  async refreshProfileQr(@Param('salesCode') salesCode: string) {
    return this.profileLauncherService.refreshProfileQr(salesCode);
  }
}


