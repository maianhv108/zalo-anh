import { IsString, IsOptional } from 'class-validator';

export class AiGeneratePostDto {
  @IsString()
  topic: string;

  @IsOptional()
  @IsString()
  tone?: string;

  @IsOptional()
  @IsString()
  customPrompt?: string;
}
