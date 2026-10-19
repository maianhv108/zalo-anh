import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsArray, IsUrl } from 'class-validator';

export class CreateZaloPostDto {
  @ApiProperty({ description: 'Tiêu đề bài đăng nội bộ / chiến dịch' })
  @IsNotEmpty({ message: 'Tiêu đề bài đăng không được để trống.' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Nội dung bài đăng lên Nhật ký Zalo của nhân viên' })
  @IsNotEmpty({ message: 'Nội dung bài đăng không được để trống.' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Đường dẫn ảnh đính kèm bài đăng' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Liên kết website hoặc sản phẩm đính kèm' })
  @IsOptional()
  @IsString()
  linkUrl?: string;

  @ApiPropertyOptional({
    description: 'Danh sách ID tài khoản nhân viên Sale được chọn đăng (để trống hoặc ["ALL"] để đăng tất cả)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  targetAccountIds?: string[];

  @ApiPropertyOptional({ description: 'Thời gian lên lịch đăng bài (ISO string). Nếu không có sẽ đăng ngay' })
  @IsOptional()
  @IsString()
  scheduledAt?: string;
}
