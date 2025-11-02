// Comments API client
import apiClient from './client';
import { API_ENDPOINTS } from './constants';
import type {
  Comment,
  CreateCommentDto,
  UpdateCommentDto,
  CommentsListResponse,
  LikeToggleResponse,
  LikesListResponse,
} from '@repo/shared-types';

class CommentsAPI {
  /**
   * Create a comment on a post
   */
  async createComment(postId: string, data: CreateCommentDto): Promise<Comment> {
    const { data: comment } = await apiClient.post<Comment>(
      API_ENDPOINTS.POSTS.COMMENTS(postId),
      data,
    );
    return comment;
  }

  /**
   * Get comments for a post (top-level only)
   */
  async getPostComments(
    postId: string,
    page?: number,
    limit?: number,
  ): Promise<CommentsListResponse> {
    const { data } = await apiClient.get<CommentsListResponse>(
      API_ENDPOINTS.POSTS.COMMENTS(postId),
      {
        params: { page, limit },
      },
    );
    return data;
  }

  /**
   * Get a single comment
   */
  async getComment(commentId: string): Promise<Comment> {
    const { data } = await apiClient.get<Comment>(API_ENDPOINTS.COMMENTS.BY_ID(commentId));
    return data;
  }

  /**
   * Get replies to a comment
   */
  async getCommentReplies(
    commentId: string,
    page?: number,
    limit?: number,
  ): Promise<CommentsListResponse> {
    interface RepliesResponse {
      replies: Comment[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }

    const { data } = await apiClient.get<RepliesResponse>(
      API_ENDPOINTS.COMMENTS.REPLIES(commentId),
      {
        params: { page, limit },
      },
    );
    // Backend returns 'replies' but we need 'comments' to match CommentsListResponse
    return {
      comments: data.replies || [],
      total: data.total,
      page: data.page,
      limit: data.limit,
      totalPages: data.totalPages,
    };
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, data: UpdateCommentDto): Promise<Comment> {
    const { data: comment } = await apiClient.patch<Comment>(
      API_ENDPOINTS.COMMENTS.BY_ID(commentId),
      data,
    );
    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.COMMENTS.BY_ID(commentId));
  }

  /**
   * Toggle like on a comment (like/unlike)
   */
  async toggleLike(commentId: string): Promise<LikeToggleResponse> {
    const { data } = await apiClient.post<LikeToggleResponse>(
      API_ENDPOINTS.COMMENTS.LIKE(commentId),
    );
    return data;
  }

  /**
   * Get users who liked a comment
   */
  async getCommentLikes(
    commentId: string,
    page?: number,
    limit?: number,
  ): Promise<LikesListResponse> {
    const { data } = await apiClient.get<LikesListResponse>(
      API_ENDPOINTS.COMMENTS.LIKES(commentId),
      {
        params: { page, limit },
      },
    );
    return data;
  }
}

export const commentsAPI = new CommentsAPI();
