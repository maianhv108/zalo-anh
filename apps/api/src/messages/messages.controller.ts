import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MessageContentType } from '@prisma/client';

@ApiTags('Tin nhắn (Messages)')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Post(':conversationId')
  @ApiOperation({ summary: 'Gửi tin nhắn trong hội thoại (Chặn gửi thật nếu chưa verified)' })
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: { textContent: string; contentType?: MessageContentType },
    @CurrentUser() currentUser: any,
  ) {
    return this.messagesService.sendMessage(conversationId, body, currentUser);
  }
}
