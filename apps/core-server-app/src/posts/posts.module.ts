import { Logger, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AssetManagementService } from '../common/services/asset-management.service';
import { ImageProcessingService } from '../common/services/image-processing.service';
import { StorageService } from '../common/services/storage.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationsModule,
    MulterModule.registerAsync({
      imports: [PrismaModule],
      useFactory: (prisma: PrismaService) => {
        // Create temporary instances for multer configuration
        const mockLogger = new Logger('MulterConfig');
        const storageService = new StorageService();
        const imageProcessing = new ImageProcessingService(
          mockLogger,
          storageService,
        );
        const assetService = new AssetManagementService(
          prisma,
          imageProcessing,
        );
        return assetService.getPostImageMulterOptions();
      },
      inject: [PrismaService],
    }),
  ],
  controllers: [PostsController],
  providers: [
    PostsService,
    AssetManagementService,
    ImageProcessingService,
    StorageService,
    Logger,
  ],
  exports: [
    PostsService,
    AssetManagementService,
    ImageProcessingService,
    StorageService,
  ],
})
export class PostsModule {}
