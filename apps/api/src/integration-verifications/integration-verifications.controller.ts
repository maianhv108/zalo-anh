import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IntegrationVerificationsService } from './integration-verifications.service';
import { UpdateVerificationDto } from './dto/update-verification.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Xác minh Tích hợp Zalo Cá nhân (Capability Verification)')
@Controller('integration-verifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class IntegrationVerificationsController {
  constructor(private verificationsService: IntegrationVerificationsService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Lấy trạng thái kết nối và 3 capability xác minh của một nhân viên Sale' })
  async findByUserId(@Param('userId') userId: string) {
    return this.verificationsService.findByUserId(userId);
  }

  @Patch('user/:userId')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Cập nhật trạng thái xác minh capability (Yêu cầu quyền Admin/Manager và bằng chứng nếu VERIFIED)' })
  async updateVerification(
    @Param('userId') userId: string,
    @Body() dto: UpdateVerificationDto,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.verificationsService.updateVerification(userId, dto, currentUserId);
  }
}
