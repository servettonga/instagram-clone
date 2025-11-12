export const RABBITMQ_EXCHANGES = {
  NOTIFICATIONS: 'notifications',
} as const;

export const RABBITMQ_QUEUES = {
  NOTIFICATIONS: 'notifications',
} as const;

export const RABBITMQ_ROUTING_KEYS = {
  NOTIFICATION_CREATED: 'notification.*',
  PASSWORD_RESET: 'email.password_reset',
} as const;
