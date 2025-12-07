import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { getConfig } from '../../config/config';
import { StorageService } from './storage.service';

export interface ProcessedImages {
  thumbnail: string;
  medium: string;
  full: string;
}

@Injectable()
export class ImageProcessingService {
  private readonly logContext = ImageProcessingService.name;
  private readonly config = getConfig();

  constructor(
    private readonly logger: Logger,
    private readonly storageService: StorageService,
  ) {}

  /**
   * Process uploaded image and generate three optimized versions
   * - Thumbnail: 150×150 for profile grids
   * - Medium: 640×640 for feed display
   * - Full: 1080×1080 max for post page/modal
   *
   * In development: saves to local filesystem
   * In production: uploads to Cloudflare R2
   */
  async processPostImage(
    file: Express.Multer.File,
    aspectRatio: string = '1:1',
    folder: 'posts' | 'messages' = 'posts',
  ): Promise<ProcessedImages> {
    const prefix = folder === 'messages' ? 'msg' : 'post';
    const baseFilename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    try {
      // Calculate dimensions based on aspect ratio
      const dimensions = this.getAspectDimensions(aspectRatio);

      // Process images in parallel with Sharp (in-memory)
      const [thumbBuffer, mediumBuffer, fullBuffer] = await Promise.all([
        // Thumbnail: Always square 150×150 for grids
        sharp(file.buffer)
          .resize(150, 150, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toBuffer(),

        // Medium: Sized for aspect ratio, max 640px width
        sharp(file.buffer)
          .resize(dimensions.medium.width, dimensions.medium.height, {
            fit: 'cover',
            position: 'center',
          })
          .webp({ quality: 85 })
          .toBuffer(),

        // Full: Sized for aspect ratio, max 1080px width
        sharp(file.buffer)
          .resize(dimensions.full.width, dimensions.full.height, {
            fit: 'inside', // Preserve aspect ratio
          })
          .webp({ quality: 90 })
          .toBuffer(),
      ]);

      // Upload all versions to storage (local or R2)
      await Promise.all([
        this.storageService.upload(
          thumbBuffer,
          `${folder}/${baseFilename}-thumb.webp`,
          'image/webp',
        ),
        this.storageService.upload(
          mediumBuffer,
          `${folder}/${baseFilename}-medium.webp`,
          'image/webp',
        ),
        this.storageService.upload(
          fullBuffer,
          `${folder}/${baseFilename}-full.webp`,
          'image/webp',
        ),
      ]);

      this.logger.log(
        `Successfully processed and uploaded image: ${baseFilename}`,
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
   * Process avatar image - always square 150×150
   * Returns the filename for database storage
   */
  async processAvatar(file: Express.Multer.File): Promise<string> {
    const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;

    try {
      // Generate 150×150 avatar
      const avatarBuffer = await sharp(file.buffer)
        .resize(150, 150, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();

      // Upload to storage (local or R2)
      await this.storageService.upload(
        avatarBuffer,
        `avatars/${filename}`,
        'image/webp',
      );

      this.logger.log(
        `Successfully processed and uploaded avatar: ${filename}`,
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
   * Delete processed images from storage
   */
  async deleteImages(
    filenames: string[],
    folder: 'posts' | 'avatars' | 'messages' = 'posts',
  ): Promise<void> {
    for (const filename of filenames) {
      try {
        await this.storageService.delete(`${folder}/${filename}`);
        this.logger.log(`Deleted image: ${filename}`, this.logContext);
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
   * Uses storage service to return correct URL based on environment
   */
  getImageUrl(filename: string, folder: 'posts' | 'avatars' | 'messages' = 'posts'): string {
    return this.storageService.getPublicUrl(`${folder}/${filename}`);
  }
}
