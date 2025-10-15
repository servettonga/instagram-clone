import { Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { VALIDATION_RULES, config } from '../config/config.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import { redisService, SessionData } from '../services/redisClient.js';
import { JwtService } from '../utils/jwt.js';
import type {
  AuthResponse,
  LoginCredentials,
  SignupData,
  UserWithProfileAndAccount,
  RefreshTokenResponse,
  TokenValidationResponse,
} from '@repo/shared-types';

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
   * Redirects to Core Service with tokens
   */
  static async handleOAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as UserWithProfileAndAccount;

      if (!user) {
        res.redirect(
          `${config.coreServiceUrl}/api/auth/google/callback?error=auth_failed`,
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
        `${config.coreServiceUrl}/api/auth/google/callback?` +
          `accessToken=${tokenPair.accessToken}&` +
          `refreshToken=${tokenPair.refreshToken}`,
      );
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(
        `${config.coreServiceUrl}/api/auth/google/callback?error=internal_error`,
      );
    }
  }
}
