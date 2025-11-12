import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { NotificationType } from "@repo/shared-types";

/**
 * Service for checking user notification preferences (consumer side)
 *
 * Determines whether to send web/email notifications based on:
 * - User's saved preferences in database
 * - Notification type (like, comment, follow, etc.)
 * - Default preferences if user has none configured
 *
 * Creates default preferences on first use for new users.
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  /**
   * Check if user should receive web notification for this type
   */
  async shouldSendWebNotification(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    try {
      const preferences = await this.getOrCreatePreferences(userId);

      switch (type) {
        case NotificationType.FOLLOW_REQUEST:
        case NotificationType.FOLLOW_ACCEPTED:
          return preferences.followWeb;
        case NotificationType.POST_LIKE:
        case NotificationType.COMMENT_LIKE:
          return preferences.likeWeb;
        case NotificationType.POST_COMMENT:
        case NotificationType.COMMENT_REPLY:
          return preferences.commentWeb;
        case NotificationType.MENTION:
          return preferences.mentionWeb;
        default:
          return true; // Default to true for SYSTEM notifications
      }
    } catch (error) {
      this.logger.error(
        `Error checking web notification preference for user ${userId}`,
        error,
      );
      return true; // Fallback to sending if error
    }
  }

  /**
   * Check if user should receive email notification for this type
   */
  async shouldSendEmailNotification(
    userId: string,
    type: NotificationType,
  ): Promise<boolean> {
    try {
      const preferences = await this.getOrCreatePreferences(userId);

      switch (type) {
        case NotificationType.FOLLOW_REQUEST:
        case NotificationType.FOLLOW_ACCEPTED:
          return preferences.followEmail;
        case NotificationType.POST_LIKE:
        case NotificationType.COMMENT_LIKE:
          return preferences.likeEmail;
        case NotificationType.POST_COMMENT:
        case NotificationType.COMMENT_REPLY:
          return preferences.commentEmail;
        case NotificationType.MENTION:
          return preferences.mentionEmail;
        default:
          return false; // Don't send emails for SYSTEM notifications
      }
    } catch (error) {
      this.logger.error(
        `Error checking email notification preference for user ${userId}`,
        error,
      );
      return false; // Fallback to not sending email if error
    }
  }

  /**
   * Get user preferences, creating with defaults if they don't exist
   */
  private async getOrCreatePreferences(userId: string) {
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences (all notifications enabled)
      preferences = await this.prisma.notificationPreferences.create({
        data: {
          userId,
          followWeb: true,
          followEmail: true,
          likeWeb: true,
          likeEmail: false, // Likes default to web-only
          commentWeb: true,
          commentEmail: true,
          mentionWeb: true,
          mentionEmail: true,
        },
      });

      this.logger.log(
        `Created default notification preferences for user ${userId}`,
      );
    }

    return preferences;
  }
}
