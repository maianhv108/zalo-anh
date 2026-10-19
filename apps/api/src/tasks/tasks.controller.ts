import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TaskStatus } from '@prisma/client';

@ApiTags('Nhiệm vụ & Lịch hẹn (Tasks & Reminders)')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách nhiệm vụ cần làm' })
  async findAll(
    @Query('status') status?: TaskStatus,
    @Query('customerId') customerId?: string,
    @Query('assignedToId') assignedToId?: string,
    @CurrentUser() currentUser?: any,
  ) {
    return this.tasksService.findAll({ status, customerId, assignedToId }, currentUser);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo nhiệm vụ hoặc nhắc lịch chăm sóc mới' })
  async create(
    @Body() body: { title: string; description?: string; dueDate?: Date; customerId?: string; assignedToId?: string },
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.tasksService.create(body, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật nhiệm vụ' })
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; dueDate?: Date; status?: TaskStatus },
  ) {
    return this.tasksService.update(id, body);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Đánh dấu nhiệm vụ đã hoàn thành' })
  async complete(@Param('id') id: string) {
    return this.tasksService.complete(id);
  }
}
