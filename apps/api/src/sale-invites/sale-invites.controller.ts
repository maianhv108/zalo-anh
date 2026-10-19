import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SaleInvitesService } from './sale-invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Mời Nhân viên Sale bằng Mã QR (Sale Invites)')
@Controller('sale-invites')
export class SaleInvitesController {
  constructor(private saleInvitesService: SaleInvitesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin/Manager tạo mã QR mời nhân viên Sale tham gia' })
  async createInvite(
    @Body() dto: CreateInviteDto,
    @CurrentUser('id') currentUserId: string,
    @Headers('host') hostHeader?: string,
  ) {
    return this.saleInvitesService.createInvite(dto, currentUserId, hostHeader);
  }

  @Get(':token/status')
  @ApiOperation({ summary: 'Lấy trạng thái thời gian thực của mã mời QR (Dành cho Admin Polling)' })
  async getStatus(@Param('token') token: string) {
    return this.saleInvitesService.getInviteStatus(token);
  }

  @Post(':token/scan')
  @ApiOperation({ summary: 'Ghi nhận nhân viên đã quét mã QR trên điện thoại' })
  async markScanned(@Param('token') token: string) {
    return this.saleInvitesService.markScanned(token);
  }

  @Post(':token/accept')
  @ApiOperation({ summary: 'Nhân viên xác nhận thông tin cơ bản và tham gia hệ thống Sale' })
  async acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.saleInvitesService.acceptInvite(token, dto);
  }

  @Post(':token/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hủy bỏ mã mời QR' })
  async cancelInvite(
    @Param('token') token: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.saleInvitesService.cancelInvite(token, currentUserId);
  }
}
