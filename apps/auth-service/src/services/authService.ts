import bcrypt from 'bcryptjs';
import { JwtService } from '../utils/jwt.js';
import { config } from '../config/config.js';
import { AUTH_MESSAGES } from '../constants/messages.js';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Mock user storage (to be replaced with database later)
const users: User[] = [];
let userIdCounter = 1;

export class AuthService {
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = users.find((user) => user.email === userData.email);
    if (existingUser) {
      throw new Error(AUTH_MESSAGES.ERRORS.USER_EXISTS);
    }

    // Hash password
    const saltRounds = config.password.saltRound;
    const passwordHash = await bcrypt.hash(userData.password, saltRounds);

    // Create user
    const newUser: User = {
      id: userIdCounter.toString(),
      email: userData.email,
      name: userData.name,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(newUser);
    userIdCounter++;

    // Generate tokens
    const tokens = JwtService.generateTokenPair({
      userId: newUser.id,
      email: newUser.email,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
      tokens,
    };
  }

  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Find user
    const user = users.find((u) => u.email === credentials.email);
    if (!user) {
      throw new Error(AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      credentials.password,
      user.passwordHash,
    );
    if (!isValidPassword) {
      throw new Error(AUTH_MESSAGES.ERRORS.INVALID_CREDENTIALS);
    }

    // Generate tokens
    const tokens = JwtService.generateTokenPair({
      userId: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      tokens,
    };
  }

  static refreshToken(refreshToken: string): { accessToken: string } {
    try {
      const decoded = JwtService.verifyRefreshToken(refreshToken);

      // Check if user still exists
      const user = users.find((u) => u.id === decoded.userId);
      if (!user) {
        throw new Error(AUTH_MESSAGES.ERRORS.USER_NOT_FOUND);
      }

      // Generate new access token
      const { accessToken } = JwtService.generateTokenPair({
        userId: user.id,
        email: user.email,
      });

      return { accessToken };
    } catch (error) {
      console.error('RefreshToken verification error:', error);
      throw new Error(AUTH_MESSAGES.ERRORS.INVALID_REFRESH_TOKEN);
    }
  }

  static getUserById(userId: string): Omit<User, 'passwordHash'> | null {
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
