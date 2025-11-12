import { Module, Logger } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { NotificationsService } from './notifications.service';
import { RabbitMQService } from './services/rabbitmq.service';
import { NotificationProducerService } from './services/notification-producer.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { EmailTemplateService } from './templates/email-template.service';

@Module({
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    RabbitMQService,
    NotificationProducerService,
    NotificationPreferencesService,
    EmailTemplateService,
    Logger,
  ],
  exports: [
    NotificationProducerService,
    NotificationPreferencesService,
    NotificationsService,
  ],
})
export class NotificationsModule {}
