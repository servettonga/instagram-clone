import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({
    description: 'Updated message content',
    example: 'Updated message text',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class UpdateChatDto {
  @ApiProperty({
    description: 'Chat name (for group chats)',
    example: 'Project Team',
    required: false,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;
}
