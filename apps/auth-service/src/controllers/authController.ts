import { Request, Response } from 'express';
import {
  AuthService,
  RegisterRequest,
  LoginRequest,
} from '../services/authService.js';
import { JwtService } from '../utils/jwt.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AUTH_MESSAGES } from '../constants/messages.js';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body as RegisterRequest;

      // Basic validation
      if (!name || !email || !password) {
        res
          .status(400)
          .json({ error: AUTH_MESSAGES.ERRORS.ALL_FIELDS_REQUIRED });
        return;
      }

      if (password.length < 6) {
        res
          .status(400)
          .json({ error: AUTH_MESSAGES.ERRORS.PASSWORD_MIN_LENGTH });
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res
          .status(400)
          .json({ error: AUTH_MESSAGES.ERRORS.INVALID_EMAIL_FORMAT });
        return;
      }

      const result = await AuthService.register({ name, email, password });

      res.status(201).json({
        message: AUTH_MESSAGES.SUCCESS.REGISTRATION,
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === AUTH_MESSAGES.ERRORS.USER_EXISTS
      ) {
        res.status(409).json({ error: error.message });
        return;
      }

      console.error('Registration error:', error);
      res
        .status(500)
        .json({ error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR });
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      // Basic validation
      if (!email || !password) {
        res
          .status(400)
          .json({ error: AUTH_MESSAGES.ERRORS.EMAIL_PASSWORD_REQUIRED });
        return;
      }

      const result = await AuthService.login({ email, password });

      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.LOGIN,
        user: result.user,
        tokens: result.tokens,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS
      ) {
        res
          .status(401)
          .json({ error: AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS });
        return;
      }

      console.error('Login error', error);
      res
        .status(500)
        .json({ error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR });
    }
  }

  static refreshToken(req: Request, res: Response): void {
    try {
      const { refreshToken } = req.body as { refreshToken: string };
      if (!refreshToken) {
        res
          .status(400)
          .json({ error: AUTH_MESSAGES.ERRORS.REFRESH_TOKEN_REQUIRED });
        return;
      }

      const result = AuthService.refreshToken(refreshToken);

      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.TOKEN_REFRESH,
        accessToken: result.accessToken,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN
      ) {
        res.status(401).json({ error: error.message });
        return;
      }

      console.error('Token refresh error:', error);
      res
        .status(500)
        .json({ error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR });
    }
  }

  static getProfile(req: AuthenticatedRequest, res: Response): void {
    try {
      if (!req.user) {
        res
          .status(401)
          .json({ error: AUTH_MESSAGES.ERRORS.USER_NOT_AUTHENTICATED });
        return;
      }

      const user = AuthService.getUserById(req.user.userId);
      if (!user) {
        res.status(404).json({ error: AUTH_MESSAGES.ERRORS.USER_NOT_FOUND });
        return;
      }

      res.status(200).json({
        message: AUTH_MESSAGES.SUCCESS.PROFILE_RETRIEVED,
        user,
      });
    } catch (error) {
      console.error('Get profile error', error);
      res
        .status(500)
        .json({ error: AUTH_MESSAGES.ERRORS.INTERNAL_SERVER_ERROR });
    }
  }

  static logout(req: Request, res: Response): void {
    // For now, tokens will be removed by client
    // Removed token will be blacklisted
    res.status(200).json({
      message: AUTH_MESSAGES.SUCCESS.LOGOUT,
    });
  }

  static validateToken(req: AuthenticatedRequest, res: Response): void {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        res.status(400).json({ error: AUTH_MESSAGES.ERRORS.TOKEN_REQUIRED });
        return;
      }

      const decoded = JwtService.verifyAccessToken(token);
      const user = AuthService.getUserById(decoded.userId);

      if (!user) {
        res.status(404).json({ error: AUTH_MESSAGES.ERRORS.USER_NOT_FOUND });
        return;
      }

      res.status(200).json({
        valid: true,
        user,
      });
    } catch (error) {
      res.status(401).json({
        valid: false,
        error: AUTH_MESSAGES.ERRORS.INVALID_TOKEN,
      });
    }
  }
}
