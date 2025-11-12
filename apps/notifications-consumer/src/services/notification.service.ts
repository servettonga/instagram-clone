import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { NotificationPayload } from "@repo/shared-types";
import { Notification } from "@prisma/client";

/**
 * Database service for creating and managing notifications (consumer side)
 *
 * Handles:
 * - Creating notification records from queue payloads
 * - Fetching user profile information for email delivery
 * - Marking notifications as email sent
 *
 * Works with the shared Prisma schema to ensure consistency
 * with the core-server-app database.
 */
@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
  ) {}

  // Enrich notification data with avatar and post thumbnail
  async enrichNotificationData(payload: NotificationPayload): Promise<{
    notificationData: Record<string, unknown>;
    updatedBy?: string;
  }> {
    const notificationData: Record<string, unknown> = {
      entityType: payload.entityType,
      entityId: payload.entityId,
      actorId: payload.actorId,
      ...payload.metadata,
    };

    let updatedBy: string | undefined;

    // Enrich with actor avatar
    if (payload.actorId && payload.actorId !== "system") {
      const actorUser = await this.prisma.user.findUnique({
        where: { id: payload.actorId },
        select: {
          id: true,
          profile: {
            select: {
              username: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (actorUser) {
        updatedBy = payload.actorId;
        if (actorUser.profile?.avatarUrl) {
          notificationData.actorAvatarUrl = actorUser.profile.avatarUrl;
        }
      }
    }

    // Enrich with post thumbnail if postId is present
    const postId =
      payload.entityType === "post"
        ? payload.entityId
        : (payload.metadata?.postId as string | undefined);

    this.logger.log(
      `Enriching notification - entityType: ${payload.entityType}, entityId: ${payload.entityId}, postId from metadata: ${payload.metadata?.postId}, resolved postId: ${postId}`,
    );

    if (postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: postId },
        select: {
          assets: {
            select: {
              asset: {
                select: {
                  thumbnailPath: true,
                },
              },
            },
            take: 1,
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
      });

      const thumbnailPath = post?.assets[0]?.asset?.thumbnailPath;
      if (thumbnailPath) {
        // thumbnailPath is already a full URL (like avatarUrl), just use it directly
        notificationData.postImageUrl = thumbnailPath;
        this.logger.log(
          `Enriched notification with thumbnail: ${thumbnailPath}`,
        );
      } else {
        this.logger.log(`No thumbnail found for postId: ${postId}`);
      }
    }

    return { notificationData, updatedBy };
  }

  // Save notification to PostgreSQL
  async createNotification(
    payload: NotificationPayload,
  ): Promise<Notification> {
    try {
      const { notificationData, updatedBy } =
        await this.enrichNotificationData(payload);

      const notification = await this.prisma.notification.create({
        data: {
          type: payload.type as unknown as Notification["type"],
          title: payload.title,
          message: payload.message,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: notificationData as any,
          isRead: false,
          createdBy: payload.userId,
          ...(updatedBy && { updatedBy }),
        },
      });

      this.logger.log(
        `Created notification ${notification.id} for user ${payload.userId}. Has thumbnail: ${!!notificationData.postImageUrl}`,
      );

      return notification;
    } catch (error) {
      this.logger.error("Error creating notification:", error);
      throw error;
    }
  }

  async markEmailSent(notificationId: string): Promise<void> {
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          readAt: new Date(), // Mark when email was sent
        },
      });

      this.logger.log(`Marked notification ${notificationId} as email sent`);
    } catch (error) {
      this.logger.error("Error marking notification as email sent", error);
      throw error;
    }
  }

  // Get user details for email
  async getUserWithProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: true, // Get accounts (which have email)
        profile: true, // Get profile (which has username, displayName)
      },
    });

    if (!user || !user.accounts || user.accounts.length === 0) {
      this.logger.warn(`User ${userId} not found or has no account`);
      return null;
    }

    if (!user.profile) {
      this.logger.warn(`User ${userId} has no profile`);
      return null;
    }

    const firstAccount = user.accounts[0];
    if (!firstAccount) {
      this.logger.warn(`User ${userId} has no valid account`);
      return null;
    }

    // Transform to match expected structure for email service
    return {
      id: user.id,
      email: firstAccount.email, // Email is in accounts table
      username: user.profile.username, // Username is in profile table
      profile: {
        displayName: user.profile.displayName,
      },
    };
  }
}
