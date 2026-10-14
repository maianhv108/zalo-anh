import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Chiến dịch Tri Ân Khách Hàng Q4' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập tên chiến dịch' })
  name: string;

  @ApiProperty({ example: 'Kính gửi Quý khách hàng, Chúng tôi xin gửi tặng voucher 20%...' })
  @IsString()
  @MinLength(10, { message: 'Nội dung tin nhắn tối thiểu 10 ký tự' })
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  targetFilter?: {
    status?: CustomerStatus[];
    assignedToId?: string;
    source?: string;
  };

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  customerIds?: string[];
}
