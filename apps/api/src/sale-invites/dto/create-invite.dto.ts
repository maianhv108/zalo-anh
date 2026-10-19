import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class CreateInviteDto {
  @ApiPropertyOptional({ description: 'ID đội nhóm kinh doanh gán cho Sale mới' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ default: 15, description: 'Thời gian hết hạn tính bằng phút (5-60 phút)' })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(60)
  expiresInMinutes?: number;
}
