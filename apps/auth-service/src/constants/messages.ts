export const AUTH_MESSAGES = {
  // Success messages
  SUCCESS: {
    REGISTRATION: 'User registered successfully',
    LOGIN: 'Login successful',
    TOKEN_REFRESH: 'Token refreshed successfully',
    PROFILE_RETRIEVED: 'Profile retrieved successfully',
    LOGOUT: 'Logout successful',
    TOKEN_VALID: 'Token is valid',
  },

  // Error messages
  ERRORS: {
    // Validation errors
    ALL_FIELDS_REQUIRED: 'All fields are required',
    EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
    PASSWORD_MIN_LENGTH: 'Password must be at least 6 characters long',
    INVALID_EMAIL_FORMAT: 'Invalid email format',
    REFRESH_TOKEN_REQUIRED: 'Refresh token is required',
    ACCESS_TOKEN_REQUIRED: 'Access token required',
    TOKEN_REQUIRED: 'Token is required',

    // Authentication errors
    USER_EXISTS: 'User with this email already exists',
    INVALID_CREDENTIALS: 'Invalid email or password',
    INVALID_REFRESH_TOKEN: 'Invalid refresh token',
    INVALID_TOKEN: 'Invalid or expired token',
    USER_NOT_AUTHENTICATED: 'User not authenticated',
    USER_NOT_FOUND: 'User not found',

    // Server errors
    INTERNAL_SERVER_ERROR: 'Internal server error',
    ROUTE_NOT_FOUND: 'Route not found',
  },

  // Health check messages
  HEALTH: {
    STATUS_OK: 'OK',
    SERVICE_RUNNING: 'Auth service is running',
  },

  // HTTP status codes with messages
  STATUS: {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
  },
} as const;

// Type for message keys (for TypeScript intellisense)
export type AuthMessage = typeof AUTH_MESSAGES;
