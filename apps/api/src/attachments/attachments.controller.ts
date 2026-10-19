import { Controller, Get, Delete, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DataSource } from '@prisma/client';
import { Response } from 'express';

@ApiTags('Kho lưu trữ Tệp tin (Archive & Attachments)')
@Controller('attachments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tệp lưu trữ có bộ lọc (Loại file, nguồn dữ liệu)' })
  async findAll(
    @Query('fileType') fileType?: string,
    @Query('customerId') customerId?: string,
    @Query('sourceType') sourceType?: DataSource,
    @Query('search') search?: string,
    @CurrentUser() currentUser?: any,
  ) {
    return this.attachmentsService.findAll({ fileType, customerId, sourceType, search }, currentUser);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem thông tin chi tiết của một tệp đính kèm' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.attachmentsService.findOne(id, currentUser);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Tải xuống tệp lưu trữ (Kiểm tra quyền truy cập ở server)' })
  async download(@Param('id') id: string, @CurrentUser() currentUser: any, @Res() res: Response) {
    const attachment = await this.attachmentsService.findOne(id, currentUser);
    // Trả về file tải về an toàn hoặc demo content
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.send(`Dữ liệu mẫu nội dung của tệp đính kèm: ${attachment.fileName}\nKhách hàng: ${attachment.customer?.fullName}\nNguồn: ${attachment.sourceType}`);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tệp khỏi kho lưu trữ (Ghi Audit Log)' })
  async delete(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.attachmentsService.delete(id, currentUser);
  }
}
