export const ERROR_MESSAGES = {
  // User-related errors
  USER_NOT_FOUND: (id: number) => `User with ID ${id} not found`,
  EMAIL_OR_USERNAME_EXISTS: 'Email or username already exists',

  // Validation errors
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'email must be an email',
  EMAIL_REQUIRED: 'email should not be empty',
  USERNAME_REQUIRED: 'username should not be empty',
  USERNAME_TOO_LONG: 'username must be shorter than or equal to 20 characters',

  // Generic errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  RESOURCE_NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
} as const;

export const HTTP_MESSAGES = {
  // Success messages
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',

  // Info messages
  NO_USERS_FOUND: 'No users found',
} as const;
