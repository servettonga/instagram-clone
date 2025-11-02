import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCommentDto {
  @ApiProperty({
    example: 'This is an updated comment!',
    description: 'Updated comment content',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}
