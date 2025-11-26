import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { NotificationPreferences } from '@prisma/client';
import { NotificationType } from '@repo/shared-types';

/**
 * Database service for managing user notification preferences
 *
 * Handles CRUD operations for NotificationPreferences model:
 * - Creating default preferences for new users
 * - Fetching user preferences
 * - Updating preference settings
 * - Checking if notifications should be sent (before publishing to queue)
 *
 * Default preferences: all web notifications enabled,
 * like emails disabled (to reduce spam).
 */
@Injectable()
export class NotificationPreferencesService {
  private readonly logContext = NotificationPreferencesService.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Get or create preferences with defaults
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      try {
        // Create default preferences (all enabled)
        preferences = await this.prisma.notificationPreferences.create({
          data: { userId },
        });
      } catch (error) {
        // Race condition: another request created it simultaneously
        // Silently fetch the newly created preferences
        preferences = await this.prisma.notificationPreferences.findUnique({
          where: { userId },
        });

        if (!preferences) {
          throw error; // Re-throw if it's a different error
        }
      }
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    // Ensure preferences exist
    await this.getPreferences(userId);

    // Update preferences
    const updated = await this.prisma.notificationPreferences.update({
      where: { userId },
      data: dto,
    });

    return updated;
  }

  /**
   * Check if user should receive web notification for this type
   * Called by NotificationProducerService before publishing to queue
   */
  async shouldSendWebNotification(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      switch (type) {
        case NotificationType.FOLLOW_REQUEST:
        case NotificationType.FOLLOW_ACCEPTED:
          return preferences.followWeb;
        case NotificationType.POST_LIKE:
        case NotificationType.COMMENT_LIKE:
          return preferences.likeWeb;
        case NotificationType.POST_COMMENT:
          return preferences.commentWeb;
        case NotificationType.COMMENT_REPLY:
          return preferences.replyWeb;
        case NotificationType.MENTION:
          return preferences.mentionWeb;
        default:
          return true; // Default to enabled for SYSTEM notifications
      }
    } catch (error) {
      this.logger.error(
        `Error checking web notification preference for user ${userId}`,
        error,
        this.logContext,
      );
      return true; // Fallback to sending if error
    }
  }

  /**
   * Check if user should receive email notification for this type
   * Called by NotificationProducerService before publishing to queue
   */
  async shouldSendEmailNotification(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    try {
      const preferences = await this.getPreferences(userId);

      switch (type) {
        case NotificationType.FOLLOW_REQUEST:
        case NotificationType.FOLLOW_ACCEPTED:
          return preferences.followEmail;
        case NotificationType.POST_LIKE:
        case NotificationType.COMMENT_LIKE:
          return preferences.likeEmail;
        case NotificationType.POST_COMMENT:
          return preferences.commentEmail;
        case NotificationType.COMMENT_REPLY:
          return preferences.replyEmail;
        case NotificationType.MENTION:
          return preferences.mentionEmail;
        default:
          return false; // Don't send emails for SYSTEM notifications
      }
    } catch (error) {
      this.logger.error(
        `Error checking email notification preference for user ${userId}`,
        error,
        this.logContext,
      );
      return false; // Fallback to not sending email if error
    }
  }
}
