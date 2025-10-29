import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FileUploadService } from '../common/services/file-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      useFactory: () => {
        const fileUploadService = new FileUploadService();
        return fileUploadService.getMulterOptions();
      },
    }),
    PrismaModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, FileUploadService],
  exports: [UsersService],
})
export class UsersModule {}
