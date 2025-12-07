import { Logger, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FileUploadService } from '../common/services/file-upload.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { StorageService } from '../common/services/storage.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: () => {
        // Create temporary instance for multer configuration
        const storageService = new StorageService();
        const fileUploadService = new FileUploadService(storageService);
        return fileUploadService.getMulterOptions();
      },
    }),
    PrismaModule,
    NotificationsModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    FileUploadService,
    ImageProcessingService,
    StorageService,
    Logger,
  ],
  exports: [UsersService],
})
export class UsersModule {}
