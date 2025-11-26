// Chat-related types for REST API

// DTOs
export interface CreatePrivateChatDto {
  otherUserId: string;
}

export interface CreateGroupChatDto {
  name: string;
  participantUserIds: string[];
}

export interface AddParticipantDto {
  userId: string;
}

export interface GetMessagesQueryDto {
  cursor?: string;
  limit?: number;
}

// Entity types
export interface ChatParticipant {
  id: string;
  chatId: string;
  profileId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  leftAt: string | null;
  lastReadAt: string | null;
  profile: {
    id: string;
    userId: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface Chat {
  id: string;
  name: string;
  type: 'PRIVATE' | 'GROUP';
  createdAt: string;
  updatedAt: string;
  participants: ChatParticipant[];
  messages?: Message[];
  unreadCount?: number;
}

export interface MessageAsset {
  id: string;
  messageId: string;
  assetId: string;
  orderIndex: number;
  asset: {
    id: string;
    fileName: string;
    filePath: string;
    thumbnailPath?: string;
    fileType: string;
    fileSize: number;
  };
}

export interface Message {
  id: string;
  chatId: string;
  profileId: string;
  content: string;
  replyToMessageId: string | null;
  isEdited: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  assets?: MessageAsset[];
}

export interface MessagesResponse {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}
