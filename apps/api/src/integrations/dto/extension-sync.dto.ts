import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExtensionSyncMessageDto {
  @ApiProperty({ example: 'INBOUND', description: 'Chiều tin nhắn: INBOUND hoặc OUTBOUND' })
  @IsString()
  direction: 'INBOUND' | 'OUTBOUND';

  @ApiProperty({ example: 'Chào bạn, tư vấn giúp mình với...', description: 'Nội dung tin nhắn text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Thời gian gửi' })
  @IsOptional()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'ID định danh tin nhắn trên Zalo' })
  @IsOptional()
  @IsString()
  msgId?: string;
}

export class ExtensionSyncCustomerDto {
  @ApiProperty({ example: 'Chị Mai Lan', description: 'Tên khách hàng hiển thị trên Zalo' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: '0987654321', description: 'Số điện thoại khách (nếu lấy được)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'URL ảnh đại diện Zalo' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Zalo UID cuộc trò chuyện' })
  @IsOptional()
  @IsString()
  zaloId?: string;
}

export class ExtensionSyncConversationDto {
  @ApiProperty({ example: 'SALE01', description: 'Mã nhân viên Sale đang chạy Extension' })
  @IsNotEmpty()
  @IsString()
  salesCode: string;

  @ApiProperty({ description: 'Thông tin khách hàng' })
  @ValidateNested()
  @Type(() => ExtensionSyncCustomerDto)
  customer: ExtensionSyncCustomerDto;

  @ApiProperty({ description: 'Danh sách tin nhắn vừa phát sinh hoặc mới nhận' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtensionSyncMessageDto)
  messages: ExtensionSyncMessageDto[];
}
