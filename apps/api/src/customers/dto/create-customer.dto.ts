import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerPriority, CustomerStatus } from '@prisma/client';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Nguyễn Văn Minh' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ tên khách hàng' })
  fullName: string;

  @ApiProperty({ example: '0987654321' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  phone: string;

  @ApiPropertyOptional({ example: 'minh.nguyen@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiProperty({ example: 'Website CRM' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn nguồn khách hàng' })
  source: string;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.NEW })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerPriority, default: CustomerPriority.MEDIUM })
  @IsOptional()
  @IsEnum(CustomerPriority)
  priority?: CustomerPriority;

  @ApiPropertyOptional({ example: ['Khách VIP', 'B2B'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Khách quan tâm gói Enterprise' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
