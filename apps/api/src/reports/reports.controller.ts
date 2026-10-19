import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Báo cáo & Thống kê (Reports & KPIs)')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Lấy các chỉ số KPI tổng quan Dashboard (Từ database, có nhãn DEMO)' })
  async getDashboardSummary() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('customer-status')
  @ApiOperation({ summary: 'Lấy dữ liệu biểu đồ phân bố khách hàng theo trạng thái' })
  async getCustomerStatusDistribution() {
    return this.reportsService.getCustomerStatusDistribution();
  }

  @Get('customer-source')
  @ApiOperation({ summary: 'Lấy dữ liệu phân bố nguồn tiếp cận khách hàng' })
  async getCustomerSourceDistribution() {
    return this.reportsService.getCustomerSourceDistribution();
  }

  @Get('sales-performance')
  @ApiOperation({ summary: 'Hiệu suất chăm sóc và tỷ lệ chuyển đổi của từng nhân viên Sale' })
  async getSalesPerformance() {
    return this.reportsService.getSalesPerformance();
  }

  @Get('activity-timeline')
  @ApiOperation({ summary: 'Dòng thời gian các hoạt động chăm sóc gần đây của toàn đội ngũ' })
  async getActivityTimeline() {
    return this.reportsService.getActivityTimeline();
  }
}
