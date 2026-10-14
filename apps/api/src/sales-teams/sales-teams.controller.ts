import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SalesTeamsService } from './sales-teams.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Đội ngũ Kinh doanh (Sales Teams)')
@Controller('sales-teams')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SalesTeamsController {
  constructor(private teamsService: SalesTeamsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách các nhóm kinh doanh' })
  async findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết nhóm kinh doanh và các thành viên' })
  async findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo nhóm kinh doanh mới (Admin)' })
  async create(@Body() body: { name: string; code: string; description?: string }) {
    return this.teamsService.create(body);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cập nhật nhóm kinh doanh' })
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; leaderId?: string },
  ) {
    return this.teamsService.update(id, body);
  }
}
