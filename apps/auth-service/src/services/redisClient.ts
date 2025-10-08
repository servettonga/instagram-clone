import { Redis } from 'ioredis';
import { config } from '../config/config.js';

export interface SessionData {
  userId: string;
  email: string;
  refreshTokenId: string;
  createdAt: number;
  lastActivity: number;
  deviceInfo?: string;
}

class RedisService {
  private client: Redis;
  private isConnected = false;

  constructor() {
    this.client = new Redis(config.redis.url, {
      lazyConnect: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.client.on('connect', () => {
      console.log('✓ Connected to Redis');
      this.isConnected = true;
    });

    this.client.on('error', (err) => {
      console.log('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Redis connection closed');
      this.isConnected = false;
    });
  }

  async connect() {
    if (!this.isConnected && this.client.status !== 'ready') {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.isConnected || this.client.status === 'ready') {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // ==================== Session Management ====================

  /**
   * Store refresh token session
   * Key format: session:userId:tokenId
   */
  async storeSession(
    userId: string,
    refreshTokenId: string,
    sessionData: SessionData,
    ttlSeconds: number = 7 * 24 * 60 * 60, // 7 days default
  ) {
    const key = `session:${userId}:${refreshTokenId}`;
    await this.client.setex(key, ttlSeconds, JSON.stringify(sessionData));
  }

  /**
   * Get session by userId and tokenId
   */
  async getSession(userId: string, refreshTokenId: string) {
    const key = `session:${userId}:${refreshTokenId}`;
    const data = await this.client.get(key);
    return data ? (JSON.parse(data) as SessionData) : null;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string) {
    const pattern = `session:${userId}:*`;
    const keys = await this.client.keys(pattern);

    if (keys.length === 0) return [];

    const sessions = await this.client.mget(...keys);
    return sessions
      .filter((session): session is string => session !== null)
      .map((session) => JSON.parse(session) as SessionData);
  }

  /**
   * Delete a specific session
   */
  async deleteSession(userId: string, refreshTokenId: string) {
    const key = `session:${userId}:${refreshTokenId}`;
    await this.client.del(key);
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllUserSessions(userId: string) {
    const pattern = `session:${userId}:*`;
    const keys = await this.client.keys(pattern);

    if (keys.length > 0) await this.client.del(...keys);
  }

  // ==================== Token Blacklist ====================

  /**
   * Add token to blacklist
   * Key format: blacklist:tokenId
   */
  async blacklistToken(tokenId: string, ttlSeconds: number) {
    const key = `blacklist:${tokenId}`;
    await this.client.setex(key, ttlSeconds, 'true');
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(tokenId: string) {
    const key = `blacklist:${tokenId}`;
    const result = await this.client.exists(key);
    return result === 1;
  }

  // ==================== OAuth State Management ====================
  // Note: Currently unused - Passport.js handles OAuth state automatically
  // Keeping for potential future manual OAuth implementations

  /**
   * Save OAuth state for CSRF protection
   * Key format: oauth:state:stateToken
   */
  async saveOAuthState(
    state: string,
    data: { provider: string; redirectUrl?: string },
    ttlSeconds: number = 600, // 10 minutes
  ) {
    const key = `oauth:state:${state}`;
    await this.client.setex(key, ttlSeconds, JSON.stringify(data));
  }

  /**
   * Get and delete OAuth state (use once)
   */
  async getOAuthState(state: string) {
    const key = `oauth:state:${state}`;
    const data = await this.client.get(key);

    if (data) {
      // Delete after reading (use once)
      await this.client.del(key);
      return JSON.parse(data) as { provider: string; redirectUrl?: string };
    }
    return null;
  }

  // ==================== Health Check ====================

  async ping() {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  async getInfo() {
    try {
      const info = await this.client.info('memory');
      const dbSize = await this.client.dbsize();

      const usedMemoryMatch = info.match(/used_memory_human:(.+)/);
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1]?.trim() : 'N/A';

      return {
        connected: this.isConnected,
        usedMemory,
        totalKeys: dbSize,
      };
    } catch {
      return {
        connected: false,
      };
    }
  }
}

export const redisService = new RedisService();
