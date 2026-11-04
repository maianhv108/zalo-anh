import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString } from 'class-validator';
import { ZaloPostStatus } from '@prisma/client';

export class CreateOaPostDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsEnum(ZaloPostStatus)
  status?: ZaloPostStatus;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @IsOptional()
  @IsString()
  aiPrompt?: string;
}
