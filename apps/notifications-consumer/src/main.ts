import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { PrismaService } from "./services/prisma.service";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ["log", "error", "warn", "debug"],
    });

    // Enable graceful shutdown
    const prismaService = app.get(PrismaService);
    prismaService.enableShutdownHooks(app);

    // Handle shutdown signals
    process.on("SIGTERM", () => {
      logger.log("SIGTERM received, shutting down gracefully...");
      void app.close();
    });

    process.on("SIGINT", () => {
      logger.log("SIGINT received, shutting down gracefully...");
      void app.close();
    });

    await app.init();

    logger.log("✓ Notifications Consumer is running");
    logger.log("✓ Listening for notification events...");
  } catch (error) {
    logger.error("Failed to start application", error);
    process.exit(1);
  }
}

void bootstrap();
