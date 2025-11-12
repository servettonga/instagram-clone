import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface ProcessedImages {
  thumbnail: string;
  medium: string;
  full: string;
}

@Injectable()
export class ImageProcessingService {
  private readonly logContext = ImageProcessingService.name;
  private uploadPath = process.env.UPLOAD_DIR || './uploads';

  constructor(private readonly logger: Logger) {}

  /**
   * Process uploaded image and generate three optimized versions
   * - Thumbnail: 150×150 for profile grids
   * - Medium: 640×640 for feed display
   * - Full: 1080×1080 max for post page/modal
   */
  async processPostImage(
    file: Express.Multer.File,
    aspectRatio: string = '1:1',
  ): Promise<ProcessedImages> {
    const outputPath = join(this.uploadPath, 'posts');

    // Ensure output directory exists
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
    }

    const baseFilename = `post-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    try {
      // Calculate dimensions based on aspect ratio
      const dimensions = this.getAspectDimensions(aspectRatio);

      // Process image in parallel for better performance
      await Promise.all([
        // Thumbnail: Always square 150×150 for grids
        sharp(file.buffer)
          .resize(150, 150, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toFile(join(outputPath, `${baseFilename}-thumb.webp`)),

        // Medium: Sized for aspect ratio, max 640px width
        sharp(file.buffer)
          .resize(dimensions.medium.width, dimensions.medium.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 })
          .toFile(join(outputPath, `${baseFilename}-medium.webp`)),

        // Full: Sized for aspect ratio, max 1080px width
        sharp(file.buffer)
          .resize(
            dimensions.full.width,
            dimensions.full.height,
            { fit: 'inside' }, // Preserve aspect ratio
          )
          .webp({ quality: 90 })
          .toFile(join(outputPath, `${baseFilename}-full.webp`)),
      ]);

      this.logger.log(
        `Successfully processed image: ${baseFilename}`,
        this.logContext,
      );

      return {
        thumbnail: `${baseFilename}-thumb.webp`,
        medium: `${baseFilename}-medium.webp`,
        full: `${baseFilename}-full.webp`,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error processing image: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
      throw new Error('Failed to process image');
    }
  }

  /**
   * Process avatar image - always square
   */
  async processAvatar(file: Express.Multer.File): Promise<string> {
    const outputPath = join(this.uploadPath, 'avatars');

    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
    }

    const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

    try {
      // Generate 150×150 avatar
      await sharp(file.buffer)
        .resize(150, 150, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toFile(join(outputPath, filename));

      this.logger.log(
        `Successfully processed avatar: ${filename}`,
        this.logContext,
      );

      return filename;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error processing avatar: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
      throw new Error('Failed to process avatar');
    }
  }

  /**
   * Get dimensions based on aspect ratio
   */
  private getAspectDimensions(aspectRatio: string) {
    const dimensions = {
      medium: { width: 640, height: 640 },
      full: { width: 1080, height: 1080 },
    };

    switch (aspectRatio) {
      case '1:1':
      case '1/1':
        // Square - already set as default
        break;

      case '4:5':
      case '4/5':
        // Portrait
        dimensions.medium = { width: 640, height: 800 };
        dimensions.full = { width: 1080, height: 1350 };
        break;

      case '16:9':
      case '16/9':
        // Landscape
        dimensions.medium = { width: 640, height: 360 };
        dimensions.full = { width: 1080, height: 608 };
        break;
    }

    return dimensions;
  }

  /**
   * Delete processed images
   */
  deleteImages(filenames: string[]): void {
    const outputPath = join(this.uploadPath, 'posts');

    for (const filename of filenames) {
      try {
        const filePath = join(outputPath, filename);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
          this.logger.log(`Deleted image: ${filename}`, this.logContext);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Error deleting image ${filename}: ${errorMessage}`,
          undefined,
          this.logContext,
        );
      }
    }
  }

  /**
   * Get URL for uploaded image
   */
  getImageUrl(filename: string, folder: 'posts' | 'avatars' = 'posts'): string {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8000';
    return `${backendUrl}/uploads/${folder}/${filename}`;
  }
}
