import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole, UserStatus } from '@prisma/client';

@ApiTags('Quản lý Nhân viên (Users)')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Lấy danh sách nhân viên có phân trang và bộ lọc' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('role') role?: UserRole,
    @Query('status') status?: UserStatus,
    @Query('teamId') teamId?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll({ page, pageSize, role, status, teamId, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem chi tiết thông tin nhân viên' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Get(':id/customers')
  @ApiOperation({ summary: 'Xem danh sách khách hàng do nhân viên phụ trách' })
  async getAssignedCustomers(@Param('id') id: string) {
    return this.usersService.getAssignedCustomers(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới (Chỉ Admin)' })
  async create(@Body() dto: CreateUserDto, @CurrentUser('id') currentUserId: string) {
    return this.usersService.create(dto, currentUserId);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.usersService.update(id, dto, currentUserId);
  }

  @Post(':id/disable')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Vô hiệu hóa tài khoản nhân viên (Kiểm tra khách hàng chưa bàn giao)' })
  async disable(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.usersService.disable(id, currentUserId);
  }

  @Delete(':id/wipe-account')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Gỡ bỏ hoàn toàn tài khoản Zalo & xóa sạch dữ liệu đồng bộ khỏi hệ thống' })
  async wipeAccount(@Param('id') id: string, @CurrentUser('id') currentUserId: string) {
    return this.usersService.wipeAccount(id, currentUserId);
  }
}
