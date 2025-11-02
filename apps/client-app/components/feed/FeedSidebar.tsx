// Feed sidebar component with user info and suggestions

import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Footer from '@/components/ui/Footer';
import styles from './FeedSidebar.module.scss';
import { useAuthStore } from '@/lib/store/authStore';
import { followAPI } from '@/lib/api/follow';

interface Profile {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface SuggestionItem {
  id?: string; // profile id
  userId?: string; // user id (for follow endpoints)
  username: string;
  note: string;
  avatar: string;
  followersCount?: number;
  followsYou?: boolean;
  followedBy?: string[];
}

interface FeedSidebarProps {
  profile?: Profile;
  // null = loading/not fetched yet; undefined treated same as empty
  suggestions?: SuggestionItem[] | null;
}

type FollowStatus = 'not_following' | 'pending' | 'following';

export default function FeedSidebar({ profile, suggestions }: FeedSidebarProps) {
  const { user } = useAuthStore();
  const currentUserId = user?.id || '';

  const [items, setItems] = useState<SuggestionItem[]>(suggestions ?? []);
  const [statusMap, setStatusMap] = useState<Record<string, FollowStatus>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Initialize items when suggestions prop changes
  useEffect(() => {
    setItems(suggestions ?? []);
  }, [suggestions]);

  // Check follow status for each suggestion (to detect pending/following)
  useEffect(() => {
    if (!user || !suggestions) return;

    suggestions.forEach(async (s) => {
      if (!s.userId) return; // need userId to check
      try {
        const res = await followAPI.isFollowing(currentUserId, s.userId);
        const st: FollowStatus = res.isFollowing ? 'following' : res.isPending ? 'pending' : 'not_following';
        setStatusMap((m) => ({ ...m, [s.userId || s.username]: st }));
      } catch {
        // ignore transient errors
      }
    });
  }, [suggestions, user, currentUserId]);

  if (!profile) return null;

  const handleFollowToggle = async (item: SuggestionItem) => {
    const key = item.userId || item.username;
    const current = statusMap[key] || 'not_following';
    // optimistic UI
    setLoadingMap((m) => ({ ...m, [key]: true }));

    try {
      if (current === 'not_following') {
        // send follow request
        const res = await followAPI.followUser(item.userId || '');
        const newStatus: FollowStatus = res.accepted === true ? 'following' : 'pending';
        setStatusMap((m) => ({ ...m, [key]: newStatus }));
      } else {
        // unfollow / cancel request
        await followAPI.unfollowUser(item.userId || '');
        setStatusMap((m) => ({ ...m, [key]: 'not_following' }));
      }
    } catch (err) {
      console.error('Follow toggle failed', err);
    } finally {
      setLoadingMap((m) => ({ ...m, [key]: false }));
    }
  };

  const renderNote = (item: SuggestionItem) => {
    if (item.followsYou) return 'Follows you';
    if (item.followedBy && item.followedBy.length > 0) {
      // show up to 2 names then 'and N others'
      const names = item.followedBy.slice(0, 2);
      const others = item.followedBy.length - names.length;
      return others > 0 ? `Followed by ${names.join(', ')} and ${others} others` : `Followed by ${names.join(', ')}`;
    }
    return item.followersCount ? `${item.followersCount} followers` : item.note;
  };

  return (
    <aside className={styles.sidebar}>
      {/* Current User */}
      <div className={styles.sidebarUser}>
        <Link href={`/app/profile/${profile.username}`}>
            <div className={styles.sidebarAvatarWrapper}>
            <Avatar avatarUrl={profile.avatarUrl} username={profile.displayName || profile.username} size="lg" />
          </div>
        </Link>
        <div className={styles.sidebarUserInfo}>
          <Link href={`/app/profile/${profile.username}`} className={styles.sidebarUsername}>
            {profile.username}
          </Link>
          <div className={styles.sidebarDisplayName}>{profile.displayName}</div>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions && suggestions.length > 0 && (
        <div className={styles.suggestions}>
          <div className={styles.suggestionsHeader}>
            <span className={styles.suggestionsTitle}>Suggestions for you</span>
            <button className={styles.seeAllButton}>See All</button>
          </div>
          <div className={styles.suggestionsList}>
            {items.map((suggestion) => {
            const key = suggestion.userId || suggestion.username;
            const status = statusMap[key] || 'not_following';
            const isLoading = loadingMap[key] || false;

            const label = status === 'not_following' ? 'Follow' : status === 'pending' ? 'Requested' : 'Following';

            return (
              <div key={key} className={styles.suggestionItem}>
                  <Avatar
                    avatarUrl={suggestion.avatar || undefined}
                    username={suggestion.username}
                    size="md"
                    unoptimized
                  />
                <div className={styles.suggestionInfo}>
                  <Link href={`/app/profile/${suggestion.username}`} className={styles.suggestionUsername}>
                    {suggestion.username}
                  </Link>
                  <div className={styles.suggestionNote}>{renderNote(suggestion)}</div>
                </div>
                <button
                  className={styles.followButton}
                  disabled={isLoading || !suggestion.userId}
                  onClick={() => handleFollowToggle(suggestion)}
                >
                  {isLoading ? '…' : label}
                </button>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer variant="sidebar" />
    </aside>
  );
}
