import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { randomBytes } from 'crypto';
import { config } from '../config/config.js';

export interface TokenPayload {
  userId: string;
  email: string;
  jti: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenId: string;
  refreshTokenId: string;
}

export class JwtService {
  private static generateTokenId(): string {
    return randomBytes(16).toString('hex');
  }

  static generateTokenPair(payload: {
    userId: string;
    email: string;
  }): TokenPair {
    const accessTokenId = this.generateTokenId();
    const refreshTokenId = this.generateTokenId();

    const accessTokenOptions: SignOptions = {
      expiresIn: config.jwt.accessExpiresIn as StringValue,
    };

    const refreshTokenOptions: SignOptions = {
      expiresIn: config.jwt.refreshExpiresIn as StringValue,
    };

    const accessToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        jti: accessTokenId,
      },
      config.jwt.accessSecret,
      accessTokenOptions,
    );

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        jti: refreshTokenId,
      },
      config.jwt.refreshSecret,
      refreshTokenOptions,
    );

    return {
      accessToken,
      refreshToken,
      accessTokenId,
      refreshTokenId,
    };
  }

  static verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
  }

  static verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  }

  static decodeToken(token: string): TokenPayload | null {
    try {
      return jwt.decode(token) as TokenPayload;
    } catch {
      return null;
    }
  }

  static getTokenTTL(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }

  static getAccessTokenTTL(): number {
    return this.getTokenTTL(config.jwt.accessExpiresIn);
  }

  static getRefreshTokenTTL(): number {
    return this.getTokenTTL(config.jwt.refreshExpiresIn);
  }
}
