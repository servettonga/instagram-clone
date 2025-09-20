import dotenv from 'dotenv';
import path from 'path';

// Determine which environment file to load based on NODE_ENV
const isDevelopment = process.env.NODE_ENV === 'development';
const envFile = isDevelopment ? '.env' : '.env.production';

const envPath = path.resolve(process.cwd(), envFile);

// Load environment variables once
dotenv.config({
  path: envPath,
});

export const config = {
  port: process.env.AUTH_PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  redis: {
    url: isDevelopment
      ? `redis://:${process.env.REDIS_PASSWORD || 'password'}@localhost:${process.env.REDIS_PORT || 6380}`
      : `redis://:${process.env.REDIS_PASSWORD || 'password'}@redis:6379`,
  },
  password: {
    saltRound: 12,
  },
};

// Validation
if (!config.jwt.accessSecret) {
  throw new Error(
    `JWT_ACCESS_SECRET environment variable is required (NODE_ENV: ${process.env.NODE_ENV}, looking for: ${envFile})`,
  );
}

if (!config.jwt.refreshSecret) {
  throw new Error(
    `JWT_REFRESH_SECRET environment variable is required (NODE_ENV: ${process.env.NODE_ENV}, looking for: ${envFile})`,
  );
}

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;
