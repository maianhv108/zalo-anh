import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';

@ApiTags('Nhật ký Hoạt động (Audit Logs)')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AuditLogsController {
  constructor(private auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Lấy nhật ký kiểm toán hệ thống (Chỉ Admin)' })
  async findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('action') action?: AuditAction,
    @Query('userId') userId?: string,
    @Query('search') search?: string,
  ) {
    return this.auditLogsService.findAll({ page, pageSize, action, userId, search });
  }
}
