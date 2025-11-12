import { Module, Logger } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { configValidationSchema } from "./config/env.validation";
import { getConfig } from "./config/app.config";
import { PrismaService } from "./services/prisma.service";
import { RabbitMQService } from "./services/rabbitmq.service";
import { NotificationService } from "./services/notification.service";
import { EmailService } from "./services/email.service";
import { EmailTemplateService } from "./templates/email-template.service";
import { NotificationConsumer } from "./consumers/notification.consumer";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env.production" : ".env",
      validationSchema: configValidationSchema,
      load: [getConfig],
    }),
  ],
  providers: [
    {
      provide: Logger,
      useFactory: () => new Logger(),
    },
    PrismaService,
    RabbitMQService,
    NotificationService,
    EmailService,
    EmailTemplateService,
    NotificationConsumer,
  ],
})
export class AppModule {}
