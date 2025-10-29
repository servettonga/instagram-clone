import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AssetManagementService } from '../common/services/asset-management.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MulterModule.registerAsync({
      useFactory: () => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const assetService = new AssetManagementService(null as any);
        return assetService.getPostImageMulterOptions();
      },
    }),
  ],
  controllers: [PostsController],
  providers: [PostsService, AssetManagementService],
  exports: [PostsService, AssetManagementService],
})
export class PostsModule {}
