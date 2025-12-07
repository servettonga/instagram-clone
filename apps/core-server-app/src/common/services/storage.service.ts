import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { getConfig } from '../../config/config';

export interface StorageUploadResult {
  /** The path/key where the file was stored */
  key: string;
  /** The public URL to access the file */
  url: string;
}

/**
 * Storage service abstraction for file uploads
 * - Development: Uses local filesystem
 * - Production: Uses Cloudflare R2 (S3-compatible)
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly config = getConfig();
  private s3Client: S3Client | null = null;

  async onModuleInit() {
    if (this.isR2Enabled()) {
      this.initializeR2Client();
      await this.verifyR2Connection();
    } else {
      this.logger.log('Using local filesystem storage (development mode)');
    }
  }

  /**
   * Check if R2 storage is enabled (production with valid credentials)
   */
  isR2Enabled(): boolean {
    return (
      this.config.storage.type === 'r2' &&
      !!this.config.storage.r2.endpoint &&
      !!this.config.storage.r2.accessKeyId &&
      !!this.config.storage.r2.secretAccessKey &&
      !!this.config.storage.r2.bucket
    );
  }

  /**
   * Initialize Cloudflare R2 client
   */
  private initializeR2Client(): void {
    const { endpoint, accessKeyId, secretAccessKey } = this.config.storage.r2;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.logger.log('Cloudflare R2 client initialized');
  }

  /**
   * Verify R2 connection by checking bucket exists
   */
  private async verifyR2Connection(): Promise<void> {
    if (!this.s3Client) return;

    try {
      await this.s3Client.send(
        new HeadBucketCommand({ Bucket: this.config.storage.r2.bucket }),
      );
      this.logger.log(
        `Connected to R2 bucket: ${this.config.storage.r2.bucket}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to connect to R2 bucket: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - allow fallback to local storage or graceful degradation
    }
  }

  /**
   * Upload a file buffer to storage
   * @param buffer - File buffer to upload
   * @param key - Storage key/path (e.g., "posts/image-123.webp")
   * @param contentType - MIME type of the file
   */
  async upload(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    if (this.isR2Enabled() && this.s3Client) {
      return this.uploadToR2(buffer, key, contentType);
    }
    return this.uploadToLocal(buffer, key);
  }

  /**
   * Upload to Cloudflare R2
   */
  private async uploadToR2(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<StorageUploadResult> {
    const { bucket, publicUrl } = this.config.storage.r2;

    try {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000', // 1 year cache
        }),
      );

      const url = `${publicUrl}/${key}`;
      this.logger.debug(`Uploaded to R2: ${key}`);

      return { key, url };
    } catch (error) {
      this.logger.error(
        `R2 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new Error('Failed to upload file to storage');
    }
  }

  /**
   * Upload to local filesystem
   */
  private uploadToLocal(buffer: Buffer, key: string): StorageUploadResult {
    const uploadDir = this.config.uploadDir;
    const filePath = join(uploadDir, key);
    const dirPath = join(uploadDir, key.substring(0, key.lastIndexOf('/')));

    // Ensure directory exists
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    writeFileSync(filePath, buffer);

    // Return local URL path
    const url = `/uploads/${key}`;
    this.logger.debug(`Saved locally: ${filePath}`);

    return { key, url };
  }

  /**
   * Delete a file from storage
   * @param key - Storage key/path to delete
   */
  async delete(key: string): Promise<void> {
    if (this.isR2Enabled() && this.s3Client) {
      await this.deleteFromR2(key);
    } else {
      this.deleteFromLocal(key);
    }
  }

  /**
   * Delete from Cloudflare R2
   */
  private async deleteFromR2(key: string): Promise<void> {
    try {
      await this.s3Client!.send(
        new DeleteObjectCommand({
          Bucket: this.config.storage.r2.bucket,
          Key: key,
        }),
      );
      this.logger.debug(`Deleted from R2: ${key}`);
    } catch (error) {
      this.logger.error(
        `R2 delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Don't throw - file might not exist
    }
  }

  /**
   * Delete from local filesystem
   */
  private deleteFromLocal(key: string): void {
    const filePath = join(this.config.uploadDir, key);

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        this.logger.debug(`Deleted locally: ${filePath}`);
      }
    } catch (error) {
      this.logger.error(
        `Local delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Get the public URL for a stored file
   * @param key - Storage key/path
   */
  getPublicUrl(key: string): string {
    if (this.isR2Enabled()) {
      return `${this.config.storage.r2.publicUrl}/${key}`;
    }
    // Local: return path that will be served by Express static
    return `/uploads/${key}`;
  }

  /**
   * Get full URL including backend domain (for database storage)
   * @param key - Storage key/path
   */
  getFullUrl(key: string): string {
    if (this.isR2Enabled()) {
      return `${this.config.storage.r2.publicUrl}/${key}`;
    }
    // Local: include backend URL for absolute path
    return `${this.config.backendUrl}/uploads/${key}`;
  }
}
