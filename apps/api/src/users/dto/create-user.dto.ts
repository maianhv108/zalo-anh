import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập họ và tên' })
  name: string;

  @ApiProperty({ example: 'sale09@saleszalo.local' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Sale@123456' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu tối thiểu 6 ký tự' })
  password: string;

  @ApiProperty({ enum: UserRole, default: UserRole.SALE })
  @IsEnum(UserRole, { message: 'Vai trò không hợp lệ' })
  role: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A Zalo' })
  @IsOptional()
  @IsString()
  zaloAccountName?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  zaloPhone?: string;
}
