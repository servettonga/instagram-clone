// Posts API client
import apiClient from './client';
import type {
  Post,
  CreatePostDto,
  UpdatePostDto,
  QueryPostsDto,
  PostsPaginationResponse,
  UploadAssetResponseDto,
} from '@repo/shared-types';

class PostsAPI {
  /**
   * Upload image asset
   */
  async uploadAsset(file: File): Promise<UploadAssetResponseDto> {
    const formData = new FormData();
    formData.append('file', file);

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
    const { data: post } = await apiClient.post<Post>('/api/posts', data);
    return post;
  }

  /**
   * Get all posts (For You feed)
   */
  async getAllPosts(params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>('/api/posts', { params });
    return data;
  }

  /**
   * Get personalized feed (Following)
   */
  async getFeed(params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>('/api/posts/feed', { params });
    return data;
  }

  /**
   * Get a single post by ID
   */
  async getPost(id: string): Promise<Post> {
    const { data } = await apiClient.get<Post>(`/api/posts/${id}`);
    return data;
  }

  /**
   * Update a post
   */
  async updatePost(id: string, data: UpdatePostDto): Promise<Post> {
    const { data: post } = await apiClient.patch<Post>(`/api/posts/${id}`, data);
    return post;
  }

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<void> {
    await apiClient.delete(`/api/posts/${id}`);
  }

  /**
   * Archive a post
   */
  async archivePost(id: string): Promise<Post> {
    const { data } = await apiClient.patch<Post>(`/api/posts/${id}/archive`);
    return data;
  }

  /**
   * Unarchive a post
   */
  async unarchivePost(id: string): Promise<Post> {
    const { data } = await apiClient.patch<Post>(`/api/posts/${id}/unarchive`);
    return data;
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>('/api/posts/search', {
      params: { q: query, ...params },
    });
    return data;
  }

  /**
   * Get archived posts
   */
  async getArchivedPosts(params?: QueryPostsDto): Promise<PostsPaginationResponse> {
    const { data } = await apiClient.get<PostsPaginationResponse>('/api/posts/archived', { params });
    return data;
  }
}

export const postsAPI = new PostsAPI();
