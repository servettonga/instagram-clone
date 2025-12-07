import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssetManagementService } from '../../common/services/asset-management.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assetManagementService: AssetManagementService,
  ) {}

  /**
   * Create a new message in a chat
   */
  async createMessage(
    chatId: string,
    userId: string,
    content: string,
    replyToMessageId?: string,
    assetIds?: string[],
  ) {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Verify user is a participant
    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a chat participant');
    }

    // If replying, verify the message exists and is in this chat
    if (replyToMessageId) {
      const replyToMessage = await this.prisma.message.findFirst({
        where: {
          id: replyToMessageId,
          chatId,
          deleted: false,
        },
      });

      if (!replyToMessage) {
        throw new NotFoundException('Reply-to message not found');
      }
    }

    // If attaching assets, verify they exist and belong to user
    if (assetIds && assetIds.length > 0) {
      const assets = await this.prisma.asset.findMany({
        where: {
          id: { in: assetIds },
          createdBy: userId,
        },
      });

      if (assets.length !== assetIds.length) {
        throw new NotFoundException('One or more assets not found');
      }
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        chatId,
        profileId: profile.id,
        content,
        replyToMessageId,
        createdBy: userId,
        ...(assetIds &&
          assetIds.length > 0 && {
            assets: {
              create: assetIds.map((assetId, index) => ({
                assetId,
                orderIndex: index,
                createdBy: userId,
              })),
            },
          }),
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                fileType: true,
                fileSize: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    // Update chat's updatedAt timestamp
    await this.prisma.chat.update({
      where: { id: chatId },
      data: { updatedAt: new Date() },
    });

    await this.prisma.chatParticipant.updateMany({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
      data: {
        lastReadAt: message.createdAt,
        updatedBy: userId,
      },
    });

    return message;
  }

  /**
   * Edit an existing message
   */
  async editMessage(messageId: string, userId: string, content: string) {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Get message and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    if (message.profileId !== profile.id) {
      throw new ForbiddenException('Can only edit your own messages');
    }

    // Update message
    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        updatedBy: userId,
      },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                fileType: true,
                fileSize: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return updatedMessage;
  }

  /**
   * Delete a message (soft delete) and clean up any attached files
   */
  async deleteMessage(messageId: string, userId: string) {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Get message with assets and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        assets: {
          include: {
            asset: {
              select: {
                filePath: true,
                thumbnailPath: true,
                mediumPath: true,
              },
            },
          },
        },
      },
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    if (message.profileId !== profile.id) {
      throw new ForbiddenException('Can only delete your own messages');
    }

    // Collect files to delete from storage
    const filesToDelete: string[] = [];
    for (const messageAsset of message.assets) {
      const asset = messageAsset.asset;
      if (asset.filePath) {
        const filename = asset.filePath.split('/').pop();
        if (filename) filesToDelete.push(filename);
      }
      if (asset.thumbnailPath) {
        const filename = asset.thumbnailPath.split('/').pop();
        if (filename) filesToDelete.push(filename);
      }
      if (asset.mediumPath) {
        const filename = asset.mediumPath.split('/').pop();
        if (filename) filesToDelete.push(filename);
      }
    }

    // Soft delete the message
    await this.prisma.message.update({
      where: { id: messageId },
      data: {
        deleted: true,
        updatedBy: userId,
      },
    });

    // Clean up storage files (do this after DB update succeeds)
    if (filesToDelete.length > 0) {
      await this.assetManagementService.deleteFilesFromStorage(
        filesToDelete,
        'messages',
      );
    }

    return { id: messageId, chatId: message.chatId };
  }

  /**
   * Get messages from a chat with pagination
   */
  async getMessages(
    chatId: string,
    userId: string,
    limit = 50,
    cursor?: string,
  ) {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Verify user is a participant
    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a chat participant');
    }

    // Get messages
    const messages = await this.prisma.message.findMany({
      where: {
        chatId,
        deleted: false,
        ...(cursor && { id: { lt: cursor } }),
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        profile: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                fileType: true,
                fileSize: true,
              },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return {
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit,
      nextCursor: messages.length > 0 ? (messages[0]?.id ?? null) : null,
    };
  }

  /**
   * Attach assets to a message
   */
  async attachAssets(messageId: string, userId: string, assetIds: string[]) {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Get message and verify ownership
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message || message.deleted) {
      throw new NotFoundException('Message not found');
    }

    if (message.profileId !== profile.id) {
      throw new ForbiddenException(
        'Can only attach assets to your own messages',
      );
    }

    // Verify assets exist
    const assets = await this.prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        createdBy: userId,
      },
    });

    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more assets not found');
    }

    // Create message assets
    const messageAssets = await Promise.all(
      assetIds.map((assetId, index) =>
        this.prisma.messageAsset.create({
          data: {
            messageId,
            assetId,
            orderIndex: index,
            createdBy: userId,
          },
          include: {
            asset: {
              select: {
                id: true,
                fileName: true,
                filePath: true,
                thumbnailPath: true,
                fileType: true,
                fileSize: true,
              },
            },
          },
        }),
      ),
    );

    return messageAssets;
  }
}
