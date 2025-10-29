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

  // Password errors
  INVALID_OLD_PASSWORD: 'Current password is incorrect',
  NEW_PASSWORD_SAME_AS_OLD:
    'New password must be different from current password',
  NO_LOCAL_ACCOUNT_FOR_PASSWORD_CHANGE:
    'You cannot change password for OAuth-only accounts. Set a password first.',
  NO_PASSWORD_SET: 'No password set for this account',

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

  // File upload errors
  NO_FILE_UPLOADED: 'No file uploaded',
  INVALID_FILE_TYPE: 'Only image files (jpg, jpeg, png, gif, webp) are allowed',
  FILE_TOO_LARGE: (maxSize: string) => `File size must be less than ${maxSize}`,

  // Authorization errors
  INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  NOT_RESOURCE_OWNER: 'You do not have permission to modify this resource',

  // Generic errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  RESOURCE_NOT_FOUND: 'Resource not found',
  FORBIDDEN: 'Access forbidden',
  BAD_REQUEST: 'Bad request',

  // Profile errors
  PROFILE_NOT_FOUND: 'Profile not found',

  // Post errors
  POST_NOT_FOUND: (id: string) => `Post with ID ${id} not found`,
  POST_ALREADY_ARCHIVED: 'Post is already archived',
  POST_NOT_ARCHIVED: 'Post is not archived',

  // Asset errors
  ASSET_NOT_FOUND: (id: string) => `Asset with ID ${id} not found`,
  ASSETS_NOT_FOUND: 'One or more assets not found',
  ASSET_IN_USE: 'Asset is still in use and cannot be deleted',
  INVALID_ASSET_OWNER: 'You can only attach assets that you uploaded',
  MAX_ASSETS_EXCEEDED: (max: number) =>
    `You can attach a maximum of ${max} assets`,
  SEARCH_QUERY_EMPTY: 'Search query cannot be empty',
  PROFILE_USERNAME_NOT_FOUND: (username: string) =>
    `Profile with username ${username} not found`,
} as const;

export const SUCCESS_MESSAGES = {
  // User messages
  USER_CREATED: 'User created successfully',
  USER_RETRIEVED: 'User retrieved successfully',
  USERS_RETRIEVED: 'Users retrieved successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',
  AVATAR_UPLOADED: 'Avatar uploaded successfully',

  // Auth messages
  REGISTRATION_SUCCESS: 'User registered successfully',
  LOGIN_SUCCESS: 'Login successful',
  TOKEN_REFRESH_SUCCESS: 'Token refreshed successfully',
  LOGOUT_SUCCESS: 'Logout successful',
  TOKEN_VALID: 'Token is valid',

  // Password messages
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_UPDATED: 'Password updated successfully',
  PASSWORD_SET:
    'Password set successfully. You can now login with email/password.',

  // Info messages
  NO_USERS_FOUND: 'No users found',

  // Post messages
  POST_CREATED: 'Post created successfully',
  POST_UPDATED: 'Post updated successfully',
  POST_DELETED: 'Post deleted successfully',
  POST_ARCHIVED: 'Post archived successfully',
  POST_UNARCHIVED: 'Post unarchived successfully',
  POST_RETRIEVED: 'Post retrieved successfully',
  POSTS_RETRIEVED: 'Posts retrieved successfully',
  FEED_RETRIEVED: 'Feed retrieved successfully',

  // Asset messages
  ASSET_UPLOADED: 'Asset uploaded successfully',
  ASSET_DELETED: 'Asset deleted successfully',
} as const;

export const HTTP_MESSAGES = SUCCESS_MESSAGES; // Alias for backward compatibility
