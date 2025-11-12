import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { INestApplicationContext } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly logger: Logger) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("✓ Connected to database");
  }

  enableShutdownHooks(app: INestApplicationContext): void {
    process.on("beforeExit", () => {
      void app.close();
    });
  }
}
