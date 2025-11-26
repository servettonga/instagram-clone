import { Injectable } from '@nestjs/common';

/**
 * Manages Socket.IO socket connections and user mappings.
 * Tracks which users are online and their socket IDs.
 */
@Injectable()
export class SocketManagerService {
  // Map<userId, Set<socketId>> - Users can have multiple connections (different devices)
  private userSockets = new Map<string, Set<string>>();

  // Map<socketId, userId> - Reverse lookup
  private socketUsers = new Map<string, string>();

  /**
   * Add a socket connection for a user
   */
  addSocket(userId: string, socketId: string): void {
    // Add to user → sockets mapping
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);

    // Add to socket → user mapping
    this.socketUsers.set(socketId, userId);
  }

  /**
   * Remove a socket connection
   */
  removeSocket(userId: string, socketId: string): void {
    // Remove from user → sockets mapping
    const userSocketSet = this.userSockets.get(userId);
    if (userSocketSet) {
      userSocketSet.delete(socketId);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    // Remove from socket → user mapping
    this.socketUsers.delete(socketId);
  }

  /**
   * Get all socket IDs for a user
   */
  getUserSockets(userId: string): string[] {
    const sockets = this.userSockets.get(userId);
    return sockets ? Array.from(sockets) : [];
  }

  /**
   * Get user ID from socket ID
   */
  getUserIdBySocket(socketId: string): string | undefined {
    return this.socketUsers.get(socketId);
  }

  /**
   * Check if user is online (has at least one active socket)
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  /**
   * Get all online user IDs
   */
  getOnlineUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Get total number of connected sockets
   */
  getTotalConnections(): number {
    return this.socketUsers.size;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalUsers: this.userSockets.size,
      totalConnections: this.socketUsers.size,
      onlineUsers: this.getOnlineUsers(),
    };
  }
}
