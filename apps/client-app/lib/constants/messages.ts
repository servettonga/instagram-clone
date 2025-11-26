/**
 * Application message constants
 * Centralized message definitions for consistent messaging throughout the app
 */

export const AUTH_MESSAGES = {
  // OAuth Account Selection
  OAUTH: {
    SELECT_ACCOUNT_TITLE: 'Select Account',
    SELECT_ACCOUNT_DESCRIPTION: 'Choose which account to link with your Google account',
    LOADING: 'Loading accounts...',
    INVALID_SESSION: 'Invalid or expired session',
    FETCH_ACCOUNTS_ERROR: 'Failed to load account options. Please try again.',
    LINK_ACCOUNT_ERROR: 'Failed to link account. Please try again.',
    COMPLETING_SIGNIN: 'Completing sign in...',
    BACK_TO_LOGIN: 'Back to Login',
  },

  // Login
  LOGIN: {
    TITLE: 'Sign In',
    SUBTITLE: 'Welcome back to Innogram',
    ERROR_INVALID_CREDENTIALS: 'Invalid email or password',
    ERROR_MISSING_TOKENS: 'Authentication failed. Please try again.',
  },

  // Signup
  SIGNUP: {
    TITLE: 'Create Account',
    SUBTITLE: 'Join Innogram today',
  },

  // General
  GENERAL: {
    ERROR_TITLE: 'Error',
    ERROR_GENERIC: 'Something went wrong. Please try again.',
  },
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
} as const;
