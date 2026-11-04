import { ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerPriority, CustomerStatus } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Nguyễn Văn Minh' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: '0987654321', nullable: true })
  @IsOptional()
  phone?: string | null;

  @ApiPropertyOptional({ example: 'minh.nguyen@example.com', nullable: true })
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({ example: 'ZALO' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerPriority })
  @IsOptional()
  @IsEnum(CustomerPriority)
  priority?: CustomerPriority;

  @ApiPropertyOptional({ example: ['Khách VIP'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Ghi chú về khách hàng', nullable: true })
  @IsOptional()
  notes?: string | null;

  @ApiPropertyOptional({ example: 'clx...' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

