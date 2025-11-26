import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService } from '../../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import type { SocketData } from '@repo/shared-types';

/**
 * WebSocket Authentication Guard
 * Validates JWT tokens during Socket.IO handshake and attaches user to socket.data
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    try {
      const token = this.extractToken(client);

      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      // Verify JWT locally first (fast check)
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
        throw new WsException('Unauthorized: Invalid or expired token');
      }

      // Get full user data from database (reuses existing auth service)
      const user = await this.authService.validateUser(payload.userId);

      if (!user) {
        throw new WsException('Unauthorized: User not found');
      }

      if (user.disabled) {
        throw new WsException('Unauthorized: Account disabled');
      }

      // Attach user to socket for use in handlers
      const socketData = client.data as SocketData;
      socketData.user = user;
      socketData.userId = user.id;
      socketData.profileId = user.profile?.id;

      return true;
    } catch (error) {
      // Log the error for debugging
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('WebSocket auth error:', errorMessage);

      // Disconnect the client
      client.disconnect(true);

      throw new WsException(
        error instanceof WsException
          ? error.message
          : 'Unauthorized: Authentication failed',
      );
    }
  }

  /**
   * Extract JWT token from socket handshake
   * Supports: auth: { token: 'Bearer xxx' } or auth: { token: 'xxx' }
   */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token as string | undefined;

    if (!auth || typeof auth !== 'string') {
      return null;
    }

    // Support both "Bearer token" and "token" formats
    const token = auth.startsWith('Bearer ') ? auth.substring(7) : auth;

    return token.trim() || null;
  }
}
