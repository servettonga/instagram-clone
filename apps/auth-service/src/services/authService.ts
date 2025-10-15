import { JwtService } from '../utils/jwt.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { coreServiceClient, CreateUserRequest } from './coreServiceClient.js';
import { redisService, SessionData } from './redisClient.js';
import type { UserWithProfileAndAccount } from '@repo/shared-types';

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  identifier: string; // Email or username
  password: string;
}

export interface AuthResponse {
  user: UserWithProfileAndAccount;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export class AuthService {
  /**
   * Register new user
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    // Create user in Core Service
    const createUserDto: CreateUserRequest = {
      email: userData.email,
      username: userData.username,
      password: userData.password,
    };

    const user = await coreServiceClient.createUser(createUserDto);

    // Get email from accounts
    const email = user.accounts?.[0]?.email || userData.email;

    // Generate tokens
    const tokenPair = JwtService.generateTokenPair({
      userId: user.id,
      email,
    });

    // Store session in Redis
    const sessionData: SessionData = {
      userId: user.id,
      email,
      refreshTokenId: tokenPair.refreshTokenId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await redisService.storeSession(
      user.id,
      tokenPair.refreshTokenId,
      sessionData,
      JwtService.getRefreshTokenTTL(),
    );

    return {
      user,
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      },
    };
  }

  /**
   * Login user
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Verify credentials via Core Service
    const user = await coreServiceClient.verifyCredentials(credentials);

    if (!user) {
      throw new Error(AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS);
    }

    // Get email from accounts
    const email = user.accounts?.[0]?.email || '';

    // Generate tokens
    const tokenPair = JwtService.generateTokenPair({
      userId: user.id,
      email,
    });

    // Store session in Redis
    const sessionData: SessionData = {
      userId: user.id,
      email,
      refreshTokenId: tokenPair.refreshTokenId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await redisService.storeSession(
      user.id,
      tokenPair.refreshTokenId,
      sessionData,
      JwtService.getRefreshTokenTTL(),
    );

    return {
      user,
      tokens: {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      },
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    try {
      // Verify refresh token
      const decoded = JwtService.verifyRefreshToken(refreshToken);

      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        throw new Error(AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN);
      }

      // Check if session exists in Redis
      const session = await redisService.getSession(
        decoded.userId,
        decoded.jti,
      );
      if (!session) {
        throw new Error(AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN);
      }

      // Verify user still exists in Core Service
      const user = await coreServiceClient.getUserById(decoded.userId);
      if (!user) {
        throw new Error(AUTH_MESSAGES.ERRORS.USER_NOT_FOUND);
      }

      // Blacklist old refresh token
      await redisService.blacklistToken(
        decoded.jti,
        JwtService.getRefreshTokenTTL(),
      );

      // Delete old session
      await redisService.deleteSession(decoded.userId, decoded.jti);

      // Get email from accounts
      const email = user.accounts?.[0]?.email || '';

      // Generate new token pair
      const tokenPair = JwtService.generateTokenPair({
        userId: user.id,
        email,
      });

      // Store new session
      const newSessionData: SessionData = {
        userId: user.id,
        email,
        refreshTokenId: tokenPair.refreshTokenId,
        createdAt: session.createdAt,
        lastActivity: Date.now(),
      };

      await redisService.storeSession(
        user.id,
        tokenPair.refreshTokenId,
        newSessionData,
        JwtService.getRefreshTokenTTL(),
      );

      return {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
      };
    } catch (error) {
      console.error('RefreshToken error:', error);
      throw new Error(AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN);
    }
  }

  /**
   * Validate access token
   */
  static async validateToken(accessToken: string): Promise<{
    valid: boolean;
    user?: UserWithProfileAndAccount;
  }> {
    try {
      const decoded = JwtService.verifyAccessToken(accessToken);

      // Check if token is blacklisted
      const isBlacklisted = await redisService.isTokenBlacklisted(decoded.jti);
      if (isBlacklisted) {
        return { valid: false };
      }

      // Get user from Core Service
      const user = await coreServiceClient.getUserById(decoded.userId);
      if (!user) {
        return { valid: false };
      }

      return { valid: true, user };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Logout user
   */
  static async logout(refreshToken: string): Promise<void> {
    try {
      const decoded = JwtService.decodeToken(refreshToken);
      if (!decoded) {
        return; // Invalid token, nothing to do
      }

      // Blacklist refresh token
      await redisService.blacklistToken(
        decoded.jti,
        JwtService.getRefreshTokenTTL(),
      );

      // Delete session
      await redisService.deleteSession(decoded.userId, decoded.jti);
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error, logout should always succeed
    }
  }

  /**
   * Get user by ID (internal use only)
   * Used during token refresh to verify user still exists
   */
  static async getUserById(
    userId: string,
  ): Promise<UserWithProfileAndAccount | null> {
    return coreServiceClient.getUserById(userId);
  }

  /**
   * Logout all sessions for a user
   * For future use (admin panel, security features)
   */
  static async logoutAllSessions(userId: string): Promise<void> {
    const sessions = await redisService.getUserSessions(userId);

    for (const session of sessions) {
      await redisService.blacklistToken(
        session.refreshTokenId,
        JwtService.getRefreshTokenTTL(),
      );
    }

    await redisService.deleteAllUserSessions(userId);
  }
}
