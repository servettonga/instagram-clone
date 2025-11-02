/**
 * Profile information in comment context
 */
export interface CommentProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Comment data structure
 */
export interface Comment {
  id: string;
  postId: string;
  profileId: string;
  profile: CommentProfile;
  parentCommentId: string | null;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    replies: number;
    likes: number;
  };
  isLikedByUser?: boolean;
}

/**
 * Create comment DTO
 */
export interface CreateCommentDto {
  content: string;
  parentCommentId?: string;
}

/**
 * Update comment DTO
 */
export interface UpdateCommentDto {
  content: string;
}

/**
 * Paginated comments list
 */
export interface CommentsListResponse {
  comments: Comment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Comment like response
 */
export interface CommentLikeResponse {
  id: string;
  commentId: string;
  profileId: string;
  createdAt: Date | string;
}

/**
 * Like toggle response (for both posts and comments)
 */
export interface LikeToggleResponse {
  liked: boolean;
  likesCount: number;
}

/**
 * User who liked something
 */
export interface LikeUser {
  id: string;
  profile: CommentProfile;
  createdAt: Date | string;
}

/**
 * Paginated likes list
 */
export interface LikesListResponse {
  likes: LikeUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
