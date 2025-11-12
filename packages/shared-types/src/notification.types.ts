export enum NotificationType {
  FOLLOW_REQUEST = 'FOLLOW_REQUEST',
  FOLLOW_ACCEPTED = 'FOLLOW_ACCEPTED',
  POST_LIKE = 'POST_LIKE',
  POST_COMMENT = 'POST_COMMENT',
  COMMENT_LIKE = 'COMMENT_LIKE',
  COMMENT_REPLY = 'COMMENT_REPLY',
  MENTION = 'MENTION',
  SYSTEM = 'SYSTEM',
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  // Preference flags (set by producer after checking user preferences)
  sendWeb?: boolean;
  sendEmail?: boolean;
}

export interface NotificationEntity {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  metadata?: any;
  isRead: boolean;
  emailSent: boolean;
  createdAt: Date;
}

export interface NotificationUser {
  id: string;
  email: string;
  username: string;
  profile?: {
    displayName?: string;
  };
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  // Web notifications (in-app)
  followWeb: boolean;
  likeWeb: boolean;
  commentWeb: boolean;
  replyWeb: boolean;
  mentionWeb: boolean;
  // Email notifications
  followEmail: boolean;
  likeEmail: boolean;
  commentEmail: boolean;
  replyEmail: boolean;
  mentionEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateNotificationPreferencesDto {
  followWeb?: boolean;
  likeWeb?: boolean;
  commentWeb?: boolean;
  replyWeb?: boolean;
  mentionWeb?: boolean;
  followEmail?: boolean;
  likeEmail?: boolean;
  commentEmail?: boolean;
  replyEmail?: boolean;
  mentionEmail?: boolean;
}
