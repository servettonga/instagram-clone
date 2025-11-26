import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { NotificationPreferencesService } from '../notification-preferences.service';
import {
  RABBITMQ_EXCHANGES,
  RABBITMQ_ROUTING_KEYS,
  NotificationPayload,
  NotificationType,
} from '@repo/shared-types';

/**
 * High-level service for producing notification events
 *
 * Checks user preferences BEFORE publishing to queue to avoid wasting resources.
 * Only sends notification events if user has that type enabled.
 *
 * Provides convenient methods for different notification types.
 * Publishes notification payloads to RabbitMQ, which are consumed
 * by the notifications-consumer service for processing.
 *
 * Used by domain services (posts, comments, users) to trigger
 * notifications when user actions occur.
 */
@Injectable()
export class NotificationProducerService {
  constructor(
    private readonly rabbitMQService: RabbitMQService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly logger: Logger,
  ) {}

  // Set logger context for better log identification
  private readonly logContext = NotificationProducerService.name;

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // Check user preferences BEFORE publishing to queue
      const [shouldSendWeb, shouldSendEmail] = await Promise.all([
        this.preferencesService.shouldSendWebNotification(
          payload.userId,
          payload.type,
        ),
        this.preferencesService.shouldSendEmailNotification(
          payload.userId,
          payload.type,
        ),
      ]);

      // Skip if user has both disabled
      if (!shouldSendWeb && !shouldSendEmail) {
        return;
      }

      // Add preference flags to payload
      const enrichedPayload: NotificationPayload = {
        ...payload,
        sendWeb: shouldSendWeb,
        sendEmail: shouldSendEmail,
      };

      await this.rabbitMQService.publish(
        RABBITMQ_EXCHANGES.NOTIFICATIONS,
        RABBITMQ_ROUTING_KEYS.NOTIFICATION_CREATED,
        enrichedPayload,
      );
    } catch (error) {
      this.logger.error('Failed to send notification', error, this.logContext);
      // Don't throw - allow the main operation to succeed
    }
  }

  // Convenience methods for specific notification types

  async notifyFollowRequest(
    userId: string,
    actorId: string,
    actorUsername: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.FOLLOW_REQUEST,
      title: 'New Follow Request',
      message: `${actorUsername} requested to follow you`,
      entityType: 'profile',
      entityId: actorId,
      actorId,
      metadata: { actorUsername },
    });
  }

  async notifyFollowAccepted(
    userId: string,
    actorId: string,
    actorUsername: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.FOLLOW_ACCEPTED,
      title: 'Follow Request Accepted',
      message: `${actorUsername} accepted your follow request`,
      entityType: 'profile',
      entityId: actorId,
      actorId,
      metadata: { actorUsername },
    });
  }

  async notifyNewFollower(
    userId: string,
    actorId: string,
    actorUsername: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.FOLLOW_ACCEPTED, // Reuse FOLLOW_ACCEPTED type for new followers
      title: 'New Follower',
      message: `${actorUsername} started following you`,
      entityType: 'profile',
      entityId: actorId,
      actorId,
      metadata: { actorUsername },
    });
  }

  async notifyPostLike(
    userId: string,
    postId: string,
    actorId: string,
    actorUsername: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.POST_LIKE,
      title: 'New Like on Your Post',
      message: `${actorUsername} liked your post`,
      entityType: 'post',
      entityId: postId,
      actorId,
      metadata: { actorUsername, postId },
    });
  }

  async notifyPostComment(
    userId: string,
    postId: string,
    commentId: string,
    actorId: string,
    actorUsername: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.POST_COMMENT,
      title: 'New Comment on Your Post',
      message: `${actorUsername} commented on your post`,
      entityType: 'comment',
      entityId: commentId,
      actorId,
      metadata: {
        postId,
        actorUsername,
      },
    });
  }

  async notifyCommentLike(
    userId: string,
    commentId: string,
    actorId: string,
    actorUsername: string,
    postId?: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.COMMENT_LIKE,
      title: 'New Like on Your Comment',
      message: `${actorUsername} liked your comment`,
      entityType: 'comment',
      entityId: commentId,
      actorId,
      metadata: {
        actorUsername,
        ...(postId && { postId }),
      },
    });
  }

  async notifyCommentReply(
    userId: string,
    commentId: string,
    replyId: string,
    actorId: string,
    actorUsername: string,
    postId?: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.COMMENT_REPLY,
      title: 'New Reply to Your Comment',
      message: `${actorUsername} replied to your comment`,
      entityType: 'comment',
      entityId: replyId,
      actorId,
      metadata: {
        parentCommentId: commentId,
        actorUsername,
        ...(postId && { postId }),
      },
    });
  }

  async notifyMention(
    userId: string,
    entityType: 'post' | 'comment',
    entityId: string,
    actorId: string,
    actorUsername: string,
    postId?: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: NotificationType.MENTION,
      title: `Mentioned in a ${entityType}`,
      message: `${actorUsername} mentioned you in a ${entityType}`,
      entityType,
      entityId,
      actorId,
      metadata: {
        actorUsername,
        ...(postId && { postId }),
      },
    });
  }

  /**
   * Send password reset email (bypasses preferences - always send)
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetUrl: string,
  ): Promise<void> {
    try {
      // Send directly to email queue - bypass user preferences for security emails
      await this.rabbitMQService.publish(
        RABBITMQ_EXCHANGES.NOTIFICATIONS,
        RABBITMQ_ROUTING_KEYS.PASSWORD_RESET,
        {
          email,
          username,
          resetUrl,
          type: 'password_reset',
        },
      );

      this.logger.log(
        `Password reset email queued for ${email}`,
        this.logContext,
      );
    } catch (error) {
      this.logger.error(
        'Failed to queue password reset email',
        error,
        this.logContext,
      );
      // Don't throw - silently fail to prevent account enumeration
    }
  }
}
