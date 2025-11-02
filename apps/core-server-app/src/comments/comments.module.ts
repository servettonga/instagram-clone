import { Module } from '@nestjs/common';
import {
  CommentsController,
  CommentsManagementController,
} from './comments.controller';
import { CommentsService } from './comments.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommentsController, CommentsManagementController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
