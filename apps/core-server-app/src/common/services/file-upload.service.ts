import { Injectable, BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { ERROR_MESSAGES } from '../constants/messages';
import { getConfig } from '../../config/config';
import { StorageService } from './storage.service';

@Injectable()
export class FileUploadService {
  private readonly config = getConfig();
  private maxFileSize = this.config.maxFileSize;

  constructor(private readonly storageService: StorageService) {}

  /**
   * Get Multer options for avatar uploads
   * Uses memory storage - files are processed and uploaded via StorageService
   */
  getMulterOptions() {
    return {
      storage: memoryStorage(),
      limits: {
        fileSize: this.maxFileSize,
      },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        // Only allow image files
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException(ERROR_MESSAGES.INVALID_FILE_TYPE), false);
          return;
        }
        cb(null, true);
      },
    };
  }

  /**
   * Get public URL for an avatar file
   * Delegates to StorageService for correct URL based on environment
   */
  getFileUrl(filename: string): string {
    return this.storageService.getFullUrl(`avatars/${filename}`);
  }
}
