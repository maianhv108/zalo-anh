import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, MinLength, Matches, IsOptional } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({ example: 'Nguyễn Thị Mai', description: 'Họ và tên nhân viên Sale' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên' })
  name: string;

  @ApiProperty({ example: 'mai.nguyen@example.com', description: 'Email nhân viên' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '0987654321', description: 'Số điện thoại cá nhân / Zalo' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập số điện thoại' })
  @Matches(/^[0-9]{9,11}$/, { message: 'Số điện thoại phải từ 9 đến 11 chữ số' })
  phone: string;

  @ApiProperty({ example: 'Sale@123456', description: 'Mật khẩu tạo mới để đăng nhập CRM sau này' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ example: 'Mai Nguyễn Zalo', required: false, description: 'Tên hiển thị Zalo (tùy chọn)' })
  @IsOptional()
  @IsString()
  zaloAccountName?: string;
}
