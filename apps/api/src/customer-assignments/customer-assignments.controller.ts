import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomerAssignmentsService } from './customer-assignments.service';
import { HandoverDto } from './dto/handover.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Phân công & Bàn giao Khách hàng (Assignments & Handover)')
@Controller('customer-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CustomerAssignmentsController {
  constructor(private assignmentsService: CustomerAssignmentsService) {}

  @Post('handover')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Thực hiện bàn giao khách hàng giữa các Sale (Lưu lịch sử và ghi Audit Log)' })
  async handover(@Body() dto: HandoverDto, @CurrentUser() currentUser: any) {
    return this.assignmentsService.handover(dto, currentUser);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Xem toàn bộ lịch sử phân công và bàn giao của một khách hàng' })
  async getCustomerHistory(@Param('customerId') customerId: string) {
    return this.assignmentsService.getCustomerHistory(customerId);
  }
}
