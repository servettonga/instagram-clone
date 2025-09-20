import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

import { configValidationSchema } from './config/config.validation';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? undefined : '../../.env',
      validationSchema: configValidationSchema,
      load: [getDatabaseConfig],
    }),

    // PostgreSQL via Prisma
    PrismaModule,

    // MongoDB for messages (silence for now)
    MongooseModule.forRootAsync({
      useFactory: () => {
        const dbConfig = getDatabaseConfig();
        console.log('Connecting to MongoDB:', dbConfig.mongodbUrl);
        return {
          uri: dbConfig.mongodbUrl,
        };
      },
    }),

    // TODO: Add Redis for caching and sessions
    // RedisModule.forRootAsync({...}),

    // Feature modules
    UsersModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
