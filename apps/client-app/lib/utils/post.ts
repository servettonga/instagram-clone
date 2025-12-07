/**
 * Post transformation and formatting utilities
 */

import type { Post } from '@repo/shared-types';
import { getTimeAgo } from './date';

/**
 * Transformed post format for feed display
 * Contains only necessary fields and pre-formatted data
 */
export interface FeedPost {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified: boolean;
  timeAgo: string;
  imageUrl: string;
  assets: Array<{ url: string }>;
  likes: number;
  caption?: string;
  commentsCount: number;
  aspectRatio: string;
  profileId?: string;
  isLikedByUser?: boolean;
  isSavedByUser?: boolean;
  isArchived?: boolean;
}

/**
 * Transform API Post object to FeedPost format for feed and modal display
 *
 * This transformation:
 * - Extracts profile information
 * - Pre-calculates relative time
 * - Formats aspect ratio for CSS
 * - Provides fallback values
 *
 * @param post - Raw Post from API
 * @returns Formatted FeedPost ready for display
 */
export function transformPostToFeedPost(post: Post): FeedPost {
  return {
    id: post.id,
    username: post.profile.username,
    displayName: post.profile.displayName,
    avatarUrl: post.profile.avatarUrl ?? undefined,
    isVerified: false, // TODO: Implement verification logic
    timeAgo: getTimeAgo(post.createdAt),
    imageUrl: post.assets[0]?.url || '',
    assets: post.assets,
    likes: post.likesCount,
    caption: post.content || undefined,
    commentsCount: post.commentsCount,
    aspectRatio: (post.aspectRatio || '4:5').replace(':', '/'),
    profileId: post.profileId,
    isLikedByUser: post.isLikedByCurrentUser,
    isSavedByUser: post.isSavedByCurrentUser,
  };
}

/**
 * Transform multiple posts to FeedPost format
 *
 * @param posts - Array of raw Post objects
 * @returns Array of transformed FeedPost objects
 */
export function transformPostsToFeedPosts(posts: Post[]): FeedPost[] {
  return posts.map(transformPostToFeedPost);
}

/**
 * Transform Post to PostViewModal props format
 *
 * This creates a consistent interface for the modal regardless of source (feed, profile, explore)
 *
 * @param post - Raw Post from API or FeedPost
 * @returns Formatted post object for PostViewModal
 */
export function transformPostForModal(post: Post | FeedPost) {
  // If it's already a FeedPost, use the pre-formatted data
  if ('displayName' in post) {
    return {
      id: post.id,
      imageUrl: post.imageUrl,
      assets: post.assets,
      username: post.username,
    avatarUrl: post.avatarUrl || '',
      caption: post.caption || undefined,
      likes: post.likes,
      timeAgo: post.timeAgo,
      profileId: post.profileId,
      aspectRatio: post.aspectRatio,
      isLikedByUser: post.isLikedByUser,
      isSavedByUser: post.isSavedByUser,
      isArchived: post.isArchived ?? false,
    };
  }

  // Otherwise transform from raw Post
  return {
    id: post.id,
    imageUrl: post.assets[0]?.url || '',
    assets: post.assets,
    username: post.profile.username,
    avatarUrl: post.profile.avatarUrl ?? undefined,
    caption: post.content || undefined,
    likes: post.likesCount,
    timeAgo: getTimeAgo(post.createdAt),
    profileId: post.profileId,
    createdAt: post.createdAt,
    aspectRatio: (post.aspectRatio || '4:5').replace(':', '/'),
    isLikedByUser: post.isLikedByCurrentUser,
    isSavedByUser: post.isSavedByCurrentUser,
    isArchived: post.isArchived,
  };
}
