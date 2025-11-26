import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { CreateGroupChatDto as ICreateGroupChatDto } from '@repo/shared-types';

export class CreateGroupChatDto implements ICreateGroupChatDto {
  @ApiProperty({
    description: 'Name of the group chat',
    example: 'Project Team',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Array of user IDs to include as participants',
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  participantUserIds: string[];
}
