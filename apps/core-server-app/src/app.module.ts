import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

import { configValidationSchema } from './config/config.validation';
import { getConfig } from './config/config';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { CommentsModule } from './comments/comments.module';
import { ChatsModule } from './chats/chats.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env.production' : '.env',
      validationSchema: configValidationSchema,
      load: [getConfig],
    }),

    // PostgreSQL via Prisma
    PrismaModule,

    // MongoDB for messages (silence for now)
    MongooseModule.forRootAsync({
      useFactory: () => {
        const dbConfig = getConfig();
        console.log('Connecting to MongoDB:', dbConfig.mongodbUrl);
        return {
          uri: dbConfig.mongodbUrl,
        };
      },
    }),

    // TODO: Add Redis for caching and sessions
    // RedisModule.forRootAsync({...}),

    // Feature modules
    AuthModule,
    UsersModule,
    PostsModule,
    CommentsModule,
    ChatsModule,
    NotificationsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
