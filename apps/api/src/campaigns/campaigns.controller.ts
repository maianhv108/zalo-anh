import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Chiến dịch Gửi tin (Campaigns)')
@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(private campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các chiến dịch gửi tin' })
  async findAll() {
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết chiến dịch và danh sách người nhận' })
  async findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Post('preview')
  @ApiOperation({ summary: 'Xem trước danh sách người nhận và phát hiện số điện thoại trùng lặp' })
  async preview(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.preview(dto);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Tạo chiến dịch gửi tin mới (Trạng thái DRAFT)' })
  async create(@Body() dto: CreateCampaignDto, @CurrentUser('id') currentUserId: string) {
    return this.campaignsService.create(dto, currentUserId);
  }

  @Post(':id/dry-run')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Chạy thử nghiệm (Dry-run) kiểm tra luồng chiến dịch mà không gửi thật' })
  async dryRun(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.campaignsService.dryRun(id, currentUserId);
  }

  @Post(':id/confirm-send')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Xác nhận gửi thật (Bắt buộc kiểm tra Gating: bị chặn nếu capability chưa verified)' })
  async confirmSend(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.campaignsService.confirmSend(id, currentUserId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Hủy bỏ chiến dịch' })
  async cancel(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.campaignsService.cancel(id, currentUserId);
  }
}
