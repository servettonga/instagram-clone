// Auth API functions

import apiClient from './client';
import type { AuthResponse, LoginCredentials, SignupData, UserWithProfile } from '@/types/auth';
import Cookies from 'js-cookie';

// Cookie options for development (To be adjusted for production)
const cookieOptions = {
  expires: 7, // 7 days
  sameSite: 'lax' as const, // Allow cross-site requests for navigation
  secure: false, // To be set true in production with HTTPS
  path: '/',
};

export const authApi = {
  // Login with email/password
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/api/auth/login', credentials);

    // Extract tokens from nested object
    const { accessToken, refreshToken } = data.tokens;

    // Store tokens
    Cookies.set('accessToken', accessToken, { ...cookieOptions, expires: 7 });
    Cookies.set('refreshToken', refreshToken, { ...cookieOptions, expires: 30 });

    return data;
  },

  // Signup
  signup: async (signupData: SignupData): Promise<AuthResponse> => {
    const { data } = await apiClient.post('/api/auth/signup', signupData);

    // Store tokens
    const { accessToken, refreshToken } = data.tokens;

    Cookies.set('accessToken', accessToken, { ...cookieOptions, expires: 7 });
    Cookies.set('refreshToken', refreshToken, { ...cookieOptions, expires: 30 });

    return data;
  },

  // Logout
  logout: async (): Promise<void> => {
    const refreshToken = Cookies.get('refreshToken');

    if (refreshToken) {
      try {
        await apiClient.post('/api/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    // Always clear cookies
    Cookies.remove('accessToken', { path: '/' });
    Cookies.remove('refreshToken', { path: '/' });
  },

  // Get current user
  getCurrentUser: async (): Promise<UserWithProfile> => {
    const { data } = await apiClient.get('/api/auth/me');
    return data;
  },

  // Change password
  changePassword: async (oldPassword: string, newPassword: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/api/auth/change-password', {
      oldPassword,
      newPassword,
    });
    return data;
  },

  // Set password (for OAuth users)
  setPassword: async (password: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/api/auth/set-password', {
      password,
    });
    return data;
  },

  // Forgot password
  forgotPassword: async (identifier: string): Promise<{ message: string; token?: string; resetUrl?: string }> => {
    const { data } = await apiClient.post('/api/auth/forgot-password', { identifier });
    return data;
  },

  // Reset password
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const { data } = await apiClient.post('/api/auth/reset-password', {
      token,
      newPassword,
    });
    return data;
  },

  // OAuth login URLs
  getGoogleAuthUrl: (): string => {
    // In development, use relative URL (works via Next.js rewrites on local network)
    // In production, use full URL from env
    if (process.env.NODE_ENV === 'development') {
      return '/api/auth/login/google';
    }
    return `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/login/google`;
  },

  // OAuth account selection
  getOAuthSession: async (sessionId: string): Promise<{ email: string; multipleAccounts: Array<{ userId: string; username: string; displayName: string; avatarUrl: string | null }> }> => {
    const { data } = await apiClient.get(`/api/auth/oauth/session/${sessionId}`);
    return data;
  },

  linkOAuthAccount: async (sessionId: string, userId: string): Promise<{ tokens: { accessToken: string; refreshToken: string } }> => {
    const { data } = await apiClient.post('/api/auth/oauth/link', {
      sessionId,
      userId,
    });
    return data;
  },
};
