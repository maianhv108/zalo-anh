import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class HandoverDto {
  @ApiProperty({ example: ['clx...'], description: 'Danh sách ID khách hàng cần bàn giao' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Vui lòng chọn ít nhất 1 khách hàng để bàn giao' })
  customerIds: string[];

  @ApiProperty({ example: 'clx...', description: 'ID nhân viên nhận bàn giao' })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng chọn nhân viên tiếp nhận' })
  toUserId: string;

  @ApiProperty({ example: 'Bàn giao khách hàng do Sale cũ chuyển vị trí công tác sang chi nhánh khác' })
  @IsString()
  @MinLength(5, { message: 'Vui lòng nhập lý do bàn giao (tối thiểu 5 ký tự)' })
  reason: string;
}
