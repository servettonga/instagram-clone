import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UploadAssetRequestDto {
  @ApiProperty({
    example: '1:1',
    description: 'Aspect ratio of the image',
    enum: ['1:1', '4:5', '16:9'],
  })
  @IsString()
  @IsIn(['1:1', '4:5', '16:9'])
  aspectRatio: string = '1:1';
}

export class UploadAssetResponseDto {
  @ApiProperty({ example: 'asset-uuid' })
  id: string;

  @ApiProperty({ example: 'post-1634567890123-987654321.jpg' })
  fileName: string;

  @ApiProperty({ example: '/uploads/posts/image-full.webp' })
  filePath: string;

  @ApiPropertyOptional({ example: '/uploads/posts/image-thumbnail.webp' })
  thumbnailPath?: string | null;

  @ApiPropertyOptional({ example: '/uploads/posts/image-medium.webp' })
  mediumPath?: string | null;

  @ApiProperty({ example: 'image/jpeg' })
  fileType: string;

  @ApiProperty({ example: 1024000 })
  fileSize: number;

  @ApiPropertyOptional({ example: '1:1' })
  aspectRatio?: string | null;

  @ApiProperty({
    example: 'http://localhost:8000/uploads/posts/image-full.webp',
  })
  url: string;

  @ApiPropertyOptional({
    example: 'http://localhost:8000/uploads/posts/image-thumbnail.webp',
  })
  thumbnailUrl?: string | null;

  @ApiPropertyOptional({
    example: 'http://localhost:8000/uploads/posts/image-medium.webp',
  })
  mediumUrl?: string | null;
}
