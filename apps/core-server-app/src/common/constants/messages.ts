export const ERROR_MESSAGES = {
  // User-related errors
  USER_NOT_FOUND: (id: string | number) => `User with ID ${id} not found`,
  EMAIL_OR_USERNAME_EXISTS: 'Email or username already exists',

  // Auth errors
  INVALID_CREDENTIALS: 'Invalid credentials',
  UNAUTHORIZED: 'Unauthorized access',
  INVALID_TOKEN: 'Invalid or expired token',
  NO_AUTHORIZATION_HEADER: 'No authorization header',
  INVALID_AUTHORIZATION_FORMAT: 'Invalid authorization header format',
  REGISTRATION_FAILED: 'Registration failed',
  LOGIN_FAILED: 'Login failed',
  TOKEN_REFRESH_FAILED: 'Token refresh failed',
  LOGOUT_FAILED: 'Logout failed',
  OAUTH_INITIATION_FAILED: 'OAuth initiation failed',
  OAUTH_CALLBACK_FAILED: 'OAuth callback failed',
  ACCOUNT_DISABLED: 'Account is disabled',

  // OAuth errors
  PROVIDER_REQUIRED: 'Provider is required',
  INVALID_OAUTH_PARAMETERS: 'Invalid OAuth callback parameters',
  INVALID_EMAIL_FROM_PROVIDER: 'Invalid email format from OAuth provider',
  USERNAME_GENERATION_FAILED: 'Could not generate username from email',

  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'email must be an email',
  EMAIL_REQUIRED: 'email should not be empty',
  USERNAME_REQUIRED: 'username should not be empty',
  USERNAME_TOO_LONG: 'username must be shorter than or equal to 50 characters',
  PASSWORD_REQUIRED: 'password is required',
  PASSWORD_MIN_LENGTH: 'password must be at least 6 characters',
  INVALID_UUID_FORMAT: 'Invalid UUID format',

  // Generic errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  RESOURCE_NOT_FOUND: 'Resource not found',
  FORBIDDEN: 'Access forbidden',
  BAD_REQUEST: 'Bad request',
} as const;

export const SUCCESS_MESSAGES = {
  // User messages
  USER_CREATED: 'User created successfully',
  USER_RETRIEVED: 'User retrieved successfully',
  USERS_RETRIEVED: 'Users retrieved successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',

  // Auth messages
  REGISTRATION_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  TOKEN_REFRESH_SUCCESS: 'Token refreshed successfully',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_VALID: 'Token is valid',

  // Info messages
  NO_USERS_FOUND: 'No users found',
} as const;

export const HTTP_MESSAGES = SUCCESS_MESSAGES; // Alias for backward compatibility
