export const AUTH_MESSAGES = {
  // Success messages
  SUCCESS: {
    REGISTRATION: 'User registered successfully',
    LOGIN: 'Login successful',
    TOKEN_REFRESH: 'Token refreshed successfully',
    PROFILE_RETRIEVED: 'Profile retrieved successfully',
    LOGOUT: 'Logout successful',
    TOKEN_VALID: 'Token is valid',
    OAUTH_INITIATED: 'OAuth flow initiated successfully',
    OAUTH_CALLBACK_SUCCESS: 'OAuth authentication successful',
  },

  // Error messages
  ERRORS: {
    // Validation errors
    ALL_FIELDS_REQUIRED: 'All fields are required',
    EMAIL_PASSWORD_REQUIRED: 'Email and password are required',
    IDENTIFIER_PASSWORD_REQUIRED: 'Email/username and password are required',
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

    // OAuth errors
    OAUTH_PROVIDER_REQUIRED: 'OAuth provider is required',
    OAUTH_STATE_INVALID: 'Invalid OAuth state',
    OAUTH_CODE_REQUIRED: 'OAuth code is required',
    OAUTH_INITIATION_FAILED: 'Failed to initiate OAuth flow',
    OAUTH_CALLBACK_FAILED: 'OAuth callback failed',
    OAUTH_USER_CREATION_FAILED: 'Failed to create OAuth user',

    // Core Service errors
    CORE_SERVICE_UNAVAILABLE: 'Core service is unavailable',
    CORE_SERVICE_CREATE_USER_FAILED: 'Failed to create user in Core Service',
    CORE_SERVICE_VERIFY_CREDENTIALS_FAILED: 'Failed to verify credentials',
    CORE_SERVICE_FETCH_USER_FAILED: 'Failed to fetch user from Core Service',
    CORE_SERVICE_OAUTH_USER_FAILED: 'Failed to find or create OAuth user',

    // Server errors
    INTERNAL_SERVER_ERROR: 'Internal server error',
    ROUTE_NOT_FOUND: 'Route not found',
  },

  // Health check messages
  HEALTH: {
    STATUS_OK: 'OK',
    SERVICE_RUNNING: 'Auth service is running',
    REDIS_CONNECTED: 'Redis is connected',
    REDIS_DISCONNECTED: 'Redis is disconnected',
    CORE_SERVICE_HEALTHY: 'Core service is healthy',
    CORE_SERVICE_UNHEALTHY: 'Core service is unhealthy',
  },

  // HTTP status codes with messages
  STATUS: {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  },
} as const;

// Type for message keys (for TypeScript intellisense)
export type AuthMessage = typeof AUTH_MESSAGES;
