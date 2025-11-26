import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatEventsService } from '../realtime/services/chat-events.service';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatEventsService: ChatEventsService,
  ) {}

  /**
   * Validate if a user is a participant of a chat
   */
  async validateParticipant(chatId: string, userId: string): Promise<boolean> {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: {
        userId,
        deleted: false,
      },
    });

    if (!profile) {
      return false;
    }

    // Check if profile is a participant of the chat
    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null, // User hasn't left the chat
      },
    });

    return !!participant;
  }

  /**
   * Get chat with participants (requires authorization)
   */
  async getChat(chatId: string, userId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
    });

    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const unreadCount = await this.prisma.message.count({
      where: {
        chatId,
        deleted: false,
        profileId: { not: profile.id },
        createdAt: {
          gt: participant.lastReadAt ?? participant.joinedAt ?? new Date(0),
        },
      },
    });

    return {
      ...chat,
      unreadCount,
    };
  }

  /**
   * Create a private (direct message) chat between two users
   */
  async createPrivateChat(
    creatorUserId: string,
    otherUserId: string,
  ): Promise<{ id: string; type: string; participants: any[] }> {
    // Get both profiles
    const [creatorProfile, otherProfile] = await Promise.all([
      this.prisma.profile.findFirst({
        where: { userId: creatorUserId, deleted: false },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
      this.prisma.profile.findFirst({
        where: { userId: otherUserId, deleted: false },
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      }),
    ]);

    if (!creatorProfile || !otherProfile) {
      throw new NotFoundException('One or both users not found');
    }

    // Check if private chat already exists between these two profiles
    const existingChat = await this.prisma.chat.findFirst({
      where: {
        type: 'PRIVATE',
        participants: {
          every: {
            OR: [
              { profileId: creatorProfile.id },
              { profileId: otherProfile.id },
            ],
          },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    if (existingChat && existingChat.participants.length === 2) {
      return existingChat;
    }

    // Create new private chat
    const chat = await this.prisma.chat.create({
      data: {
        name: `${creatorProfile.username}, ${otherProfile.username}`,
        type: 'PRIVATE',
        createdBy: creatorUserId,
        participants: {
          create: [
            {
              profileId: creatorProfile.id,
              role: 'MEMBER',
              createdBy: creatorUserId,
              lastReadAt: new Date(),
            },
            {
              profileId: otherProfile.id,
              role: 'MEMBER',
              createdBy: creatorUserId,
              lastReadAt: new Date(),
            },
          ],
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return chat;
  }

  /**
   * Create a group chat
   * Delete a chat
   * Update chat details
   */
  async createGroupChat(
    creatorUserId: string,
    name: string,
    participantUserIds: string[],
  ) {
    // Get all profiles including creator
    const allUserIds = [creatorUserId, ...participantUserIds];
    const profiles = await this.prisma.profile.findMany({
      where: {
        userId: { in: allUserIds },
        deleted: false,
      },
      select: {
        id: true,
        userId: true,
        username: true,
        displayName: true,
        avatarUrl: true,
      },
    });

    if (profiles.length !== allUserIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    const creatorProfile = profiles.find((p) => p.userId === creatorUserId);
    if (!creatorProfile) {
      throw new NotFoundException('Creator profile not found');
    }

    // Create group chat
    const chat = await this.prisma.chat.create({
      data: {
        name,
        type: 'GROUP',
        createdBy: creatorUserId,
        participants: {
          create: profiles.map((profile) => ({
            profileId: profile.id,
            role: profile.id === creatorProfile.id ? 'ADMIN' : 'MEMBER',
            createdBy: creatorUserId,
            lastReadAt: new Date(),
          })),
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return chat;
  }

  /**
   * Add participant to group chat (requires authorization)
   */
  async addParticipant(
    chatId: string,
    participantUserId: string,
    addedByUserId: string,
  ) {
    // Verify the user adding the participant is actually a member
    const isParticipant = await this.validateParticipant(chatId, addedByUserId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }

    // Verify chat exists and is a group chat
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.type !== 'GROUP') {
      throw new Error('Can only add participants to group chats');
    }

    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId: participantUserId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    // Check if already an active participant
    const existingParticipant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
      include: {
        profile: {
          select: {
            id: true,
            userId: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (existingParticipant) {
      return existingParticipant;
    }

    // Check if previously left (to update instead of create)
    const previousParticipant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
      },
    });

    const participant = previousParticipant
      ? // User previously left, rejoin them
        await this.prisma.chatParticipant.update({
          where: {
            id: previousParticipant.id,
          },
          data: {
            leftAt: null,
            updatedBy: addedByUserId,
            lastReadAt: new Date(),
          },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        })
      : // New participant
        await this.prisma.chatParticipant.create({
          data: {
            chatId,
            profileId: profile.id,
            role: 'MEMBER',
            createdBy: addedByUserId,
            lastReadAt: new Date(),
          },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        });

    // Broadcast to chat room that user joined
    this.chatEventsService.broadcastUserJoined(chatId, {
      userId: participant.profile.userId,
      username: participant.profile.username,
      displayName:
        participant.profile.displayName || participant.profile.username,
      avatarUrl: participant.profile.avatarUrl,
    });

    return participant;
  }

  /**
   * Update chat details (e.g., name for group chats)
   */
  async updateChat(
    chatId: string,
    userId: string,
    updateData: { name?: string },
  ) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Get chat and verify user is admin
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          where: {
            profileId: profile.id,
            leftAt: null,
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const participant = chat.participants[0];
    if (!participant) {
      throw new NotFoundException('Not a chat participant');
    }

    // Only admins can update group chat details
    if (chat.type === 'GROUP' && participant.role !== 'ADMIN') {
      throw new NotFoundException('Only admins can update group chat details');
    }

    // Private chats cannot be renamed
    if (chat.type === 'PRIVATE') {
      throw new NotFoundException('Cannot update private chat details');
    }

    // Update chat
    const updatedChat = await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        ...updateData,
        updatedBy: userId,
      },
    });

    return updatedChat;
  }

  /**
   * Get all chats for a user
   */
  async getUserChats(userId: string) {
    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      return [];
    }

    const chats = await this.prisma.chat.findMany({
      where: {
        participants: {
          some: {
            profileId: profile.id,
            leftAt: null,
          },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            profile: {
              select: {
                id: true,
                userId: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          where: { deleted: false },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            profile: {
              select: {
                username: true,
              },
            },
            assets: {
              select: {
                id: true,
                asset: {
                  select: {
                    fileType: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const chatIds = chats.map((chat) => chat.id);

    if (chatIds.length === 0) {
      return chats;
    }

    const participantRecords = await this.prisma.chatParticipant.findMany({
      where: {
        chatId: { in: chatIds },
        profileId: profile.id,
        leftAt: null,
      },
      select: {
        chatId: true,
        lastReadAt: true,
        joinedAt: true,
      },
    });

    const participantMap = participantRecords.reduce<
      Record<string, { lastReadAt: Date | null; joinedAt: Date }>
    >((acc, record) => {
      acc[record.chatId] = {
        lastReadAt: record.lastReadAt,
        joinedAt: record.joinedAt,
      };
      return acc;
    }, {});

    const unreadCounts = await Promise.all(
      chatIds.map(async (chatId) => ({
        chatId,
        count: await this.prisma.message.count({
          where: {
            chatId,
            deleted: false,
            profileId: { not: profile.id },
            createdAt: {
              gt:
                participantMap[chatId]?.lastReadAt ??
                participantMap[chatId]?.joinedAt ??
                new Date(0),
            },
          },
        }),
      })),
    );

    const unreadCountMap = unreadCounts.reduce<Record<string, number>>(
      (acc, entry) => {
        acc[entry.chatId] = entry.count;
        return acc;
      },
      {},
    );

    return chats.map((chat) => ({
      ...chat,
      unreadCount: unreadCountMap[chat.id] ?? 0,
    }));
  }

  /**
   * Leave a group chat (mark participant as left)
   */
  async leaveChat(chatId: string, userId: string) {
    // Verify user is a participant
    const isParticipant = await this.validateParticipant(chatId, userId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }

    // Get chat to verify it's a group chat
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.type !== 'GROUP') {
      throw new Error('Can only leave group chats');
    }

    // Get user's profile
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    // Mark participant as left
    await this.prisma.chatParticipant.updateMany({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
      data: {
        leftAt: new Date(),
        updatedBy: userId,
      },
    });

    // Broadcast to chat room that user left
    this.chatEventsService.broadcastUserLeft(chatId, {
      userId,
      username: profile.username,
    });

    return { success: true };
  }

  /**
   * Delete a chat (soft delete for private, hard delete for groups if admin)
   */
  async deleteChat(chatId: string, userId: string) {
    // Verify user is a participant
    const isParticipant = await this.validateParticipant(chatId, userId);
    if (!isParticipant) {
      throw new NotFoundException('Chat not found');
    }

    // Get chat with participants
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          where: { leftAt: null },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Get user's profile and participant record
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User not found');
    }

    const currentParticipant = chat.participants.find(
      (p) => p.profileId === profile.id,
    );

    // For group chats, only admins can delete
    if (chat.type === 'GROUP' && currentParticipant?.role !== 'ADMIN') {
      throw new Error('Only admins can delete group chats');
    }

    // Delete all messages in the chat
    await this.prisma.message.deleteMany({
      where: { chatId },
    });

    // Delete all participants
    await this.prisma.chatParticipant.deleteMany({
      where: { chatId },
    });

    // Delete the chat
    await this.prisma.chat.delete({
      where: { id: chatId },
    });

    return { success: true };
  }

  async markChatRead(chatId: string, userId: string) {
    const profile = await this.prisma.profile.findFirst({
      where: { userId, deleted: false },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    const participant = await this.prisma.chatParticipant.findFirst({
      where: {
        chatId,
        profileId: profile.id,
        leftAt: null,
      },
    });

    if (!participant) {
      throw new NotFoundException('Chat not found');
    }

    await this.prisma.chatParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadAt: new Date(),
        updatedBy: userId,
      },
    });

    return { success: true };
  }
}
