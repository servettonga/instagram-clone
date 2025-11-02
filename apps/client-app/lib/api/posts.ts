// Posts API client
import apiClient from './client';
import { API_ENDPOINTS } from './constants';
import type {
  Post,
  CreatePostDto,
  UpdatePostDto,
  QueryPostsDto,
  PostsPaginationResponse,
  UploadAssetResponseDto,
  LikeToggleResponse,
  LikesListResponse,
} from '@repo/shared-types';

class PostsAPI {
  /**
   * Upload image asset
   */
  async uploadAsset(
    file: File,
    aspectRatio: string = '1:1',
  ): Promise<UploadAssetResponseDto> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('aspectRatio', aspectRatio);

    const { data } = await apiClient.post('/api/posts/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data;
  }

  /**
   * Create a new post
   */
  async createPost(data: CreatePostDto): Promise<Post> {
    const { data: post } = await apiClient.post<Post>(API_ENDPOINTS.POSTS.BASE, data);
    return post;
  }

  /**
   * Get all posts (For You feed)
   */
  async getAllPosts(params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>(API_ENDPOINTS.POSTS.BASE, { params });
    return data;
  }

  /**
   * Get personalized feed (Following)
   */
  async getFeed(params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>(API_ENDPOINTS.POSTS.FEED, { params });
    return data;
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: string): Promise<Post> {
    const { data } = await apiClient.get<Post>(API_ENDPOINTS.POSTS.BY_ID(id));
    return data;
  }

  /**
   * Update a post
   */
  async updatePost(id: string, data: UpdatePostDto): Promise<Post> {
    const { data: post } = await apiClient.patch<Post>(API_ENDPOINTS.POSTS.BY_ID(id), data);
    return post;
  }

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<void> {
    await apiClient.delete(API_ENDPOINTS.POSTS.BY_ID(id));
  }

  /**
   * Archive a post
   */
  async archivePost(id: string): Promise<Post> {
    const { data } = await apiClient.patch<Post>(`${API_ENDPOINTS.POSTS.BY_ID(id)}/archive`);
    return data;
  }

  /**
   * Unarchive a post
   */
  async unarchivePost(id: string): Promise<Post> {
    const { data } = await apiClient.patch<Post>(`${API_ENDPOINTS.POSTS.BY_ID(id)}/unarchive`);
    return data;
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>(`${API_ENDPOINTS.POSTS.BASE}/search`, {
      params: { q: query, ...params },
    });
    return data;
  }

  /**
   * Get archived posts
   */
  async getArchivedPosts(params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>(`${API_ENDPOINTS.POSTS.BASE}/archived`, { params });
    return data;
  }

  /**
   * Toggle like on a post (like/unlike)
   */
  async toggleLike(postId: string): Promise<LikeToggleResponse> {
    const { data } = await apiClient.post<LikeToggleResponse>(API_ENDPOINTS.POSTS.LIKE(postId));
    return data;
  }

  /**
   * Get users who liked a post
   */
  async getPostLikes(postId: string, page?: number, limit?: number): Promise<LikesListResponse> {
    const { data } = await apiClient.get<LikesListResponse>(API_ENDPOINTS.POSTS.LIKES(postId), {
      params: { page, limit },
    });
    return data;
  }
}

export const postsAPI = new PostsAPI();
