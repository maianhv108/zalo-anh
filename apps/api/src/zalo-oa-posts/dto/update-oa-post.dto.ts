import { PartialType } from '@nestjs/swagger';
import { CreateOaPostDto } from './create-oa-post.dto';

export class UpdateOaPostDto extends PartialType(CreateOaPostDto) {}
