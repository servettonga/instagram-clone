import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseGuards, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsAuthGuard } from '../guards/ws-auth.guard';
import { SocketManagerService } from '../services/socket-manager.service';
import { ChatEventsService } from '../services/chat-events.service';
import { ChatsService } from '../../chats/chats.service';
import { MessagesService } from '../../chats/services/messages.service';
import { AuthService } from '../../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { getConfig } from '../../config/config';
import type {
  ChatJoinPayload,
  ChatLeavePayload,
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  UserWithProfileAndAccount,
  CreateMessageDto,
  EditMessageDto,
  DeleteMessageDto,
} from '@repo/shared-types';

/**
 * Chat WebSocket Gateway
 * Handles real-time chat messaging, typing indicators, and presence
 */
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    // In development, allow any origin for local network testing
    origin: process.env.NODE_ENV === 'development' ? true : getConfig().frontendUrl,
    credentials: true,
  },
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
  >;

  private readonly logContext = ChatGateway.name;

  constructor(
    private readonly socketManager: SocketManagerService,
    private readonly chatsService: ChatsService,
    private readonly messagesService: MessagesService,
    private readonly chatEventsService: ChatEventsService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
  ) {}

  /**
   * Initialize gateway and set up authentication middleware
   * This runs during handshake BEFORE handleConnection
   */
  afterInit(server: Server) {
    this.logger.log('Chat Gateway initialized', this.logContext);

    // Initialize ChatEventsService with server instance
    this.chatEventsService.setServer(this.server);

    // Add authentication middleware for Socket.IO
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    server.use(async (socket, next) => {
      try {
        const token = this.extractToken(socket);

        if (!token) {
          return next(new Error('Unauthorized: No token provided'));
        }

        // Verify JWT locally
        interface JwtPayload {
          userId: string;
          email: string;
          jti: string;
          iat?: number;
          exp?: number;
        }

        let payload: JwtPayload;
        try {
          payload = this.jwtService.verify(token);
        } catch {
          return next(new Error('Unauthorized: Invalid or expired token'));
        }

        // Get full user data
        const user = await this.authService.validateUser(payload.userId);

        if (!user) {
          return next(new Error('Unauthorized: User not found'));
        }

        if (user.disabled) {
          return next(new Error('Unauthorized: Account disabled'));
        }

        // Attach user to socket data
        const socketData = socket.data as SocketData;
        socketData.user = user;
        socketData.userId = user.id;
        socketData.profileId = user.profile?.id;

        next();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(
          `Authentication middleware error: ${errorMessage}`,
          error instanceof Error ? error.stack : undefined,
          this.logContext,
        );
        next(new Error('Unauthorized: Authentication failed'));
      }
    });
  }

  /**
   * Extract JWT token from socket handshake
   */
  private extractToken(socket: Socket): string | null {
    const auth = socket.handshake.auth?.token as string | undefined;

    if (!auth || typeof auth !== 'string') {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    const token = auth.startsWith('Bearer ') ? auth.substring(7) : auth;

    return token.trim() || null;
  }

  /**
   * Handle new WebSocket connection
   * Authentication is done in middleware (afterInit), so user is guaranteed to exist here
   */
  handleConnection(
    client: Socket<
      ClientToServerEvents,
      ServerToClientEvents,
      Record<string, never>,
      SocketData
    >,
  ) {
    // Get authenticated user from socket data (set by middleware)
    const socketData = client.data;
    const user: UserWithProfileAndAccount = socketData.user;

    if (!user) {
      this.logger.warn(
        `Connection rejected: No user data on socket ${client.id}`,
        this.logContext,
      );
      client.disconnect(true);
      return;
    }

    // Track user's socket
    this.socketManager.addSocket(user.id, client.id);

    // Broadcast user online status to all clients
    this.server.emit('user:presence', {
      userId: user.id,
      isOnline: true,
    });

    // Send currently online users to the newly connected client
    const allOnlineUserIds = this.socketManager.getOnlineUsers();
    allOnlineUserIds.forEach((onlineUserId) => {
      if (onlineUserId !== user.id) {
        client.emit('user:presence', {
          userId: onlineUserId,
          isOnline: true,
        });
      }
    });
  }

  /**
   * Handle WebSocket disconnection
   */
  handleDisconnect(client: Socket) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;
    const userId = socketData.userId;

    if (!userId) {
      this.logger.warn(
        `Disconnect: No user ID on socket ${client.id}`,
        this.logContext,
      );
      return;
    }

    // Remove user's socket
    this.socketManager.removeSocket(userId, client.id);

    // Check if user still has other active connections
    const remainingSockets = this.socketManager.getUserSockets(userId);

    // If no more connections, broadcast user offline status
    if (remainingSockets.length === 0) {
      this.server.emit('user:presence', {
        userId,
        isOnline: false,
      });
    }
  }

  /**
   * Handle user joining a chat room
   */
  @SubscribeMessage('chat:join')
  async handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatJoinPayload,
  ) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;

    const user: UserWithProfileAndAccount = socketData.user;
    const { chatId } = data;

    try {
      // Validate user is a participant of this chat
      const isParticipant = await this.chatsService.validateParticipant(
        chatId,
        user.id,
      );
      if (!isParticipant) {
        client.emit('error', {
          message: 'Not a chat participant',
          code: 'FORBIDDEN',
        });
        return;
      }

      // Join the Socket.IO room
      await client.join(`chat:${chatId}`);

      // Notify other participants that user joined
      client.to(`chat:${chatId}`).emit('chat:user:joined', {
        chatId,
        userId: user.id,
        username: user.profile?.username || 'Unknown',
        displayName: user.profile?.displayName || 'Unknown User',
        avatarUrl: user.profile?.avatarUrl || null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error joining chat ${chatId}: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
      client.emit('error', {
        message: 'Failed to join chat',
        code: 'JOIN_ERROR',
      });
    }
  }

  /**
   * Handle user leaving a chat room
   */
  @SubscribeMessage('chat:leave')
  async handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatLeavePayload,
  ) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;

    const user: UserWithProfileAndAccount = socketData.user;
    const { chatId } = data;

    try {
      // Leave the Socket.IO room
      await client.leave(`chat:${chatId}`);

      // Notify other participants that user left
      client.to(`chat:${chatId}`).emit('chat:user:left', {
        chatId,
        userId: user.id,
        username: user.profile?.username || 'Unknown',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error leaving chat ${chatId}: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
    }
  }

  /**
   * Handle typing indicator
   */
  @SubscribeMessage('chat:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; isTyping: boolean },
  ) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;

    const user: UserWithProfileAndAccount = socketData.user;
    const { chatId, isTyping } = data;

    try {
      // Broadcast typing indicator to others in room (not sender)
      client.to(`chat:${chatId}`).emit('chat:typing', {
        chatId,
        userId: user.id,
        username: user.profile?.username || 'Unknown',
        isTyping,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error handling typing indicator: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
    }
  }

  /**
   * Broadcast a message to a specific chat room
   * This method can be called from services to push messages
   */
  broadcastToChatRoom<T>(
    chatId: string,
    event: keyof ServerToClientEvents,
    data: T,
  ): void {
    // @ts-expect-error - Socket.IO emit types are complex with acknowledgements
    this.server.to(`chat:${chatId}`).emit(event, data);
  }

  /**
   * Send a message to specific user (all their sockets)
   */
  sendToUser<T>(
    userId: string,
    event: keyof ServerToClientEvents,
    data: T,
  ): void {
    const socketIds = this.socketManager.getUserSockets(userId);
    socketIds.forEach((socketId) => {
      // @ts-expect-error - Socket.IO emit types are complex with acknowledgements
      this.server.to(socketId).emit(event, data);
    });
  }

  /**
   * Handle new message in chat
   */
  @SubscribeMessage('chat:message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageDto,
  ) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;
    const user: UserWithProfileAndAccount = socketData.user;
    const { chatId, content, replyToMessageId, assetIds } = data;

    try {
      // Create message in database
      const message = await this.messagesService.createMessage(
        chatId,
        user.id,
        content,
        replyToMessageId,
        assetIds,
      );

      // Broadcast message to all participants in the chat room
      this.broadcastToChatRoom(chatId, 'chat:message', {
        id: message.id,
        chatId: message.chatId,
        content: message.content,
        profileId: message.profileId,
        profile: {
          id: message.profile.id,
          username: message.profile.username,
          displayName: message.profile.displayName,
          avatarUrl: message.profile.avatarUrl,
        },
        replyToMessageId: message.replyToMessageId,
        assets: message.assets.map((ma) => ({
          id: ma.id,
          assetId: ma.assetId,
          orderIndex: ma.orderIndex,
          asset: {
            id: ma.asset.id,
            fileName: ma.asset.fileName,
            filePath: ma.asset.filePath,
            thumbnailPath: ma.asset.thumbnailPath,
            fileType: ma.asset.fileType,
            fileSize: ma.asset.fileSize,
          },
        })),
        isEdited: message.isEdited,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error creating message: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
      client.emit('error', {
        message: 'Failed to create message',
        code: 'MESSAGE_CREATE_ERROR',
      });
    }
  }

  /**
   * Handle message edit
   */
  @SubscribeMessage('chat:message:edit')
  async handleEditMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EditMessageDto,
  ) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;
    const user: UserWithProfileAndAccount = socketData.user;
    const { messageId, content } = data;

    try {
      // Edit message in database
      const message = await this.messagesService.editMessage(
        messageId,
        user.id,
        content,
      );

      // Broadcast edit to all participants in the chat room
      this.broadcastToChatRoom(message.chatId, 'chat:message:edited', {
        messageId: message.id,
        chatId: message.chatId,
        content: message.content,
        editedAt: message.updatedAt.toISOString(),
      });

      this.logger.log(
        `Message ${messageId} edited by ${user.profile?.username}`,
        this.logContext,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error editing message: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
      client.emit('error', {
        message: 'Failed to edit message',
        code: 'MESSAGE_EDIT_ERROR',
      });
    }
  }

  /**
   * Handle message delete
   */
  @SubscribeMessage('chat:message:delete')
  async handleDeleteMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DeleteMessageDto,
  ) {
    // Socket.IO's client.data is typed as 'any', but WsAuthGuard ensures it's SocketData
    const socketData = client.data as SocketData;
    const user: UserWithProfileAndAccount = socketData.user;
    const { messageId } = data;

    try {
      // Delete message in database
      const result = await this.messagesService.deleteMessage(
        messageId,
        user.id,
      );

      // Broadcast deletion to all participants in the chat room
      this.broadcastToChatRoom(result.chatId, 'chat:message:deleted', {
        messageId: result.id,
        chatId: result.chatId,
      });

      this.logger.log(
        `Message ${messageId} deleted by ${user.profile?.username}`,
        this.logContext,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error deleting message: ${errorMessage}`,
        errorStack,
        this.logContext,
      );
      client.emit('error', {
        message: 'Failed to delete message',
        code: 'MESSAGE_DELETE_ERROR',
      });
    }
  }
}
