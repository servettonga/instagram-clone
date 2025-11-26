import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from '@repo/shared-types';

/**
 * Service to handle chat-related event broadcasting
 * Decouples ChatsService from ChatGateway to avoid circular dependencies
 */
@Injectable()
export class ChatEventsService {
  private server: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  > | null = null;

  /**
   * Set the Socket.IO server instance
   * Called by ChatGateway during initialization
   */
  setServer(
    server: Server<
      ClientToServerEvents,
      ServerToClientEvents,
      Record<string, never>,
      SocketData
    >,
  ) {
    this.server = server;
  }

  /**
   * Broadcast that a user joined a chat
   */
  broadcastUserJoined(
    chatId: string,
    payload: {
      userId: string;
      username: string;
      displayName: string;
      avatarUrl: string | null;
    },
  ) {
    if (!this.server) {
      console.warn('[ChatEventsService] Server not initialized');
      return;
    }

    this.server.to(`chat:${chatId}`).emit('chat:user:joined', {
      chatId,
      ...payload,
    });
  }

  /**
   * Broadcast that a user left a chat
   */
  broadcastUserLeft(
    chatId: string,
    payload: {
      userId: string;
      username: string;
    },
  ) {
    if (!this.server) {
      console.warn('[ChatEventsService] Server not initialized');
      return;
    }

    this.server.to(`chat:${chatId}`).emit('chat:user:left', {
      chatId,
      ...payload,
    });
  }

  /**
   * Broadcast that a message was edited
   */
  broadcastMessageEdited(
    chatId: string,
    payload: {
      messageId: string;
      content: string;
      editedAt: string;
    },
  ) {
    if (!this.server) {
      console.warn('[ChatEventsService] Server not initialized');
      return;
    }

    this.server.to(`chat:${chatId}`).emit('chat:message:edited', {
      chatId,
      ...payload,
    });
  }

  /**
   * Broadcast that a message was deleted
   */
  broadcastMessageDeleted(
    chatId: string,
    payload: {
      messageId: string;
    },
  ) {
    if (!this.server) {
      console.warn('[ChatEventsService] Server not initialized');
      return;
    }

    this.server.to(`chat:${chatId}`).emit('chat:message:deleted', {
      chatId,
      ...payload,
    });
  }
}
