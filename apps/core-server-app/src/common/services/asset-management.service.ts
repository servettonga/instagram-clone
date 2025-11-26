import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { ImageProcessingService } from './image-processing.service';
import { ERROR_MESSAGES } from '../constants/messages';
import { getConfig } from '../../config/config';

@Injectable()
export class AssetManagementService {
  private readonly config = getConfig();
  private maxImageSize = this.config.maxImageSize;

  constructor(
    private prisma: PrismaService,
    private imageProcessing: ImageProcessingService,
  ) {}

  /**
   * Get multer options for post image uploads
   * Using memory storage so Sharp can process the buffer
   */
  getPostImageMulterOptions() {
    return {
      storage: memoryStorage(),
      limits: {
        fileSize: this.maxImageSize,
      },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        // Only allow image files
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, gif, webp) are allowed',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    };
  }

  /**
   * Save asset metadata to database and process image
   */
  async createAsset(
    file: Express.Multer.File,
    userId: string | undefined,
    aspectRatio: string = '1:1',
  ): Promise<{
    id: string;
    fileName: string;
    filePath: string;
    thumbnailPath: string | null;
    mediumPath: string | null;
    fileType: string;
    fileSize: number;
    aspectRatio: string | null;
  }> {
    // Ensure user is authenticated
    if (!userId) {
      throw new BadRequestException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Process image with Sharp - generates 3 optimized versions
    const processedImages = await this.imageProcessing.processPostImage(
      file,
      aspectRatio,
    );

    // Get URLs for all versions
    const fullUrl = this.imageProcessing.getImageUrl(
      processedImages.full,
      'posts',
    );
    const thumbnailUrl = this.imageProcessing.getImageUrl(
      processedImages.thumbnail,
      'posts',
    );
    const mediumUrl = this.imageProcessing.getImageUrl(
      processedImages.medium,
      'posts',
    );

    // Save to database
    const asset = await this.prisma.asset.create({
      data: {
        fileName: file.originalname,
        filePath: fullUrl,
        thumbnailPath: thumbnailUrl,
        mediumPath: mediumUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        aspectRatio: aspectRatio,
        orderIndex: 0,
        createdBy: userId,
      },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        thumbnailPath: true,
        mediumPath: true,
        fileType: true,
        fileSize: true,
        aspectRatio: true,
      },
    });

    return asset;
  }

  /**
   * Delete asset from database and filesystem
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        filePath: true,
        thumbnailPath: true,
        mediumPath: true,
        postAssets: {
          select: { postId: true },
        },
        messageAssets: {
          select: { messageId: true },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException(ERROR_MESSAGES.ASSET_NOT_FOUND(assetId));
    }

    // Check if asset is still in use
    if (asset.postAssets.length > 0 || asset.messageAssets.length > 0) {
      throw new BadRequestException(ERROR_MESSAGES.ASSET_IN_USE);
    }

    // Delete from database
    await this.prisma.asset.delete({
      where: { id: assetId },
    });

    // Delete all image variants from filesystem
    const filenames: string[] = [];
    if (asset.filePath) {
      const filename = asset.filePath.split('/').pop();
      if (filename) filenames.push(filename);
    }
    if (asset.thumbnailPath && typeof asset.thumbnailPath === 'string') {
      const filename = asset.thumbnailPath.split('/').pop();
      if (filename) filenames.push(filename);
    }
    if (asset.mediumPath && typeof asset.mediumPath === 'string') {
      const filename = asset.mediumPath.split('/').pop();
      if (filename) filenames.push(filename);
    }

    if (filenames.length > 0) {
      this.imageProcessing.deleteImages(filenames);
    }
  }

  /**
   * Get full URL fro an asset
   */
  getAssetUrl(filePath: string): string {
    return `${this.config.backendUrl}${filePath}`;
  }

  /**
   * Validate that assets exist and belong to the user
   */
  async validateAssets(assetIds: string[], userId: string): Promise<void> {
    const assets = await this.prisma.asset.findMany({
      where: {
        id: { in: assetIds },
      },
      select: {
        id: true,
        createdBy: true,
      },
    });

    if (assets.length !== assetIds.length) {
      throw new BadRequestException(ERROR_MESSAGES.ASSETS_NOT_FOUND);
    }

    // Check if user owns all assets
    const invalidAssets = assets.filter((asset) => asset.createdBy !== userId);
    if (invalidAssets.length > 0) {
      throw new BadRequestException(ERROR_MESSAGES.INVALID_ASSET_OWNER);
    }
  }

  /**
   * Clean up orphaned assets (assets not linked to any post or message)
   * To be run periodically via a cron job
   */
  async cleanupOrphanedAssets(): Promise<number> {
    const orphanedAssets = await this.prisma.asset.findMany({
      where: {
        AND: [{ postAssets: { none: {} } }, { messageAssets: { none: {} } }],
        createdAt: {
          // Only cleanup assets older tan 24 hours
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true,
        filePath: true,
        thumbnailPath: true,
        mediumPath: true,
      },
    });

    let deletedCount = 0;

    for (const asset of orphanedAssets) {
      try {
        // Delete from database
        await this.prisma.asset.delete({
          where: { id: asset.id },
        });

        // Extract all filenames for deletion
        const filenames: string[] = [];
        const fullFilename = asset.filePath.split('/').pop();
        if (fullFilename) filenames.push(fullFilename);

        if (asset.thumbnailPath && typeof asset.thumbnailPath === 'string') {
          const thumbFilename = asset.thumbnailPath.split('/').pop();
          if (thumbFilename) filenames.push(thumbFilename);
        }

        if (asset.mediumPath && typeof asset.mediumPath === 'string') {
          const mediumFilename = asset.mediumPath.split('/').pop();
          if (mediumFilename) filenames.push(mediumFilename);
        }

        // Delete from filesystem
        if (filenames.length > 0) {
          this.imageProcessing.deleteImages(filenames);
        }

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete orphaned asset ${asset.id}:`, error);
      }
    }
    return deletedCount;
  }
}
