/**
 * Application route constants
 * Centralized route definitions for consistent navigation throughout the app
 */

export const ROUTES = {
  // Auth routes
  AUTH: {
    LOGIN: '/auth/login',
    SIGNUP: '/auth/signup',
    FORGOT_PASSWORD: '/auth/forgot-password',
  },

  // App routes
  APP: {
    FEED: '/app/feed',
    EXPLORE: '/app/explore',
    MESSAGES: '/app/messages',
    NOTIFICATIONS: '/app/notifications',
    CREATE: '/app/create',
    SEARCH: '/app/search',

    // Profile routes
    PROFILE: {
      ME: '/app/profile/me',
      USER: (username: string) => `/app/profile/${username}`,
    },

    // Post routes
    POST: {
      VIEW: (postId: string) => `/app/post/${postId}`,
    },

    // Settings routes
    SETTINGS: {
      ACCOUNT: '/app/settings/account',
      PRIVACY: '/app/settings/privacy',
      NOTIFICATIONS: '/app/settings/notifications',
    },

    // Other routes
    SAVED: '/app/saved',
    ACTIVITY: '/app/activity',
  },
} as const;
