import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomContactDto {
  @ApiProperty({ example: 'Chị Mai Anh', description: 'Tên khách hàng thực tế từ Zalo' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '0912345678', required: false, description: 'Số điện thoại Zalo' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Khách VIP', required: false, description: 'Phân loại thẻ tag' })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiProperty({ example: 'Báo giá sản phẩm', required: false, description: 'Tin nhắn gần nhất' })
  @IsOptional()
  @IsString()
  lastMessage?: string;
}

export class AcceptInviteDto {
  @ApiProperty({
    example: 'Nhân viên Sale 01',
    required: false,
    description: 'Họ và tên nhân viên Sale (tự sinh nếu để trống)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'mai.nguyen@example.com',
    required: false,
    description: 'Email nhân viên (tùy chọn)',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiProperty({
    example: '0987654321',
    required: false,
    description: 'Số điện thoại Zalo (tự sinh nếu để trống)',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'Sale@123456',
    required: false,
    description: 'Mật khẩu (tùy chọn, hệ thống tự cấp nếu để trống)',
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    example: 'Mai Nguyễn Zalo',
    required: false,
    description: 'Tên hiển thị Zalo (tùy chọn)',
  })
  @IsOptional()
  @IsString()
  zaloAccountName?: string;

  @ApiProperty({
    example: 'ALL',
    required: false,
    description: 'Chế độ đồng bộ: ALL (tất cả) hoặc SELECTIVE (chọn lọc)',
  })
  @IsOptional()
  @IsString()
  syncMode?: 'ALL' | 'SELECTIVE';

  @ApiProperty({
    example: ['HOANG', 'PHUONG'],
    required: false,
    description: 'Danh sách các liên hệ được chọn nếu syncMode là SELECTIVE',
  })
  @IsOptional()
  @IsArray()
  selectedContactKeys?: string[];

  @ApiProperty({
    required: false,
    description: 'Danh sách khách hàng thực tế do người dùng tự thêm từ Zalo',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomContactDto)
  customContacts?: CustomContactDto[];
}
