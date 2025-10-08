import { UserWithProfileAndAccount } from '../../users/payloads';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: UserWithProfileAndAccount;
  tokens: AuthTokens;
}

export interface TokenValidationResponse {
  valid: boolean;
  user: UserWithProfileAndAccount;
}

export interface OAuthInitResponse {
  authUrl: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface LogoutResponse {
  message: string;
}

export interface ErrorResponse {
  error?: string;
  message?: string;
}
