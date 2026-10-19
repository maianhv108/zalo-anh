import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CapabilityVerificationStatus, IntegrationCapability } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateVerificationDto {
  @ApiProperty({ enum: IntegrationCapability, example: IntegrationCapability.READ_CHATS })
  @IsEnum(IntegrationCapability)
  capability: IntegrationCapability;

  @ApiProperty({ enum: CapabilityVerificationStatus, example: CapabilityVerificationStatus.VERIFIED })
  @IsEnum(CapabilityVerificationStatus)
  status: CapabilityVerificationStatus;

  @ApiProperty({ example: 'Zalo Personal Web Protocol' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập phương thức tích hợp' })
  method: string;

  @ApiPropertyOptional({ example: 'https://developers.zalo.me/docs/api' })
  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @ApiPropertyOptional({ example: 'REF-OFFICIAL-DOC-2026' })
  @IsOptional()
  @IsString()
  evidenceReference?: string;

  @ApiPropertyOptional({ example: 'Chỉ đọc tin nhắn trong danh sách khách hàng CRM' })
  @IsOptional()
  @IsString()
  scopeNotes?: string;

  @ApiProperty({ example: 'Đã kiểm tra tài liệu và ghi nhận biên bản thử nghiệm nội bộ' })
  @IsString()
  @MinLength(5, { message: 'Ghi chú xác minh tối thiểu 5 ký tự' })
  verificationNotes: string;

  @ApiPropertyOptional({ example: 'PASS_TEST_2026' })
  @IsOptional()
  @IsString()
  testResult?: string;
}
