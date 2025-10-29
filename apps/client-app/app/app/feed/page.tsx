// /feed

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
import FeedTabs from '@/components/feed/FeedTabs';
import FeedPost from '@/components/feed/FeedPost';
import FeedSidebar from '@/components/feed/FeedSidebar';
import PostViewModal from '@/components/modal/PostViewModal';
import styles from './feed.module.scss';
import { transformPostsToFeedPosts, transformPostToFeedPost, transformPostForModal } from '@/lib/utils';

// Mock comments for the modal (will be replaced with real comments API later)
const MOCK_COMMENTS = [
  {
    id: 'comment-1',
    username: 'user1',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    text: 'Amazing post!',
    timeAgo: '2h',
    likes: 10,
  },
  {
    id: 'comment-2',
    username: 'user2',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    text: 'Love this! 🔥',
    timeAgo: '5h',
    likes: 5,
  },
];

const POSTS_PER_PAGE = 10;

export default function FeedPage() {
  const { user } = useAuthStore();
  const profile = user?.profile;
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');
  const [posts, setPosts] = useState<ReturnType<typeof transformPostToFeedPost>[]>([]);
  const [selectedPost, setSelectedPost] = useState<ReturnType<typeof transformPostToFeedPost> | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load initial posts
  const loadPosts = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setCurrentPage(1);

    try {
      const response = activeTab === 'for-you'
        ? await postsAPI.getAllPosts({ page: 1, limit: POSTS_PER_PAGE })
        : await postsAPI.getFeed({ page: 1, limit: POSTS_PER_PAGE });

      const transformedPosts = transformPostsToFeedPosts(response.data);
      setPosts(transformedPosts);
      setHasMore(response.pagination.hasNext);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to load posts. Please try again.');
      setPosts([]);
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, user]);

  // Load more posts (for infinite scroll)
  const loadMorePosts = useCallback(async () => {
    if (!user || !hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const response = activeTab === 'for-you'
        ? await postsAPI.getAllPosts({ page: nextPage, limit: POSTS_PER_PAGE })
        : await postsAPI.getFeed({ page: nextPage, limit: POSTS_PER_PAGE });

      const transformedPosts = transformPostsToFeedPosts(response.data);
      setPosts((prevPosts) => [...prevPosts, ...transformedPosts]);
      setCurrentPage(nextPage);
      setHasMore(response.pagination.hasNext);
    } catch (err) {
      console.error('Failed to load more posts:', err);
      setError('Failed to load more posts. Please try again.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeTab, currentPage, hasMore, isLoadingMore, user]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          loadMorePosts();
        }
      },
      {
        rootMargin: '200px', // Start loading 200px before reaching bottom
      }
    );

    const current = observerTarget.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, loadMorePosts]);

  // Load posts when tab changes
  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Listen for new post events
  useEffect(() => {
    const handlePostCreated = () => {
      loadPosts();
    };

    window.addEventListener('postCreated', handlePostCreated);
    return () => {
      window.removeEventListener('postCreated', handlePostCreated);
    };
  }, [loadPosts]);

  const suggestions = [
    { username: 'imkir', note: 'Follows you', avatar: 'https://i.pravatar.cc/150?img=45' },
    { username: 'organic__al', note: 'Followed by chirag_singla17', avatar: 'https://i.pravatar.cc/150?img=46' },
    { username: 'im_gr', note: 'Followed by chirag_singla17', avatar: 'https://i.pravatar.cc/150?img=47' },
    { username: 'abh952', note: 'Follows you', avatar: 'https://i.pravatar.cc/150?img=48' },
    { username: 'sakbrl', note: 'Follows you', avatar: 'https://i.pravatar.cc/150?img=49' },
  ];

  const handleOpenPostModal = (post: ReturnType<typeof transformPostToFeedPost>) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedContent}>
        {/* Feed Posts */}
        <div className={styles.postsColumn}>
          {/* Feed Tabs Component */}
          <FeedTabs activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Loading state */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading posts...</p>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#ed4956' }}>
              <p>{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No posts to show</p>
              {activeTab === 'following' && <p style={{ fontSize: '14px', color: '#8e8e8e', marginTop: '8px' }}>Start following people to see their posts here</p>}
            </div>
          )}

          {/* Render posts using FeedPost component */}
          {!isLoading && !error && posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              onCommentClick={() => { setIsEditMode(false); handleOpenPostModal(post); }}
              onPostDeleted={() => loadPosts()}
              onEditClick={() => { setIsEditMode(true); handleOpenPostModal(post); }}
            />
          ))}

          {/* Infinite scroll sentinel */}
          <div
            ref={observerTarget}
            style={{
              height: '20px',
              margin: '40px 0',
              textAlign: 'center',
            }}
          >
            {isLoadingMore && <p style={{ color: '#8e8e8e' }}>Loading more posts...</p>}
            {!hasMore && posts.length > 0 && (
              <p style={{ color: '#8e8e8e', fontSize: '14px' }}>No more posts to load</p>
            )}
          </div>
        </div>

        {/* Sidebar with user info and suggestions */}
        <FeedSidebar profile={profile} suggestions={suggestions} />
      </div>

      {/* Post View Modal */}
      {showPostModal && selectedPost && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
            setIsEditMode(false);
          }}
          post={transformPostForModal(selectedPost, MOCK_COMMENTS)}
          initialEditMode={isEditMode}
          onPostUpdated={() => loadPosts()}
        />
      )}
    </div>
  );
}
