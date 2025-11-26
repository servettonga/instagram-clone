// Socket.IO Event Types for Real-time Communication

import type { UserWithProfileAndAccount } from './user.types';
import type { Message, MessageAsset } from './chat.types';

// ChatMessagePayload is the same as Message entity from DB
export type ChatMessagePayload = Message;

// MessageAssetPayload is the same as MessageAsset entity from DB
export type MessageAssetPayload = MessageAsset;

export interface TypingPayload {
  chatId: string;
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface MessageEditPayload {
  messageId: string;
  chatId: string;
  content: string;
  editedAt: string;
}

export interface MessageDeletePayload {
  messageId: string;
  chatId: string;
}

export interface ChatJoinPayload {
  chatId: string;
}

export interface ChatLeavePayload {
  chatId: string;
}

export interface UserJoinedPayload {
  chatId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface UserLeftPayload {
  chatId: string;
  userId: string;
  username: string;
}

export interface UserPresencePayload {
  userId: string;
  isOnline: boolean;
}

export interface CreateMessageDto {
  chatId: string;
  content: string;
  replyToMessageId?: string;
  assetIds?: string[];
}

export interface EditMessageDto {
  messageId: string;
  content: string;
}

export interface DeleteMessageDto {
  messageId: string;
}

// Client → Server events
export interface ClientToServerEvents {
  'chat:join': (data: ChatJoinPayload) => void;
  'chat:leave': (data: ChatLeavePayload) => void;
  'chat:message': (data: CreateMessageDto) => void;
  'chat:typing': (data: { chatId: string; isTyping: boolean }) => void;
  'chat:message:edit': (data: EditMessageDto) => void;
  'chat:message:delete': (data: DeleteMessageDto) => void;
}

// Server → Client events
export interface ServerToClientEvents {
  'chat:message': (data: ChatMessagePayload) => void;
  'chat:typing': (data: TypingPayload) => void;
  'chat:message:edited': (data: MessageEditPayload) => void;
  'chat:message:deleted': (data: MessageDeletePayload) => void;
  'chat:user:joined': (data: UserJoinedPayload) => void;
  'chat:user:left': (data: UserLeftPayload) => void;
  'user:presence': (data: UserPresencePayload) => void;
  error: (data: { message: string; code?: string }) => void;
}

// Socket data attached by server
export interface SocketData {
  user: UserWithProfileAndAccount;
  userId: string;
  profileId: string;
}
