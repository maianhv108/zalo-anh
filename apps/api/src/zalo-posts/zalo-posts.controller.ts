import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZaloPostsService } from './zalo-posts.service';
import { CreateZaloPostDto } from './dto/create-zalo-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Đăng bài đồng loạt Zalo (Zalo Posts)')
@Controller('zalo-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ZaloPostsController {
  constructor(private zaloPostsService: ZaloPostsService) {}

  @Get('accounts')
  @ApiOperation({ summary: 'Lấy danh sách các tài khoản Zalo nhân viên sẵn sàng để đăng bài' })
  async getAvailableAccounts() {
    return this.zaloPostsService.getAvailableAccounts();
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các bài đăng đồng loạt đã tạo' })
  async findAll() {
    return this.zaloPostsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết bài đăng và danh sách tài khoản đã đăng' })
  async findOne(@Param('id') id: string) {
    return this.zaloPostsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Đăng bài đồng loạt lên các tài khoản Zalo được chọn (hoặc tất cả)' })
  async create(@Body() dto: CreateZaloPostDto, @CurrentUser('id') currentUserId: string) {
    return this.zaloPostsService.create(dto, currentUserId);
  }

  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Đăng lại cho các tài khoản chưa hoàn tất hoặc bị lỗi' })
  async retry(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.zaloPostsService.retryFailed(id, currentUserId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Xóa bài đăng đồng loạt' })
  async delete(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.zaloPostsService.delete(id, currentUserId);
  }
}
