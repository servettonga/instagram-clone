// /explore

'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { postsAPI } from '@/lib/api/posts';
import { transformPostForModal } from '@/lib/utils';
import { getImageSize } from '@/lib/utils/image';
import PostViewModal from '@/components/modal/PostViewModal';
import { HeartIcon, CommentIcon, MultiImageIcon } from '@/components/ui/icons';
import type { Post } from '@repo/shared-types';
import styles from './explore.module.scss';

type SortOption = 'recent' | 'popular';

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getAllPosts({
        limit: 30,
        sortBy: sortBy === 'popular' ? 'likesCount' : 'createdAt',
        order: 'desc',
      });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load explore posts:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  return (
    <div className={styles.exploreContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Explore</h1>
        <div className={styles.sortTabs}>
          <button
            className={`${styles.sortTab} ${sortBy === 'recent' ? styles.active : ''}`}
            onClick={() => setSortBy('recent')}
          >
            Most Recent
          </button>
          <button
            className={`${styles.sortTab} ${sortBy === 'popular' ? styles.active : ''}`}
            onClick={() => setSortBy('popular')}
          >
            Most Popular
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading explore posts...</div>
      ) : (
        <div className={styles.exploreGrid}>
        {posts.map((post) => (
          <div
            key={post.id}
            className={styles.gridItem}
            onClick={() => handlePostClick(post)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                handlePostClick(post);
              }
            }}
          >
            <Image
              src={getImageSize(post.assets[0]?.url || 'https://picsum.photos/293/293', 'medium')}
              alt="Explore post"
              fill
              sizes="(max-width: 768px) 33vw, 293px"
              className={styles.gridImage}
              unoptimized
            />
            {post.assets.length > 1 && (
              <div className={styles.multiImageIndicator}>
                <MultiImageIcon width={16} height={16} />
              </div>
            )}
            <div className={styles.overlay}>
              <div className={styles.stats}>
                <span>
                  <HeartIcon width={20} height={20} fill="white" filled />
                  {post.likesCount.toLocaleString()}
                </span>
                <span>
                  <CommentIcon width={20} height={20} fill="white" filled />
                  {post.commentsCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        </div>
      )}

      {selectedPost && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          post={transformPostForModal(selectedPost)}
          onPostUpdated={() => loadPosts()}
        />
      )}
    </div>
  );
}
