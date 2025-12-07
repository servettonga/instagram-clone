import dotenv from 'dotenv';
import path from 'path';

// Always load .env from project root
const envPath = path.resolve(process.cwd(), '../../.env');
dotenv.config({ path: envPath });

const isDevelopment = process.env.NODE_ENV !== 'production';

export const config = {
  port: process.env.AUTH_PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  coreServiceUrl: isDevelopment
    ? process.env.CORE_SERVICE_URL || 'http://localhost:8000'
    : process.env.CORE_SERVICE_URL || 'http://core-server:8000',
  // Core Service Public URL (for OAuth redirects from browser)
  coreServicePublicUrl: process.env.CORE_PUBLIC_URL || 'http://localhost:8000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    url:
      process.env.REDIS_URL ||
      (isDevelopment
        ? `redis://:${process.env.REDIS_PASSWORD || 'password'}@localhost:${process.env.REDIS_PORT || 6380}`
        : `redis://:${process.env.REDIS_PASSWORD || 'password'}@redis:${process.env.REDIS_PORT || 6379}`),
  },
  password: {
    saltRound: 12,
  },
  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // Passport OAuth callback (Google redirects here)
      // This MUST be accessible from the user's browser, not just internal Docker network
      // Use AUTH_PUBLIC_URL for production (e.g., https://auth.yourdomain.com)
      redirectUri: process.env.AUTH_PUBLIC_URL
        ? `${process.env.AUTH_PUBLIC_URL}/internal/auth/oauth/google/callback`
        : 'http://localhost:4000/internal/auth/oauth/google/callback',
    },
  },
};

// Validation
if (!config.jwt.accessSecret) {
  throw new Error(
    `JWT_ACCESS_SECRET environment variable is required (NODE_ENV: ${process.env.NODE_ENV})`,
  );
}

if (!config.jwt.refreshSecret) {
  throw new Error(
    `JWT_REFRESH_SECRET environment variable is required (NODE_ENV: ${process.env.NODE_ENV})`,
  );
}

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;
