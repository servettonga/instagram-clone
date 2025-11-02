import { ApiProperty } from '@nestjs/swagger';

export class FollowerProfileDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'john.doe' })
  username: string;

  @ApiProperty({ example: 'John Doe' })
  displayName: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'Love photography and travel', nullable: true })
  bio: string | null;

  @ApiProperty({ example: true })
  isPublic: boolean;
}

export class FollowerDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ type: FollowerProfileDto })
  profile: FollowerProfileDto;

  @ApiProperty({ example: true, nullable: true })
  accepted: boolean | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class FollowersListDto {
  @ApiProperty({ type: [FollowerDto] })
  followers: FollowerDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
