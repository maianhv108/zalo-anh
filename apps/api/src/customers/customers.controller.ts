import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CustomerPriority, CustomerStatus } from '@prisma/client';
import { Response } from 'express';

@ApiTags('Quản lý Khách hàng (Customers CRM)')
@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khách hàng có phân trang, bộ lọc và tìm kiếm' })
  async findAll(
    @CurrentUser() currentUser: any,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: CustomerStatus,
    @Query('priority') priority?: CustomerPriority,
    @Query('source') source?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.customersService.findAll(
      { page, pageSize, status, priority, source, assignedToId, search, sortBy, sortOrder },
      currentUser,
    );
  }

  @Get('check-duplicates')
  @ApiOperation({ summary: 'Kiểm tra khách hàng có nguy cơ trùng lặp (qua SĐT hoặc Email)' })
  async checkDuplicates(
    @Query('phone') phone?: string,
    @Query('email') email?: string,
  ) {
    return this.customersService.checkDuplicates(phone, email);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Xuất danh sách khách hàng ra định dạng CSV (Có ghi nhận Audit Log)' })
  async exportCsv(@CurrentUser() currentUser: any, @Res() res: Response) {
    const csv = await this.customersService.exportCsv(currentUser);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');
    // Thêm BOM UTF-8 để Excel đọc tiếng Việt không bị lỗi font
    res.send('\uFEFF' + csv);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết hồ sơ khách hàng (Kèm lịch sử chăm sóc, hội thoại, tệp đính kèm)' })
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.customersService.findOne(id, currentUser);
  }

  @Post()
  @ApiOperation({ summary: 'Thêm khách hàng mới' })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() currentUser: any) {
    return this.customersService.create(dto, currentUser);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Chỉnh sửa thông tin khách hàng' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.update(id, dto, currentUser);
  }
}
