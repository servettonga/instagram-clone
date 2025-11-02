import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AssetManagementService } from '../common/services/asset-management.service';
import { ImageProcessingService } from '../common/services/image-processing.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MulterModule.registerAsync({
      useFactory: () => {
        // Create a temporary instance just for the multer options
        // The actual service will be properly injected via providers
        const imageProcessing = new ImageProcessingService();
        const assetService = new AssetManagementService(
          null as any,
          imageProcessing,
        );
        return assetService.getPostImageMulterOptions();
      },
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService, AssetManagementService, ImageProcessingService],
  exports: [PostsService, AssetManagementService, ImageProcessingService],
})
export class PostsModule {}
