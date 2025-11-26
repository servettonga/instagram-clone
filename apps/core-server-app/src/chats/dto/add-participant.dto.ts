import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { AddParticipantDto as IAddParticipantDto } from '@repo/shared-types';

export class AddParticipantDto implements IAddParticipantDto {
  @ApiProperty({
    description: 'User ID to add to the group chat',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
