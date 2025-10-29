// /explore

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { postsAPI } from '@/lib/api/posts';
import { transformPostForModal } from '@/lib/utils';
import PostViewModal from '@/components/modal/PostViewModal';
import { HeartIcon, CommentIcon, MultiImageIcon } from '@/components/ui/icons';
import type { Post } from '@repo/shared-types';
import styles from './explore.module.scss';

// Mock comments data (temporary until real API is ready)
const MOCK_COMMENTS = [
  {
    id: '1',
    username: 'johndoe',
    avatarUrl: 'https://i.pravatar.cc/150?u=johndoe',
    text: 'Amazing photo! 🔥',
    timeAgo: '2h',
    likes: 15,
  },
  {
    id: '2',
    username: 'jane_smith',
    avatarUrl: 'https://i.pravatar.cc/150?u=jane_smith',
    text: 'Love this content!',
    timeAgo: '5h',
    likes: 8,
  },
];

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await postsAPI.getAllPosts({ limit: 30 });
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to load explore posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  if (loading) {
    return (
      <div className={styles.exploreContainer}>
        <div className={styles.loading}>Loading explore posts...</div>
      </div>
    );
  }
  return (
    <div className={styles.exploreContainer}>
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
              src={post.assets[0]?.url || 'https://picsum.photos/293/293'}
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

      {selectedPost && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          post={transformPostForModal(selectedPost, MOCK_COMMENTS)}
          onPostUpdated={() => loadPosts()}
        />
      )}
    </div>
  );
}
