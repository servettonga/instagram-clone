import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { VALIDATION_RULES, config } from '../config/config.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { redisService, SessionData } from '../services/redisClient.js';
import { JwtService } from '../utils/jwt.js';
import { PasswordResetService } from '../services/password-reset.service.js';
import { coreServiceClient } from '../services/coreServiceClient.js';
import type {
  AuthResponse,
  LoginCredentials,
  SignupData,
  UserWithProfileAndAccount,
  RefreshTokenResponse,
  TokenValidationResponse,
  AccountOption,
} from '@repo/shared-types';

// Singleton instance for password reset service
const passwordResetService = new PasswordResetService();

export class AuthController {
  /**
   * POST /internal/auth/register
   */
  static async register(
    req: Request<object, object, SignupData>,
    res: Response,
  ): Promise<void> {
    try {
      const signupData: SignupData = req.body;

      if (!signupData.email || !signupData.username || !signupData.password) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.ALL_FIELDS_REQUIRED,
          message: 'Email, username, and password are required',
        });
        return;
      }

      if (!VALIDATION_RULES.EMAIL_REGEX.test(signupData.email)) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.INVALID_EMAIL_FORMAT,
        });
        return;
      }

      if (signupData.password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.PASSWORD_MIN_LENGTH,
        });
        return;
      }

      const result = await AuthService.register(signupData);

      const response: AuthResponse = {
        user: result.user,
        tokens: result.tokens,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === AUTH_MESSAGES.ERRORS.USER_EXISTS) {
          res.status(409).json({ error: error.message });
          return;
        }
        if (error.message === AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE) {
          res.status(503).json({ error: error.message });
          return;
        }
      }

      console.error('Registration error:', error);
      res.status(500).json({
        error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  /**
   * POST /internal/auth/login
   */
  static async login(
    req: Request<object, object, LoginCredentials>,
    res: Response,
  ): Promise<void> {
    try {
      const credentials: LoginCredentials = req.body;

      if (!credentials.identifier || !credentials.password) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.IDENTIFIER_PASSWORD_REQUIRED,
        });
        return;
      }

      const result = await AuthService.login(credentials);

      const response: AuthResponse = {
        user: result.user,
        tokens: result.tokens,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS) {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.message === AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE) {
          res.status(503).json({ error: error.message });
          return;
        }
      }

      console.error('Login error:', error);
      res.status(500).json({
        error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  /**
   * POST /internal/auth/refresh
   */
  static async refreshToken(
    req: Request<object, object, { refreshToken: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.REFRESH_TOKEN_REQUIRED,
        });
        return;
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      const response: RefreshTokenResponse = {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(401).json({
        error: AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN,
      });
    }
  }

  /**
   * POST /internal/auth/validate
   */
  static async validateToken(
    req: Request<object, object, { accessToken: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { accessToken } = req.body;

      if (!accessToken) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.ACCESS_TOKEN_REQUIRED,
        });
        return;
      }

      const result = await AuthService.validateToken(accessToken);

      if (!result.valid || !result.user) {
        res.status(401).json({
          valid: false,
          error: AUTH_MESSAGES.ERRORS.INVALID_TOKEN,
        });
        return;
      }

      const response: TokenValidationResponse = {
        valid: true,
        user: result.user,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(401).json({
        error: AUTH_MESSAGES.ERRORS.INVALID_TOKEN,
      });
    }
  }

  /**
   * POST /internal/auth/logout
   */
  static async logout(
    req: Request<object, object, { refreshToken: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.REFRESH_TOKEN_REQUIRED,
        });
        return;
      }

      await AuthService.logout(refreshToken);

      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.LOGOUT,
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.LOGOUT,
      });
    }
  }

  /**
   * GET /internal/auth/oauth/google/callback
   * Handle OAuth callback from Google (via Passport)
   * Redirects to Core Service with tokens OR account selection page
   */
  static async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserWithProfileAndAccount & {
        multipleAccounts?: {
          userId: string;
          username: string;
          displayName: string;
          avatarUrl: string | null;
        }[];
      };

      if (!user) {
        res.redirect(
          `${config.coreServicePublicUrl}/api/auth/google/callback?error=auth_failed`,
        );
        return;
      }

      // Check if multiple accounts exist
      if (user.multipleAccounts && user.multipleAccounts.length > 1) {
        // Store OAuth data temporarily in Redis for account selection
        const oauthSessionId = `oauth:${Date.now()}:${user.id}`;

        // Store OAuth provider data along with account options
        await redisService.getClient().setex(
          oauthSessionId,
          300, // 5 minutes TTL
          JSON.stringify({
            email: user.accounts?.[0]?.email || '',
            provider: 'GOOGLE', // From passport strategy
            providerId: user.accounts?.[0]?.providerId || '',
            multipleAccounts: user.multipleAccounts,
          }),
        );

        // Redirect to account selection page
        res.redirect(
          `${config.coreServicePublicUrl}/api/auth/google/callback?` +
            `selectAccount=true&` +
            `sessionId=${oauthSessionId}`,
        );
        return;
      }

      // Get email from accounts
      const email = user.accounts?.[0]?.email || '';

      // Generate JWT tokens
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

      // Redirect to Core Service callback with tokens
      res.redirect(
        `${config.coreServicePublicUrl}/api/auth/google/callback?` +
          `accessToken=${tokenPair.accessToken}&` +
          `refreshToken=${tokenPair.refreshToken}`,
      );
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(
        `${config.coreServicePublicUrl}/api/auth/google/callback?error=internal_error`,
      );
    }
  }

  /**
   * POST /internal/auth/forgot-password
   * Request a password reset token
   */
  static async forgotPassword(
    req: Request<object, object, { identifier: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { identifier } = req.body;

      if (!identifier) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.IDENTIFIER_REQUIRED,
        });
        return;
      }

      // Generate reset token (works for both email and username)
      const token = passwordResetService.generateResetToken(identifier);
      const resetUrl = `${config.frontendUrl}/auth/reset-password?token=${token}`;

      // Send password reset email via Core Service
      await AuthService.sendPasswordResetEmail(identifier, resetUrl);

      // Return success message without token/url (security)
      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_EMAIL_SENT,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      // Always return success message to prevent account enumeration
      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_EMAIL_SENT,
      });
    }
  }

  /**
   * POST /internal/auth/reset-password
   * Reset password using token
   */
  static async resetPassword(
    req: Request<object, object, { token: string; newPassword: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.TOKEN_AND_PASSWORD_REQUIRED,
        });
        return;
      }

      if (newPassword.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.PASSWORD_MIN_LENGTH,
        });
        return;
      }

      // Validate token
      const identifier = passwordResetService.validateResetToken(token);

      if (!identifier) {
        res.status(400).json({
          error: AUTH_MESSAGES.ERRORS.INVALID_RESET_TOKEN,
        });
        return;
      }

      // Reset password via Core Service (identifier can be email or username)
      await AuthService.resetPassword(identifier, newPassword);

      // Consume token
      passwordResetService.consumeResetToken(token);

      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_SUCCESS,
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  /**
   * GET /internal/auth/oauth/session/:sessionId
   * Get OAuth account options from temporary session
   */
  static async getOAuthSession(
    req: Request<{ sessionId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(400).json({
          error: 'Session ID is required',
        });
        return;
      }

      // Get session data from Redis
      const sessionData = await redisService.getClient().get(sessionId);

      if (!sessionData) {
        res.status(404).json({
          error: 'OAuth session not found or expired',
        });
        return;
      }

      const data = JSON.parse(sessionData) as {
        email: string;
        provider: string;
        providerId: string;
        multipleAccounts: AccountOption[];
      };

      res.status(200).json(data);
    } catch (error) {
      console.error('Get OAuth session error:', error);
      res.status(500).json({
        error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
      });
    }
  }

  /**
   * POST /internal/auth/oauth/link
   * Link OAuth account to selected user
   */
  static async linkOAuthAccount(
    req: Request<object, object, { sessionId: string; userId: string }>,
    res: Response,
  ): Promise<void> {
    try {
      const { sessionId, userId } = req.body;

      if (!sessionId || !userId) {
        res.status(400).json({
          error: 'Session ID and User ID are required',
        });
        return;
      }

      // Get session data from Redis
      const sessionData = await redisService.getClient().get(sessionId);

      if (!sessionData) {
        res.status(404).json({
          error: 'OAuth session not found or expired',
        });
        return;
      }

      const data = JSON.parse(sessionData) as {
        email: string;
        provider: string;
        providerId: string;
        multipleAccounts: AccountOption[];
      };

      const { email, provider, providerId } = data;

      // Link OAuth account to selected user via Core Service
      try {
        await coreServiceClient.linkOAuthToUser({
          userId,
          email,
          provider,
          providerId,
        });
      } catch (linkError) {
        console.error('Failed to link OAuth account:', linkError);
        res.status(500).json({
          error: 'Failed to link OAuth account to selected user',
        });
        return;
      }

      // Generate JWT tokens for the selected user
      const tokenPair = JwtService.generateTokenPair({
        userId,
        email,
      });

      // Store session in Redis
      const sessionDataNew: SessionData = {
        userId,
        email,
        refreshTokenId: tokenPair.refreshTokenId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      await redisService.storeSession(
        userId,
        tokenPair.refreshTokenId,
        sessionDataNew,
        JwtService.getRefreshTokenTTL(),
      );

      // Delete temporary OAuth session
      await redisService.getClient().del(sessionId);

      res.status(200).json({
        tokens: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        },
      });
    } catch (error) {
      console.error('Link OAuth account error:', error);
      res.status(500).json({
        error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR,
      });
    }
  }
}
