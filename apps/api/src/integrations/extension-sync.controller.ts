import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ExtensionSyncService } from './extension-sync.service';
import { ExtensionSyncConversationDto } from './dto/extension-sync.dto';

@ApiTags('Đồng bộ Chrome Extension Zalo Web (Chrome Extension Sync)')
@Controller('integrations/extension')
export class ExtensionSyncController {
  constructor(private extensionSyncService: ExtensionSyncService) {}

  @Get('sales-list')
  @ApiOperation({ summary: 'Lấy danh sách nhân viên Sale đang hoạt động cho Extension' })
  async getSalesList() {
    return this.extensionSyncService.getSalesList();
  }

  @Get('status')
  @ApiOperation({ summary: 'Kiểm tra trạng thái kết nối và số liệu đồng bộ của nhân viên' })
  async getExtensionStatus(@Query('salesCode') salesCode: string) {
    return this.extensionSyncService.getExtensionStatus(salesCode || 'SALE01');
  }

  @Post('sync')
  @ApiOperation({ summary: 'Đồng bộ đoạn chat và tin nhắn từ Zalo Web (chat.zalo.me)' })
  async syncConversation(@Body() dto: ExtensionSyncConversationDto) {
    return this.extensionSyncService.syncConversation(dto);
  }
}
