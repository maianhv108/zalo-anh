import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerActivitiesService } from './customer-activities.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ActivityType } from '@prisma/client';

@ApiTags('Hoạt động Chăm sóc Khách hàng (Customer Activities)')
@Controller('customer-activities')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CustomerActivitiesController {
  constructor(private activitiesService: CustomerActivitiesService) {}

  @Post()
  @ApiOperation({ summary: 'Thêm hoạt động chăm sóc mới (Gọi điện, ghi chú, gặp mặt)' })
  async create(
    @Body() body: { customerId: string; type: ActivityType; title: string; description?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.activitiesService.create(body, userId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Lấy dòng thời gian hoạt động chăm sóc của khách hàng' })
  async findByCustomer(@Param('customerId') customerId: string) {
    return this.activitiesService.findByCustomer(customerId);
  }
}
