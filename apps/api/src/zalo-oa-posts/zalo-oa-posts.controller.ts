import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZaloOaPostsService } from './zalo-oa-posts.service';
import { CreateOaPostDto } from './dto/create-oa-post.dto';
import { UpdateOaPostDto } from './dto/update-oa-post.dto';
import { AiGeneratePostDto } from './dto/ai-generate-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Zalo OA - Đăng bài tự động (Zalo OA Posts)')
@Controller('zalo-oa/posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ZaloOaPostsController {
  constructor(private readonly zaloOaPostsService: ZaloOaPostsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách bài viết Zalo OA và thống kê tương tác' })
  async findAll(@Query('status') status?: string, @Query('category') category?: string, @Query('search') search?: string) {
    return this.zaloOaPostsService.findAll({ status, category, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết một bài viết Zalo OA' })
  async findOne(@Param('id') id: string) {
    return this.zaloOaPostsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Tạo bài viết Zalo OA mới (Lưu nháp, Hẹn giờ đăng, hoặc Đăng ngay)' })
  async create(@Body() dto: CreateOaPostDto, @CurrentUser('id') currentUserId: string) {
    return this.zaloOaPostsService.create(dto, currentUserId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cập nhật nội dung hoặc lịch hẹn giờ bài viết Zalo OA' })
  async update(@Param('id') id: string, @Body() dto: UpdateOaPostDto, @CurrentUser('id') currentUserId: string) {
    return this.zaloOaPostsService.update(id, dto, currentUserId);
  }

  @Post(':id/publish-now')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Xuất bản đăng ngay lập tức bài viết lên Zalo OA' })
  async publishNow(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.zaloOaPostsService.publishNow(id, currentUserId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Xóa bài viết Zalo OA' })
  async delete(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.zaloOaPostsService.delete(id, currentUserId);
  }

  @Post('ai-generate')
  @ApiOperation({ summary: 'AI TourLuk tự động tạo bài viết du lịch chuẩn Zalo OA' })
  async aiGenerate(@Body() dto: AiGeneratePostDto) {
    return this.zaloOaPostsService.aiGenerate(dto);
  }
}
