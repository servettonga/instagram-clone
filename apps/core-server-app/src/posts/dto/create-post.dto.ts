import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsArray,
  ArrayMaxSize,
  IsIn,
} from 'class-validator';

export class CreatePostDto {
  @ApiPropertyOptional({
    example: 'What a beautiful day!',
    description: 'The content of the post',
    maxLength: 5000,
  })
  @IsOptional()
  @IsString({ message: 'content must be a string' })
  @MaxLength(5000, {
    message: 'content must be shorter than or equal to 5000 characters',
  })
  content?: string;

  @ApiPropertyOptional({
    example: '1:1',
    description: 'Aspect ratio for the post display',
    enum: ['1:1', '4:5', '16:9'],
    default: '1:1',
  })
  @IsOptional()
  @IsString({ message: 'aspectRatio must be a string' })
  @IsIn(['1:1', '4:5', '16:9'], {
    message: 'aspectRatio must be one of: 1:1, 4:5, 16:9',
  })
  aspectRatio?: string;

  @ApiPropertyOptional({
    example: ['asset-id-1', 'asset-id-2'],
    description: 'Array of asset IDs to attach to the post (max 10)',
    type: [String],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray({ message: 'assetIds must be an array' })
  @ArrayMaxSize(10, { message: 'You can attach a maximum of 10 assets' })
  @IsString({ each: true, message: 'Each assetId must be a string' })
  assetIds?: string[];
}
