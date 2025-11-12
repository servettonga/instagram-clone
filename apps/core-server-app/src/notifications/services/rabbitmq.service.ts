import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { ConfirmChannel } from 'amqplib';
import { getConfig } from '../../config/config';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from '@repo/shared-types';

/**
 * Low-level RabbitMQ connection and messaging service
 *
 * Manages the connection lifecycle to RabbitMQ and handles:
 * - Connection establishment with automatic reconnection
 * - Exchange and queue configuration
 * - Message publishing with persistence
 *
 * Used by NotificationProducerService to send messages to the queue.
 * Gracefully handles connection failures without crashing the app.
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: amqp.ChannelWrapper;
  private readonly logContext = RabbitMQService.name;

  constructor(private readonly logger: Logger) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const config = getConfig();
      const rabbitmqUrl = config.rabbitmqUrl;

      if (!rabbitmqUrl) {
        this.logger.warn(
          'RABBITMQ_URL not configured. Notifications will not be sent.',
          this.logContext,
        );
        return;
      }

      this.logger.log('Connecting to RabbitMQ...', this.logContext);

      this.connection = amqp.connect([rabbitmqUrl], {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on('connect', () => {
        this.logger.log('✓ Connected to RabbitMQ', this.logContext);
      });

      this.connection.on('disconnect', (err) => {
        this.logger.error(
          'Disconnected from RabbitMQ',
          err?.err,
          this.logContext,
        );
      });

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: ConfirmChannel) => {
          await this.setupExchangesAndQueues(channel);
        },
      });

      await this.channelWrapper.waitForConnect();
      this.logger.log('✓ RabbitMQ channel ready', this.logContext);
    } catch (error) {
      this.logger.error(
        'Failed to connect to RabbitMQ',
        error,
        this.logContext,
      );
      // Don't throw - allow app to start without RabbitMQ
    }
  }

  private async setupExchangesAndQueues(
    channel: ConfirmChannel,
  ): Promise<void> {
    // Declare exchange
    await channel.assertExchange(RABBITMQ_EXCHANGES.NOTIFICATIONS, 'topic', {
      durable: true,
    });

    // Declare queue
    await channel.assertQueue(RABBITMQ_QUEUES.NOTIFICATIONS, {
      durable: true,
    });

    // Bind queue to exchange
    await channel.bindQueue(
      RABBITMQ_QUEUES.NOTIFICATIONS,
      RABBITMQ_EXCHANGES.NOTIFICATIONS,
      RABBITMQ_ROUTING_KEYS.NOTIFICATION_CREATED,
    );

    this.logger.log(
      '✓ RabbitMQ exchanges and queues configured',
      this.logContext,
    );
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<void> {
    if (!this.channelWrapper) {
      this.logger.warn(
        'RabbitMQ not connected. Message not sent.',
        this.logContext,
      );
      return;
    }

    try {
      await this.channelWrapper.publish(exchange, routingKey, message, {
        persistent: true, // Don't lose if RabbitMQ crashes
      });
    } catch (error) {
      this.logger.error('Error publishing message', error, this.logContext);
      // Don't throw - allow app to continue
    }
  }

  private async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      await this.channelWrapper?.close();
      await this.connection.close();
      this.logger.log('Disconnected from RabbitMQ', this.logContext);
    } catch (error) {
      this.logger.error(
        'Error disconnecting from RabbitMQ',
        error,
        this.logContext,
      );
    }
  }
}
