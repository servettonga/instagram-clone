import { Injectable, BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import type { Request } from 'express';
import { ERROR_MESSAGES } from '../constants/messages';
import { getConfig } from '../../config/config';

@Injectable()
export class FileUploadService {
  private readonly config = getConfig();
  private uploadPath = this.config.uploadDir;
  private maxFileSize = this.config.maxFileSize;

  constructor() {
    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  getMulterOptions() {
    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = `${this.uploadPath}/avatars`;
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generate unique filename: timestamp-randomstring.ext
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          cb(null, `avatar-${uniqueSuffix}${ext}`);
        },
      }),
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

  getFileUrl(filename: string): string {
    // Return the full URL with the backend server
    return `${this.config.backendUrl}/uploads/avatars/${filename}`;
  }
}
