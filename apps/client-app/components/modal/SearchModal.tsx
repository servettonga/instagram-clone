'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CloseIcon, VerifiedBadge, SearchIcon } from '@/components/ui/icons';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/lib/store/authStore';
import { usersApi } from '@/lib/api/users';
import { postsAPI } from '@/lib/api/posts';
import { MentionText } from '@/lib/utils/mentions';
import { normalizeImageUrl } from '@/lib/utils/image';
import type { UserWithProfileAndAccount } from '@/types/auth';
import type { Post } from '@repo/shared-types';
import {
  getRecentSearches,
  addRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
  type RecentSearchItem,
} from '@/lib/utils/recentSearches';
import styles from './SearchModal.module.scss';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

type SearchTab = 'accounts' | 'posts';

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SearchModal({ isOpen, onClose, isCollapsed = false }: SearchModalProps) {
  const { user } = useAuthStore();
  const userId = user?.id;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('accounts');
  const [userResults, setUserResults] = useState<UserWithProfileAndAccount[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [userPagination, setUserPagination] = useState<Pagination | null>(null);
  const [postPagination, setPostPagination] = useState<Pagination | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearchItem[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load recent searches on mount
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches(userId));
    }
  }, [isOpen, userId]);

  // Perform search with debounce
  useEffect(() => {
    if (searchQuery.trim()) {
      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Set new timeout for debounced search
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          if (activeTab === 'accounts') {
            const response = await usersApi.searchUsers(searchQuery, { page: 1, limit: 20 });
            setUserResults(response.data);
            setUserPagination(response.pagination);
          } else {
            const response = await postsAPI.searchPosts(searchQuery, { page: 1, limit: 20 });
            setPostResults(response.data);
            setPostPagination(response.pagination);
          }
        } catch (error) {
          console.error('Search failed:', error);
        } finally {
          setIsSearching(false);
        }
      }, 300); // 300ms debounce
    } else {
      setUserResults([]);
      setPostResults([]);
      setUserPagination(null);
      setPostPagination(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, activeTab]);

  // Load more results
  const handleLoadMore = async () => {
    const pagination = activeTab === 'accounts' ? userPagination : postPagination;
    if (!pagination || pagination.page >= pagination.totalPages) return;

    setIsLoadingMore(true);
    try {
      const nextPage = pagination.page + 1;

      if (activeTab === 'accounts') {
        const response = await usersApi.searchUsers(searchQuery, { page: nextPage, limit: 20 });
        setUserResults(prev => [...prev, ...response.data]);
        setUserPagination(response.pagination);
      } else {
        const response = await postsAPI.searchPosts(searchQuery, { page: nextPage, limit: 20 });
        setPostResults(prev => [...prev, ...response.data]);
        setPostPagination(response.pagination);
      }
    } catch (error) {
      console.error('Failed to load more:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Save to recent searches
  const handleSaveToRecent = (item: Omit<RecentSearchItem, 'timestamp'>) => {
    addRecentSearch(item, userId);
    setRecentSearches(getRecentSearches(userId));
  };

  // Remove from recent searches
  const handleRemoveRecent = (id: string) => {
    removeRecentSearch(id, userId);
    setRecentSearches(getRecentSearches(userId));
  };

  // Clear all recent searches
  const handleClearAll = () => {
    clearRecentSearches(userId);
    setRecentSearches([]);
  };

  // Clear search when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setUserResults([]);
      setPostResults([]);
      setActiveTab('accounts');
    }
  }, [isOpen]);

  // Close on click outside - including the button that opened it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is outside modal
      if (modalRef.current && !modalRef.current.contains(target)) {
        // Check if click is on the Search button (to allow toggle)
        const isSearchButton = target.closest('button[data-search-button]');
        if (!isSearchButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      // Add a small delay to prevent immediate closing when opening
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const showRecent = !searchQuery.trim();
  const hasResults = activeTab === 'accounts' ? userResults.length > 0 : postResults.length > 0;
  const pagination = activeTab === 'accounts' ? userPagination : postPagination;
  const canLoadMore = pagination && pagination.page < pagination.totalPages;

  return (
    <div className={`${styles.modalOverlay} ${isCollapsed ? styles.modalOverlayCollapsed : ''}`}>
      <div className={styles.searchPanel} ref={modalRef}>
        <div className={styles.searchHeader}>
          <h2 className={styles.title}>Search</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className={styles.searchInputWrapper}>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          {searchQuery && (
            <button className={styles.clearInputButton} onClick={() => setSearchQuery('')}>
              <CloseIcon width={16} height={16} />
            </button>
          )}
        </div>

        {/* Tabs - only show when searching */}
        {!showRecent && (
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
        )}

        <div className={styles.searchContent}>
          {showRecent ? (
            <>
              {recentSearches.length > 0 ? (
                <>
                  <div className={styles.recentHeader}>
                    <span className={styles.recentTitle}>Recent</span>
                    <button className={styles.clearAll} onClick={handleClearAll}>
                      Clear all
                    </button>
                  </div>

                  <div className={styles.recentList}>
                    {recentSearches.map((item) => (
                      <Link
                        key={item.id}
                        href={
                          item.type === 'user'
                            ? `/app/profile/${item.username}`
                            : item.type === 'post'
                            ? `/app/post/${item.id}`
                            : `/app/search?q=${encodeURIComponent(item.query || '')}`
                        }
                        className={
                          item.type === 'user'
                            ? styles.userItem
                            : item.type === 'post'
                            ? styles.postItem
                            : styles.queryItem
                        }
                        onClick={onClose}
                      >
                        {item.type === 'user' ? (
                          <>
                            <div className={styles.userAvatar}>
                              <Avatar avatarUrl={item.avatarUrl} username={item.username} size="lg" unoptimized />
                            </div>
                            <div className={styles.userInfo}>
                              <div className={styles.usernameRow}>
                                <span className={styles.username}>{item.username}</span>
                                {item.isVerified && <VerifiedBadge className={styles.verifiedBadge} />}
                              </div>
                              <span className={styles.displayName}>
                                {item.displayName}
                                {item.following && ' • Following'}
                              </span>
                            </div>
                          </>
                        ) : item.type === 'post' ? (
                          <>
                            <div className={styles.postThumbnail}>
                              <Image
                                src={normalizeImageUrl(item.postImageUrl)}
                                alt="Post"
                                width={64}
                                height={64}
                                className={styles.postImage}
                                unoptimized
                              />
                            </div>
                            <div className={styles.postInfo}>
                              <div className={styles.postUsername}>{item.username}</div>
                              <div className={styles.postCaption}>
                                {item.postCaption || 'No caption'}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={styles.searchIconWrapper}>
                              <SearchIcon width={24} height={24} />
                            </div>
                            <div className={styles.queryInfo}>
                              <span className={styles.queryText}>{item.query}</span>
                            </div>
                          </>
                        )}
                        <button
                          className={styles.removeButton}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveRecent(item.id);
                          }}
                        >
                          <CloseIcon width={17} height={17} />
                        </button>
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.noResults}>
                  <p>No recent searches</p>
                </div>
              )}
            </>
          ) : (
            <>
              {isSearching ? (
                <div className={styles.loadingState}>
                  <p>Searching...</p>
                </div>
              ) : hasResults ? (
                <>
                  <div className={styles.resultsList}>
                    {activeTab === 'accounts' ? (
                      userResults.map((user) => (
                        <Link
                          key={user.id}
                          href={`/app/profile/${user.profile?.username || user.id}`}
                          className={styles.userItem}
                          onClick={() => {
                            handleSaveToRecent({
                              id: user.id,
                              type: 'user',
                              username: user.profile?.username || 'Unknown',
                              displayName: user.profile?.displayName || user.profile?.username,
                              avatarUrl: user.profile?.avatarUrl || undefined,
                            });
                            onClose();
                          }}
                        >
                          <div className={styles.userAvatar}>
                            <Avatar avatarUrl={user.profile?.avatarUrl} username={user.profile?.username} size="lg" unoptimized />
                          </div>
                          <div className={styles.userInfo}>
                            <div className={styles.usernameRow}>
                              <span className={styles.username}>{user.profile?.username || 'Unknown'}</span>
                            </div>
                            <span className={styles.displayName}>
                              {user.profile?.displayName || user.profile?.username || 'User'}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      postResults.map((post) => (
                        <Link
                          key={post.id}
                          href={`/app/post/${post.id}`}
                          className={styles.postItem}
                          onClick={() => {
                            handleSaveToRecent({
                              id: post.id,
                              type: 'post',
                              username: post.profile?.username || 'Unknown',
                              postCaption: post.content || undefined,
                              postImageUrl: post.assets[0]?.url || undefined,
                            });
                            onClose();
                          }}
                        >
                          <div className={styles.postThumbnail}>
                            <Image
                              src={normalizeImageUrl(post.assets[0]?.url)}
                              alt="Post"
                              width={64}
                              height={64}
                              className={styles.postImage}
                              unoptimized
                            />
                          </div>
                          <div className={styles.postInfo}>
                            <div className={styles.postUsername}>{post.profile?.username || 'Unknown'}</div>
                            <div className={styles.postCaption}>
                              <MentionText text={post.content || 'No caption'} />
                            </div>
                            <div className={styles.postStats}>
                              {post.likesCount} likes • {post.commentsCount} comments
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>

                  {/* Show "See all results" link for posts, or "Show more" button for accounts */}
                  {activeTab === 'posts' && postPagination && postPagination.total > 0 ? (
                    <div className={styles.showMoreContainer}>
                      <Link
                        href={`/app/search?q=${encodeURIComponent(searchQuery)}`}
                        className={styles.seeAllLink}
                        onClick={() => {
                          // Save the search query to recents
                          handleSaveToRecent({
                            id: `query_${searchQuery}`,
                            type: 'query',
                            query: searchQuery,
                          });
                          onClose();
                        }}
                      >
                        See all results for &ldquo;{searchQuery}&rdquo;
                      </Link>
                    </div>
                  ) : canLoadMore ? (
                    <div className={styles.showMoreContainer}>
                      <button
                        className={styles.showMoreButton}
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                      >
                        {isLoadingMore ? 'Loading...' : 'Show more'}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.noResults}>
                  <p>No results found</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
