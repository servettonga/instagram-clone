// API endpoint constants

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },

  // User endpoints
  USERS: {
    BASE: '/api/users',
    BY_ID: (id: string) => `/api/users/${id}`,
    BY_USERNAME: (username: string) => `/api/users/username/${username}`,
    FOLLOWERS: (id: string) => `/api/users/${id}/followers`,
    FOLLOWING: (id: string) => `/api/users/${id}/following`,
    FOLLOW: (id: string) => `/api/users/${id}/follow`,
    FOLLOW_STATUS: (id: string) => `/api/users/${id}/follow-status`,
    FOLLOW_REQUESTS: '/api/users/me/follow-requests',
    APPROVE_FOLLOW_REQUEST: (userId: string) => `/api/users/me/follow-requests/${userId}/approve`,
    REJECT_FOLLOW_REQUEST: (userId: string) => `/api/users/me/follow-requests/${userId}/reject`,
  },

  // Post endpoints
  POSTS: {
    BASE: '/api/posts',
    BY_ID: (id: string) => `/api/posts/${id}`,
    FEED: '/api/posts/feed',
    BY_USER: (username: string) => `/api/posts/user/${username}`,
    LIKE: (id: string) => `/api/posts/${id}/like`,
    LIKES: (id: string) => `/api/posts/${id}/likes`,
    COMMENTS: (id: string) => `/api/posts/${id}/comments`,
  },

  // Comment endpoints
  COMMENTS: {
    BASE: '/api/comments',
    BY_ID: (id: string) => `/api/comments/${id}`,
    REPLIES: (id: string) => `/api/comments/${id}/replies`,
    LIKE: (id: string) => `/api/comments/${id}/like`,
    LIKES: (id: string) => `/api/comments/${id}/likes`,
  },

  // Notification endpoints
  NOTIFICATIONS: {
    BASE: '/api/notifications',
    PREFERENCES: '/api/notifications/preferences',
    UNREAD_STATUS: '/api/notifications/unread/status',
    MARK_READ: (id: string) => `/api/notifications/${id}/read`,
    MARK_ALL_READ: '/api/notifications/read-all',
  },

    // Chat endpoints
  CHATS: {
    BASE: '/api/chats',
    BY_ID: (id: string) => `/api/chats/${id}`,
    MESSAGES: (id: string) => `/api/chats/${id}/messages`,
    PARTICIPANTS: (id: string) => `/api/chats/${id}/participants`,
    PRIVATE: '/api/chats/private',
    GROUP: '/api/chats/group',
    READ: (id: string) => `/api/chats/${id}/read`,
  },
} as const;
