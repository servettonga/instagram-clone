import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CreatePrivateChatDto as ICreatePrivateChatDto } from '@repo/shared-types';

export class CreatePrivateChatDto implements ICreatePrivateChatDto {
  @ApiProperty({
    description: 'User ID of the other participant',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  otherUserId: string;
}
