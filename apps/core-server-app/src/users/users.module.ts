import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FileUploadService } from '../common/services/file-upload.service';
import { GuardsModule } from '../common/guards/guards.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: () => {
        const fileUploadService = new FileUploadService();
        return fileUploadService.getMulterOptions();
      },
    }),
    GuardsModule, // Import guards from common module instead of AuthModule
  ],
  controllers: [UsersController],
  providers: [UsersService, FileUploadService],
  exports: [UsersService],
})
export class UsersModule {}
