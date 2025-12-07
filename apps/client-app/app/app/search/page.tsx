// /search - Search results page for posts

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { postsAPI } from '@/lib/api/posts';
import { usersApi } from '@/lib/api/users';
import { transformPostForModal } from '@/lib/utils';
import { getImageSize } from '@/lib/utils/image';
import PostViewModal from '@/components/modal/PostViewModal';
import Avatar from '@/components/ui/Avatar';
import { HeartIcon, CommentIcon, MultiImageIcon, ChevronLeftIcon, SearchIcon, CloseIcon } from '@/components/ui/icons';
import type { Post } from '@repo/shared-types';
import type { UserWithProfileAndAccount } from '@/types/auth';
import styles from './search.module.scss';

type SearchTab = 'accounts' | 'posts';
type SortOption = 'recent' | 'popular';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') as SearchTab | null;

  // Store query in state so it persists when modal changes URL
  const [query, setQuery] = useState(queryParam);
  // Input state for inline search bar
  const [inputQuery, setInputQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<SearchTab>(typeParam === 'posts' ? 'posts' : 'accounts');
  const [postsSortBy, setPostsSortBy] = useState<SortOption>('recent');

  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postsLoadingMore, setPostsLoadingMore] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserWithProfileAndAccount[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [usersLoadingMore, setUsersLoadingMore] = useState(false);

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Update query state when searchParams change
  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      setInputQuery(queryParam);
    }
    if (typeParam === 'posts' || typeParam === 'accounts') {
      setActiveTab(typeParam);
    }
  }, [queryParam, typeParam]);

  // Handle inline search submission
  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = inputQuery.trim();
    if (trimmed && trimmed !== query) {
      router.push(`/app/search?q=${encodeURIComponent(trimmed)}`);
    }
  }, [inputQuery, query, router]);

  // Load posts
  const loadPosts = useCallback(async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setPostsLoading(true);
        setPosts([]);
      } else {
        setPostsLoadingMore(true);
      }

      const response = await postsAPI.searchPosts(query, {
        page: pageNum,
        limit: 30,
        sortBy: postsSortBy === 'popular' ? 'likesCount' : 'createdAt',
        order: 'desc',
      });

      if (pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }

      setPostsPage(pageNum);
      setPostsHasMore(pageNum < response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setPostsLoading(false);
      setPostsLoadingMore(false);
    }
  }, [query, postsSortBy]);

  // Load users
  const loadUsers = useCallback(async (pageNum: number) => {
    try {
      if (pageNum === 1) {
        setUsersLoading(true);
        setUsers([]);
      } else {
        setUsersLoadingMore(true);
      }

      const response = await usersApi.searchUsers(query, { page: pageNum, limit: 20 });

      if (pageNum === 1) {
        setUsers(response.data);
      } else {
        setUsers(prev => [...prev, ...response.data]);
      }

      setUsersPage(pageNum);
      setUsersHasMore(pageNum < response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setUsersLoading(false);
      setUsersLoadingMore(false);
    }
  }, [query]);

  // Load data when query or tab changes
  useEffect(() => {
    if (query) {
      if (activeTab === 'accounts') {
        loadUsers(1);
      } else {
        loadPosts(1);
      }
    }
  }, [query, activeTab, postsSortBy, loadUsers, loadPosts]);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  const handleNextPost = () => {
    if (!selectedPost) return;
    const currentIndex = posts.findIndex(p => p.id === selectedPost.id);
    if (currentIndex < posts.length - 1) {
      const nextPost = posts[currentIndex + 1];
      if (nextPost) setSelectedPost(nextPost);
    }
  };

  const handlePrevPost = () => {
    if (!selectedPost) return;
    const currentIndex = posts.findIndex(p => p.id === selectedPost.id);
    if (currentIndex > 0) {
      const prevPost = posts[currentIndex - 1];
      if (prevPost) setSelectedPost(prevPost);
    }
  };

  const handleLoadMorePosts = () => {
    if (!postsLoadingMore && postsHasMore) {
      loadPosts(postsPage + 1);
    }
  };

  const handleLoadMoreUsers = () => {
    if (!usersLoadingMore && usersHasMore) {
      loadUsers(usersPage + 1);
    }
  };

  return (
    <div className={styles.searchContainer}>
      {/* Header with back button and search bar */}
      <div className={styles.searchHeader}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ChevronLeftIcon width={24} height={24} />
        </button>
        <form className={styles.searchForm} onSubmit={handleSearch}>
          <div className={styles.searchInputWrapper}>
            <SearchIcon width={20} height={20} className={styles.searchInputIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              autoFocus={!query}
            />
            {inputQuery && (
              <button
                type="button"
                className={styles.clearInputButton}
                onClick={() => setInputQuery('')}
              >
                <CloseIcon width={16} height={16} />
              </button>
            )}
          </div>
        </form>
      </div>

      {!query ? (
        <div className={styles.emptyState}>
          <p>Enter a search term above</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'accounts' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              Accounts
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'posts' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('posts')}
            >
              Posts
            </button>
          </div>

          {/* Accounts tab content */}
          {activeTab === 'accounts' && (
            <>
              {usersLoading ? (
                <div className={styles.loading}>Searching...</div>
              ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No accounts found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <>
                  <div className={styles.usersList}>
                    {users.map((user) => (
                      <Link
                        key={user.id}
                        href={`/app/profile/${user.profile?.username}`}
                        className={styles.userItem}
                      >
                        <Avatar
                          avatarUrl={user.profile?.avatarUrl}
                          username={user.profile?.username}
                          size="md"
                          unoptimized
                        />
                        <div className={styles.userInfo}>
                          <div className={styles.usernameRow}>
                            <span className={styles.username}>{user.profile?.username}</span>
                          </div>
                          <span className={styles.displayName}>{user.profile?.displayName}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {usersHasMore && (
                    <div className={styles.loadMoreContainer}>
                      <button
                        className={styles.loadMoreButton}
                        onClick={handleLoadMoreUsers}
                        disabled={usersLoadingMore}
                      >
                        {usersLoadingMore ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Posts tab content */}
          {activeTab === 'posts' && (
            <>
              {/* Sort options for posts */}
              <div className={styles.sortTabs}>
                <button
                  className={`${styles.sortTab} ${postsSortBy === 'recent' ? styles.active : ''}`}
                  onClick={() => setPostsSortBy('recent')}
                >
                  Most Recent
                </button>
                <button
                  className={`${styles.sortTab} ${postsSortBy === 'popular' ? styles.active : ''}`}
                  onClick={() => setPostsSortBy('popular')}
                >
                  Most Popular
                </button>
              </div>

              {postsLoading ? (
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
                          src={getImageSize(post.assets[0]?.url || '', 'medium')}
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
                  {postsHasMore && (
                    <div className={styles.loadMoreContainer}>
                      <button
                        className={styles.loadMoreButton}
                        onClick={handleLoadMorePosts}
                        disabled={postsLoadingMore}
                      >
                        {postsLoadingMore ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
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
          post={transformPostForModal(selectedPost)}
          onPostUpdated={() => loadPosts(1)}
          onNextPost={posts.findIndex(p => p.id === selectedPost.id) < posts.length - 1 ? handleNextPost : undefined}
          onPrevPost={posts.findIndex(p => p.id === selectedPost.id) > 0 ? handlePrevPost : undefined}
        />
      )}
    </div>
  );
}
