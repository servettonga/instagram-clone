// Re-export shared types with any client-specific additions

export type {
  User,
  Profile,
  UserWithProfile,
  LoginCredentials,
  SignupData,
  AuthTokens,
  AuthResponse,
  UserWithProfileAndAccount,
} from '@repo/shared-types';

// Client-specific types
export interface ClientAuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
}
