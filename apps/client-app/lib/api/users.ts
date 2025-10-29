// Users API functions

import apiClient from './client';
import type { UserWithProfileAndAccount } from '@/types/auth';

export interface UpdateProfileData {
  displayName?: string;
  username?: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  birthday?: string;
  isPublic?: boolean;
}

export interface SearchUsersParams {
  page?: number;
  limit?: number;
}

export interface SearchUsersResponse {
  data: UserWithProfileAndAccount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const usersApi = {
  // Get user by username
  getUserByUsername: async (username: string): Promise<UserWithProfileAndAccount> => {
    const { data } = await apiClient.get(`/api/users/by-username/${username}`);
    return data;
  },

  // Update user profile
  updateProfile: async (userId: string, data: UpdateProfileData): Promise<UserWithProfileAndAccount> => {
    const { data: responseData } = await apiClient.patch(`/api/users/${userId}`, data);
    return responseData;
  },

  // Check username availability
  // Uses dedicated availability endpoint that always returns 200
  checkUsernameAvailability: async (username: string): Promise<{ available: boolean; username: string }> => {
    const { data } = await apiClient.get(`/api/users/check-username/${username}`);
    return data;
  },

  // Upload user avatar
  uploadAvatar: async (userId: string, file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const { data } = await apiClient.post(`/api/users/${userId}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },

  // Delete user account
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/users/${userId}`);
  },

  // Search users
  searchUsers: async (query: string, params?: SearchUsersParams): Promise<SearchUsersResponse> => {
    const { data } = await apiClient.get<SearchUsersResponse>('/api/users/search', {
      params: { q: query, ...params },
    });
    return data;
  },
};
