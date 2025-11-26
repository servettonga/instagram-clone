import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from '@prisma/client';

/**
 * Database service for managing notification records
 *
 * Handles database operations for the Notification model:
 * - Fetching paginated notifications for a user
 * - Checking unread notification count/status
 * - Marking notifications as read (individual or bulk)
 * - Retrieving notification details
 *
 * Used by NotificationsController to serve the REST API.
 */
@Injectable()
export class NotificationsService {
  private readonly logContext = NotificationsService.name;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<{
    notifications: Notification[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const limit = query.limit ?? 20;
    const cursor = query.cursor;

    const notifications = await this.prisma.notification.findMany({
      where: {
        createdBy: userId,
      },
      orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
      take: limit + 1, // Take one extra to check if there are more
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Skip the cursor itself
      }),
    });

    const hasMore = notifications.length > limit;
    const items = hasMore ? notifications.slice(0, -1) : notifications;
    const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

    return {
      notifications: items,
      hasMore,
      nextCursor,
    };
  }

  async getUnreadStatus(userId: string): Promise<{ hasUnread: boolean }> {
    const count = await this.prisma.notification.count({
      where: {
        createdBy: userId,
        isRead: false,
      },
      take: 1, // We only need to know if there's at least one
    });

    return { hasUnread: count > 0 };
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        createdBy: userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        createdBy: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  /**
   * Delete follow request notifications for a specific actor
   * Used when a follow request is approved or rejected to remove the notification
   */
  async deleteFollowRequestNotification(
    userId: string,
    actorId: string,
  ): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: {
        createdBy: userId,
        type: 'FOLLOW_REQUEST',
        data: {
          path: ['actorId'],
          equals: actorId,
        },
      },
    });

    this.logger.log(
      `Deleted follow request notification from ${actorId} for user ${userId}`,
      this.logContext,
    );
  }
}
