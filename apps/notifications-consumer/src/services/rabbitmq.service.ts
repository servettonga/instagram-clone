import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import * as amqp from "amqp-connection-manager";
import { ConfirmChannel } from "amqplib";
import { getConfig } from "../config/app.config";
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_QUEUES,
  RABBITMQ_ROUTING_KEYS,
} from "@repo/shared-types";

/**
 * RabbitMQ connection and message consumption service (consumer side)
 *
 * Manages:
 * - Connection to RabbitMQ with automatic reconnection
 * - Exchange and queue setup (matching producer configuration)
 * - Message consumption with automatic acknowledgment
 * - Graceful shutdown and cleanup
 *
 * Provides the consume() method used by NotificationConsumer
 * to process messages from the queue.
 */
@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.AmqpConnectionManager;
  private channelWrapper: amqp.ChannelWrapper;

  constructor(private readonly logger: Logger) {}

  async onModuleInit() {
    await this.connect(); // Connect on startup
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const config = getConfig();
      this.logger.log("Connecting to RabbitMQ...");

      this.connection = amqp.connect([config.rabbitmqUrl], {
        heartbeatIntervalInSeconds: 30,
        reconnectTimeInSeconds: 5,
      });

      this.connection.on("connect", () => {
        this.logger.log("✓ Connected to RabbitMQ");
      });

      this.connection.on("disconnect", (err) => {
        this.logger.error("Disconnected from RabbitMQ", err?.err);
      });

      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel: ConfirmChannel) => {
          await this.setupExchangesAndQueues(channel);
        },
      });

      await this.channelWrapper.waitForConnect();
      this.logger.log("✓ RabbitMQ channel ready");
    } catch (error) {
      this.logger.error("Failed to connect to RabbitMQ", error);
      throw error;
    }
  }

  private async setupExchangesAndQueues(
    channel: ConfirmChannel,
  ): Promise<void> {
    // Declare exchange
    await channel.assertExchange(
      RABBITMQ_EXCHANGES.NOTIFICATIONS,
      "topic",
      { durable: true }, // Survives RabbitMQ restart
    );

    // Declare queue
    await channel.assertQueue(RABBITMQ_QUEUES.NOTIFICATIONS, {
      durable: true, // Survives RabbitMQ restart
    });

    // Bind queue to exchange for standard notifications
    await channel.bindQueue(
      RABBITMQ_QUEUES.NOTIFICATIONS, // Queue
      RABBITMQ_EXCHANGES.NOTIFICATIONS, // Exchange
      RABBITMQ_ROUTING_KEYS.NOTIFICATION_CREATED, // Pattern (matches notification.created)
    );

    // Bind queue to exchange for password reset emails
    await channel.bindQueue(
      RABBITMQ_QUEUES.NOTIFICATIONS, // Queue
      RABBITMQ_EXCHANGES.NOTIFICATIONS, // Exchange
      RABBITMQ_ROUTING_KEYS.PASSWORD_RESET, // Pattern (matches email.password_reset)
    );

    this.logger.log("✓ RabbitMQ exchanges and queues configured");
  }

  // Start listening for messages
  async consume<T = unknown>(
    queue: string,
    onMessage: (content: T) => Promise<void>,
  ): Promise<void> {
    // Wait for channel to be ready before setting up consumer
    await this.channelWrapper.waitForConnect();

    await this.channelWrapper.addSetup(async (channel: ConfirmChannel) => {
      // Ensure queue exists before consuming
      await channel.assertQueue(queue, { durable: true });

      await channel.consume(
        queue,
        (msg) => {
          if (msg) {
            void (async () => {
              try {
                const content = JSON.parse(msg.content.toString()) as T;
                await onMessage(content);
                channel.ack(msg);
              } catch (error) {
                this.logger.error("Error processing message:", error);
                if (error instanceof Error) {
                  this.logger.error("Error stack:", error.stack);
                }
                // Reject and don't requeue if message is malformed
                channel.nack(msg, false, false);
              }
            })();
          }
        },
        { noAck: false },
      );
    });

    this.logger.log(`✓ Consuming messages from queue: ${queue}`);
  }

  async publish(
    exchange: string,
    routingKey: string,
    message: any,
  ): Promise<void> {
    try {
      await this.channelWrapper.publish(exchange, routingKey, message, {
        persistent: true,
      });
    } catch (error) {
      this.logger.error("Error publishing message", error);
      throw error;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      await this.channelWrapper.close();
      await this.connection.close();
      this.logger.log("Disconnected from RabbitMQ");
    } catch (error) {
      this.logger.error("Error disconnecting from RabbitMQ", error);
    }
  }
}
