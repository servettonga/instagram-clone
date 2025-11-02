import { ApiProperty } from '@nestjs/swagger';

export class FollowResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  followerProfileId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  followedProfileId: string;

  @ApiProperty({ example: true, nullable: true })
  accepted: boolean | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
