import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config/config.js';
import { AUTH_MESSAGES } from '../constants/messages.js';
import type { UserWithProfileAndAccount } from '@repo/shared-types';

export interface CreateUserRequest {
  email: string;
  username: string;
  password: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface VerifyCredentialsRequest {
  identifier: string; // Email or username
  password: string;
}

export interface OAuthUserRequest {
  provider: string;
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export class CoreServiceClient {
  private client: AxiosInstance;
  private readonly baseURL: string;

  constructor() {
    this.baseURL = config.coreServiceUrl;

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // Increased timeout for password reset operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          console.error(
            `Core Service Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          );
        } else if (error.request) {
          console.error('Core Service: No response received', error.message);
        } else {
          console.error('Core Service Error:', error.message);
        }
        throw error;
      },
    );
  }

  /**
   * Create a new user in Core Service
   */
  async createUser(
    userData: CreateUserRequest,
  ): Promise<UserWithProfileAndAccount> {
    try {
      const response = await this.client.post<UserWithProfileAndAccount>(
        '/api/users',
        userData,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
          throw new Error(AUTH_MESSAGES.ERRORS.USER_EXISTS);
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE);
        }
      }
      throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_CREATE_USER_FAILED);
    }
  }

  /**
   * Verify user credentials via Core Service
   */
  async verifyCredentials(
    credentials: VerifyCredentialsRequest,
  ): Promise<UserWithProfileAndAccount | null> {
    try {
      const response = await this.client.post<UserWithProfileAndAccount>(
        '/api/auth/verify-credentials',
        credentials,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return null; // Invalid credentials
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE);
        }
      }
      throw new Error(
        AUTH_MESSAGES.ERRORS.CORE_SERVICE_VERIFY_CREDENTIALS_FAILED,
      );
    }
  }

  /**
   * Get user by ID from Core Service (internal endpoint)
   */
  async getUserById(userId: string): Promise<UserWithProfileAndAccount | null> {
    try {
      const response = await this.client.get<UserWithProfileAndAccount>(
        `/api/users/internal/${userId}`,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE);
        }
      }
      throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_FETCH_USER_FAILED);
    }
  }

  /**
   * Find or create OAuth user in Core Service
   */
  async findOrCreateOAuthUser(
    oauthData: OAuthUserRequest,
  ): Promise<UserWithProfileAndAccount> {
    try {
      const response = await this.client.post<UserWithProfileAndAccount>(
        '/api/auth/oauth',
        oauthData,
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE);
      }
      throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_OAUTH_USER_FAILED);
    }
  }

  /**
   * Reset password by identifier (email or username) - internal endpoint
   */
  async resetPassword(identifier: string, newPassword: string): Promise<void> {
    try {
      await this.client.post('/api/auth/internal-reset-password', {
        identifier,
        newPassword,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Pass through the error message from core service
        if (error.response?.status === 404) {
          const message: string =
            (error.response.data as { message?: string })?.message ||
            'No account found for this identifier';
          throw new Error(message);
        }
        if (error.code === 'ECONNREFUSED') {
          throw new Error(AUTH_MESSAGES.ERRORS.CORE_SERVICE_UNAVAILABLE);
        }
      }
      throw new Error('Failed to reset password');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    identifier: string,
    resetUrl: string,
  ): Promise<void> {
    try {
      await this.client.post('/api/auth/send-password-reset-email', {
        identifier,
        resetUrl,
      });
    } catch (error) {
      // Log error but don't throw to prevent account enumeration
      console.error('Failed to send password reset email:', error);
    }
  }

  /**
   * Link OAuth account to a specific user
   */
  async linkOAuthToUser(data: {
    userId: string;
    email: string;
    provider: string;
    providerId: string;
  }): Promise<void> {
    try {
      await this.client.post('/api/auth/link-oauth', data);
    } catch (error) {
      console.error('Failed to link OAuth account:', error);
      throw new Error('Failed to link OAuth account to user');
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const coreServiceClient = new CoreServiceClient();
