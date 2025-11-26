import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { MessagesService } from './services/messages.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatEventsModule } from '../realtime/chat-events.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PrismaModule, ChatEventsModule, PostsModule],
  controllers: [ChatsController],
  providers: [ChatsService, MessagesService],
  exports: [ChatsService, MessagesService],
})
export class ChatsModule {}
