import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { PrismaService } from '../../prisma/prisma.service';
import { ERROR_MESSAGES } from '../constants/messages';

@Injectable()
export class AssetManagementService {
  private uploadPath = process.env.UPLOAD_DIR || './uploads';
  private maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
  private maxImageSize = parseInt(process.env.MAX_IMAGE_SIZE || '10485760'); // 10MB
  // For video support:
  // private maxVideoSize = parseInt(process.env.MAX_VIDEO_SIZE || '104857600'); // 100MB

  constructor(private prisma: PrismaService) {
    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Get multer options for post image uploads
   */
  getPostImageMulterOptions() {
    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = `${this.uploadPath}/posts`;
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generate unique filename: post-timestamp-randomstring.ext
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          cb(null, `post-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: this.maxImageSize,
      },
      fileFilter: (req, file, cb) => {
        // Only allow image files
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          cb(
            new BadRequestException(
              'Only image files (jpg, jpeg, png, gif, webp) are allowed',
            ),
            false,
          );
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        cb(null, true);
      },
    };
  }

  /**
   * Save asset metadata to database
   */
  async createAsset(
    file: Express.Multer.File,
    userId: string | undefined,
  ): Promise<{
    id: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: number;
  }> {
    // Ensure user is authenticated
    if (!userId) {
      // Delete uploaded file if user is not authenticated
      try {
        const fullPath = `${this.uploadPath}/posts/${file.filename}`;
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }
      } catch (error) {
        console.error('Failed to delete unauthorized upload:', error);
      }
      throw new BadRequestException(ERROR_MESSAGES.UNAUTHORIZED);
    }

    // Store relative path from uploads directory
    const relativePath = `/uploads/posts/${file.filename}`;

    try {
      const asset = await this.prisma.asset.create({
        data: {
          fileName: file.originalname,
          filePath: relativePath,
          fileType: file.mimetype,
          fileSize: file.size,
          orderIndex: 0,
          createdBy: userId,
        },
        select: {
          id: true,
          fileName: true,
          filePath: true,
          fileType: true,
          fileSize: true,
        },
      });

      return asset;
    } catch (error) {
      // Delete uploaded file if Prisma operation fails
      try {
        const fullPath = `${this.uploadPath}/posts/${file.filename}`;
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }
      } catch (deleteError) {
        console.error(
          'Failed to cleanup file after failed asset creation:',
          deleteError,
        );
      }
      throw error;
    }
  }

  /**
   * Delete asset from database and filesystem
   */
  async deleteAsset(assetId: string): Promise<void> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      select: {
        filePath: true,
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

    // Delete from filesystem
    try {
      const fullPath = `${this.uploadPath}${asset.filePath.replace('/uploads', '')}`;
      if (existsSync(fullPath)) {
        unlinkSync(fullPath);
      }
    } catch (error) {
      console.error('Failed to delete file from filesystem:', error);
      // Don't throw error here, as database deletion was successful
    }
  }

  /**
   * Get full URL fro an asset
   */
  getAssetUrl(filePath: string): string {
    const backendUrl = process.env.CORE_SERVICE_URL || 'http://localhost:8000';
    return `${backendUrl}${filePath}`;
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
      },
    });

    let deletedCount = 0;

    for (const asset of orphanedAssets) {
      try {
        // Delete from database
        await this.prisma.asset.delete({
          where: { id: asset.id },
        });

        // Delete from filesystem
        const fullPath = `${this.uploadPath}${asset.filePath.replace('/uploads', '')}`;
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
        }

        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete orphaned asset ${asset.id}:`, error);
      }
    }
    return deletedCount;
  }
}
