import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { getDatabaseConfig } from '../config/database.config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const dbConfig = getDatabaseConfig();
    console.log('🔗 Connecting to PostgreSQL:', dbConfig.databaseUrl);

    super({
      datasources: {
        db: {
          url: dbConfig.databaseUrl,
        },
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
