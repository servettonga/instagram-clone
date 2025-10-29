import { ApiProperty } from '@nestjs/swagger';

export class UploadAssetResponseDto {
  @ApiProperty({ example: 'asset-uuid' })
  id: string;

  @ApiProperty({ example: 'post-1634567890123-987654321.jpg' })
  fileName: string;

  @ApiProperty({ example: '/uploads/posts/image.jpg' })
  filePath: string;

  @ApiProperty({ example: 'image/jpeg' })
  fileType: string;

  @ApiProperty({ example: 1024000 })
  fileSize: number;

  @ApiProperty({ example: 'http://localhost:8000/uploads/posts/image.jpg' })
  url: string;
}
