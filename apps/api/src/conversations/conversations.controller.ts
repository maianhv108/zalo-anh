import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Hộp thư Hội thoại (Conversations Inbox)')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các cuộc hội thoại (Hỗ trợ lọc theo Sale, tìm kiếm)' })
  async findAll(
    @Query('salesUserId') salesUserId?: string,
    @Query('search') search?: string,
    @Query('isDemo') isDemo?: boolean,
    @CurrentUser() currentUser?: any,
  ) {
    return this.conversationsService.findAll({ salesUserId, search, isDemo }, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết luồng tin nhắn và thông tin khách hàng trong hội thoại' })
  async findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }
}
