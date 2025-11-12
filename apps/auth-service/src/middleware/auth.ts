import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../utils/jwt.js';
import { AUTH_MESSAGES } from '../constants/messages.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer token

  if (!token) {
    res.status(401).json({ error: AUTH_MESSAGES.ERRORS.ACCESS_TOKEN_REQUIRED });
    return;
  }

  try {
    const decoded = JwtService.verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch {
    res.status(403).json({ error: AUTH_MESSAGES.ERRORS.INVALID_TOKEN });
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = JwtService.verifyAccessToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch {
      // Invalid token, continue without user info
    }
  }

  next();
};
