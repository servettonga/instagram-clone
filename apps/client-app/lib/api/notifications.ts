// API functions for notifications and notification preferences
import apiClient from './client';
import { API_ENDPOINTS } from './constants';
import type {
  NotificationPreferences as NotificationPreferencesBase,
  UpdateNotificationPreferencesDto,
  NotificationType,
} from '@repo/shared-types';

// Frontend version with string dates (from JSON)
export interface NotificationPreferences extends Omit<NotificationPreferencesBase, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface UnreadStatusResponse {
  hasUnread: boolean;
}

export type { UpdateNotificationPreferencesDto };

export const notificationsApi = {
  /**
   * Get user notifications (paginated)
   */
  getNotifications: async (cursor?: string, limit = 20): Promise<NotificationsResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());

    const url = `${API_ENDPOINTS.NOTIFICATIONS.BASE}?${params.toString()}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Check if user has unread notifications
   */
  getUnreadStatus: async (): Promise<UnreadStatusResponse> => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_STATUS);
    return response.data;
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (notificationId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId));
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ count: number }> => {
    const response = await apiClient.patch(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ);
    return response.data;
  },

  /**
   * Get current user's notification preferences
   */
  getPreferences: async (): Promise<NotificationPreferences> => {
    const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES);
    return response.data;
  },

  /**
   * Update notification preferences
   */
  updatePreferences: async (
    preferences: UpdateNotificationPreferencesDto
  ): Promise<NotificationPreferences> => {
    const response = await apiClient.put(API_ENDPOINTS.NOTIFICATIONS.PREFERENCES, preferences);
    return response.data;
  },
};
