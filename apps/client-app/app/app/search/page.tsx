// /search - Search results page for posts

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { postsAPI } from '@/lib/api/posts';
import { transformPostForModal } from '@/lib/utils';
import PostViewModal from '@/components/modal/PostViewModal';
import { HeartIcon, CommentIcon, MultiImageIcon, ChevronLeftIcon } from '@/components/ui/icons';
import type { Post } from '@repo/shared-types';
import styles from './search.module.scss';

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

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setPosts([]);
      } else {
        setLoadingMore(true);
      }

      const response = await postsAPI.searchPosts(query, { page: pageNum, limit: 30 });

      if (pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }

      setPage(pageNum);
      setHasMore(pageNum < response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load search results:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (query) {
      loadPosts(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1);
    }
  };

  if (!query) {
    return (
      <div className={styles.searchContainer}>
        <div className={styles.emptyState}>
          <p>No search query provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.searchContainer}>
      {/* Header with back button and search query */}
      <div className={styles.searchHeader}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ChevronLeftIcon width={24} height={24} />
        </button>
        <h1 className={styles.searchTitle}>
          Search results for: <span className={styles.query}>&quot;{query}&quot;</span>
        </h1>
      </div>

      {loading ? (
        <div className={styles.loading}>Searching...</div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No posts found for &quot;{query}&quot;</p>
        </div>
      ) : (
        <>
          <div className={styles.searchGrid}>
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
                  alt="Search result"
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

          {/* Load more button */}
          {hasMore && (
            <div className={styles.loadMoreContainer}>
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {selectedPost && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          post={transformPostForModal(selectedPost, MOCK_COMMENTS)}
          onPostUpdated={() => loadPosts(1)}
        />
      )}
    </div>
  );
}
