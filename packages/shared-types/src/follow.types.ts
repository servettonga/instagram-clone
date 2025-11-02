/**
 * Profile information for follow-related operations
 */
export interface FollowProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isPublic?: boolean;
}

/**
 * Follow relationship response
 */
export interface FollowResponse {
  id: string;
  followerProfileId: string;
  followedProfileId: string;
  accepted: boolean | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Follower entry in followers list
 */
export interface Follower {
  id: string;
  profile: FollowProfile;
  accepted: boolean | null;
  createdAt: Date | string;
}

/**
 * Following entry in following list
 */
export interface Following {
  id: string;
  profile: FollowProfile;
  accepted: boolean | null;
  createdAt: Date | string;
}

/**
 * Follow request entry
 */
export interface FollowRequest {
  id: string;
  followerProfile: FollowProfile & { userId: string };
  createdAt: Date | string;
}

/**
 * Paginated followers list
 */
export interface FollowersListResponse {
  followers: Follower[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated following list
 */
export interface FollowingListResponse {
  following: Following[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated follow requests list
 */
export interface FollowRequestsListResponse {
  requests: FollowRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Follow status check response
 */
export interface FollowStatusResponse {
  isFollowing: boolean;
  isPending: boolean;
}
