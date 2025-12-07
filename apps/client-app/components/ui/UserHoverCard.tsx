'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { usersApi } from '@/lib/api/users';
import { followAPI } from '@/lib/api/follow';
import { postsAPI } from '@/lib/api/posts';
import { useAuthStore } from '@/lib/store/authStore';
import type { UserWithProfileAndAccount } from '@repo/shared-types';
import styles from './UserHoverCard.module.scss';

interface UserHoverCardProps {
  username: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}

interface UserCardData {
  user: UserWithProfileAndAccount;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  followState: 'not-following' | 'following' | 'pending' | 'self';
}

export default function UserHoverCard({ username, children, onNavigate }: UserHoverCardProps) {
  const [showCard, setShowCard] = useState(false);
  const [cardData, setCardData] = useState<UserCardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  const triggerRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { user: currentUser } = useAuthStore();

  const fetchUserData = useCallback(async () => {
    if (!username || cardData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user data
      const userData = await usersApi.getUserByUsername(username);

      // Check if this is the current user
      const isSelf = currentUser?.profile?.username === username;

      // Fetch stats in parallel
      const [postsRes, followersRes, followingRes] = await Promise.all([
        postsAPI.getAllPosts({ profileId: userData.profile?.id, limit: 1 }),
        followAPI.getFollowers(userData.id, 1, 1),
        followAPI.getFollowing(userData.id, 1, 1),
      ]);

      // Check follow status if not self
      let followState: UserCardData['followState'] = 'self';
      if (!isSelf && currentUser) {
        const followStatus = await followAPI.isFollowing(currentUser.id, userData.id);
        if (followStatus.isFollowing) {
          followState = 'following';
        } else if (followStatus.isPending) {
          followState = 'pending';
        } else {
          followState = 'not-following';
        }
      }

      setCardData({
        user: userData,
        stats: {
          posts: postsRes.pagination.total,
          followers: followersRes.total,
          following: followingRes.total,
        },
        followState,
      });
    } catch (err) {
      console.error('Failed to fetch user data:', err);
      setError('Failed to load user');
    } finally {
      setIsLoading(false);
    }
  }, [username, cardData, currentUser]);

  const handleMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Delay showing the card
    hoverTimeoutRef.current = setTimeout(() => {
      setShowCard(true);
      fetchUserData();
    }, 500);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay hiding the card to allow mouse to move to card
    hideTimeoutRef.current = setTimeout(() => {
      setShowCard(false);
    }, 300);
  };

  const handleCardMouseEnter = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleCardMouseLeave = () => {
    hideTimeoutRef.current = setTimeout(() => {
      setShowCard(false);
    }, 300);
  };

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  const handleFollow = async () => {
    if (!cardData || followLoading) return;

    setFollowLoading(true);
    try {
      const res = await followAPI.followUser(cardData.user.id);
      setCardData(prev => prev ? {
        ...prev,
        followState: res.accepted ? 'following' : 'pending',
        stats: {
          ...prev.stats,
          followers: res.accepted ? prev.stats.followers + 1 : prev.stats.followers,
        },
      } : null);

      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent('follow:changed', {
          detail: { targetUserId: cardData.user.id, username, action: 'follow' }
        })
      );
    } catch (err) {
      console.error('Failed to follow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!cardData || followLoading) return;

    setFollowLoading(true);
    try {
      await followAPI.unfollowUser(cardData.user.id);
      setCardData(prev => prev ? {
        ...prev,
        followState: 'not-following',
        stats: {
          ...prev.stats,
          followers: Math.max(0, prev.stats.followers - 1),
        },
      } : null);

      // Dispatch event for other components
      window.dispatchEvent(
        new CustomEvent('follow:changed', {
          detail: { targetUserId: cardData.user.id, username, action: 'unfollow' }
        })
      );
    } catch (err) {
      console.error('Failed to unfollow:', err);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLinkClick = () => {
    setShowCard(false);
    onNavigate?.();
  };

  return (
    <span
      className={styles.hoverCardTrigger}
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {showCard && (
        <div
          className={styles.hoverCard}
          ref={cardRef}
          onMouseEnter={handleCardMouseEnter}
          onMouseLeave={handleCardMouseLeave}
        >
          {isLoading && (
            <div className={styles.loading}>
              <div className={styles.loadingSpinner} />
            </div>
          )}

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          {cardData && !isLoading && (
            <>
              <div className={styles.cardHeader}>
                <Link
                  href={`/app/profile/${cardData.user.profile?.username}`}
                  onClick={handleLinkClick}
                  className={styles.avatarLink}
                >
                  <Avatar
                    avatarUrl={cardData.user.profile?.avatarUrl}
                    username={cardData.user.profile?.displayName || cardData.user.profile?.username || ''}
                    size="lg"
                  />
                </Link>

                {cardData.followState !== 'self' && (
                  <div className={styles.followAction}>
                    {cardData.followState === 'not-following' && (
                      <button
                        className={styles.followButton}
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        {followLoading ? '...' : 'Follow'}
                      </button>
                    )}
                    {cardData.followState === 'pending' && (
                      <button
                        className={styles.requestedButton}
                        onClick={handleUnfollow}
                        disabled={followLoading}
                      >
                        {followLoading ? '...' : 'Requested'}
                      </button>
                    )}
                    {cardData.followState === 'following' && (
                      <button
                        className={styles.followingButton}
                        onClick={handleUnfollow}
                        disabled={followLoading}
                      >
                        {followLoading ? '...' : 'Following'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.cardInfo}>
                <Link
                  href={`/app/profile/${cardData.user.profile?.username}`}
                  onClick={handleLinkClick}
                  className={styles.usernameLink}
                >
                  <span className={styles.username}>{cardData.user.profile?.username}</span>
                </Link>
                {cardData.user.profile?.displayName && (
                  <span className={styles.displayName}>{cardData.user.profile.displayName}</span>
                )}
              </div>

              <div className={styles.cardStats}>
                <div className={styles.statItem}>
                  <span className={styles.statCount}>{cardData.stats.posts}</span>
                  <span className={styles.statLabel}>posts</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statCount}>{cardData.stats.followers}</span>
                  <span className={styles.statLabel}>followers</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statCount}>{cardData.stats.following}</span>
                  <span className={styles.statLabel}>following</span>
                </div>
              </div>

              {cardData.user.profile?.bio && (
                <p className={styles.cardBio}>{cardData.user.profile.bio}</p>
              )}
            </>
          )}
        </div>
      )}
    </span>
  );
}
