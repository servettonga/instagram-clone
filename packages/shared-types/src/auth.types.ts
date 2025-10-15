import { UserWithProfileAndAccount } from './user.types';
import type { Request } from 'express';

// ============================================
// REQUEST TYPES (Frontend → Backend)
// ============================================

export interface LoginCredentials {
  identifier: string; // Email or username
  password: string;
}

export interface SignupData {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

// ============================================
// RESPONSE TYPES (Backend → Frontend)
// ============================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// What login/signup endpoints return
export interface AuthResponse {
  user: UserWithProfileAndAccount;
  tokens: AuthTokens;
}

// Token validation response
export interface TokenValidationResponse {
  valid: boolean;
  user: UserWithProfileAndAccount;
}

export interface AuthenticatedRequest extends Request {
  user?: UserWithProfileAndAccount;
}

// Refresh token response
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

// Logout response
export interface LogoutResponse {
  message: string;
}

// OAuth response
export interface OAuthInitResponse {
  authUrl: string;
}

// Error response
export interface ErrorResponse {
  error?: string;
  message?: string;
}

// Client-specific types
export interface ClientAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
}
