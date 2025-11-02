// Follow API client
import apiClient from './client';
import { API_ENDPOINTS } from './constants';
import type {
  FollowResponse,
  FollowersListResponse,
  FollowingListResponse,
  FollowRequestsListResponse,
  FollowStatusResponse,
} from '@repo/shared-types';

class FollowAPI {
  /**
   * Follow a user (or send follow request if private)
   */
  async followUser(userId: string): Promise<FollowResponse> {
    const { data } = await apiClient.post<FollowResponse>(API_ENDPOINTS.USERS.FOLLOW(userId));
    return data;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<{ message: string }> {
    const { data } = await apiClient.delete<{ message: string }>(
      API_ENDPOINTS.USERS.FOLLOW(userId),
    );
    return data;
  }

  /**
   * Get followers of a user
   */
  async getFollowers(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<FollowersListResponse> {
    const { data } = await apiClient.get<FollowersListResponse>(
      API_ENDPOINTS.USERS.FOLLOWERS(userId),
      {
        params: { page, limit },
      },
    );
    return data;
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(
    userId: string,
    page?: number,
    limit?: number,
  ): Promise<FollowingListResponse> {
    const { data } = await apiClient.get<FollowingListResponse>(
      API_ENDPOINTS.USERS.FOLLOWING(userId),
      {
        params: { page, limit },
      },
    );
    return data;
  }

  /**
   * Get pending follow requests (for private profiles)
   */
  async getFollowRequests(
    page?: number,
    limit?: number,
  ): Promise<FollowRequestsListResponse> {
    const { data } = await apiClient.get<FollowRequestsListResponse>(
      API_ENDPOINTS.USERS.FOLLOW_REQUESTS,
      {
        params: { page, limit },
      },
    );
    return data;
  }

  /**
   * Approve a follow request
   */
  async approveFollowRequest(requestId: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.USERS.APPROVE_FOLLOW_REQUEST(requestId),
    );
    return data;
  }

  /**
   * Reject a follow request
   */
  async rejectFollowRequest(requestId: string): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>(
      API_ENDPOINTS.USERS.REJECT_FOLLOW_REQUEST(requestId),
    );
    return data;
  }

  /**
   * Check follow status with a user
   */
  async getFollowStatus(userId: string): Promise<FollowStatusResponse> {
    const { data } = await apiClient.get<FollowStatusResponse>(
      API_ENDPOINTS.USERS.FOLLOW_STATUS(userId),
    );
    return data;
  }

  /**
   * Check if followerUserId is following targetUserId
   * Uses server route: GET /api/users/:followerId/is-following/:targetId
   */
  async isFollowing(followerUserId: string, targetUserId: string): Promise<FollowStatusResponse> {
    const { data } = await apiClient.get<FollowStatusResponse>(
      `/api/users/${followerUserId}/is-following/${targetUserId}`,
    );
    return data;
  }
}

export const followAPI = new FollowAPI();
