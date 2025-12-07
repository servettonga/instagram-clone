// Profile header component

import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './ProfileHeader.module.scss';
import { useState, useEffect } from 'react';
import FollowListModal from '@/components/modal/FollowListModal';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import { followAPI } from '@/lib/api/follow';
import { chatsAPI } from '@/lib/api/chats';
import { getFollowersCountForUsername, invalidateFollowersCount } from '@/lib/utils/profileCache';

interface ProfileHeaderProps {
  profile: {
    username: string;
    displayName: string;
    bio?: string | null;
    website?: string | null;
    category?: string | null;
    avatarUrl?: string | null;
    id?: string;
    userId?: string;
  };
  isOwnProfile: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
  onViewArchive?: () => void;
}

export default function ProfileHeader({ profile, isOwnProfile, stats, onViewArchive }: ProfileHeaderProps) {
  const [modalType, setModalType] = useState<'followers' | 'following' | null>(null);
  const { user: currentUser } = useAuthStore();
  const { chats, selectChat } = useChatStore();
  const router = useRouter();

  // followState: 'loading' | 'not-following' | 'following' | 'pending'
  const [followState, setFollowState] = useState<'loading' | 'not-following' | 'following' | 'pending'>('loading');
  const [isHoveringRequested, setIsHoveringRequested] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const openModal = (type: 'followers' | 'following') => {
    setModalType(type);
  };

  const closeModal = () => setModalType(null);

  useEffect(() => {
    // If viewing own profile or no current user, no follow state needed
    const targetUserId = profile.userId || profile.id;
    if (!currentUser || !targetUserId || isOwnProfile) {
      setFollowState('not-following');
      return;
    }

    let mounted = true;
    const check = async () => {
      setFollowState('loading');
      try {
        const res = await followAPI.isFollowing(currentUser.id, targetUserId);
        if (!mounted) return;
        if (res.isFollowing) setFollowState('following');
        else if (res.isPending) setFollowState('pending');
        else setFollowState('not-following');
      } catch (err) {
        console.error('Failed to get follow status', err);
        if (mounted) setFollowState('not-following');
      }
    };

    check();

    // Listen for follow:changed events to refresh status
    const handleFollowChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // If this profile's follow status changed, refresh
      if (detail?.targetUserId === targetUserId) {
        check();
      }
    };

    window.addEventListener('follow:changed', handleFollowChanged as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('follow:changed', handleFollowChanged as EventListener);
    };
  }, [currentUser, profile.userId, profile.id, isOwnProfile]);

  const targetUserId = profile.userId || profile.id || '';

  const handleFollow = async () => {
    if (!targetUserId) return;
    setFollowState('loading');
    try {
      const res = await followAPI.followUser(targetUserId);
      // accepted === true means immediately following; false/null may be pending
      if (res.accepted) {
        setFollowState('following');
        // optimistic UI update
        setFollowersCount((c) => c + 1);
        // refresh authoritative count via cached helper, then dispatch a global event
        try {
          invalidateFollowersCount(profile.username);
          const refreshedTotal = await getFollowersCountForUsername(profile.username);
          console.debug('Refreshed followers total after follow (cached):', refreshedTotal);
          setFollowersCount(refreshedTotal ?? (followersCount + 1));

          try {
            // include authoritative count when available to spare listeners an extra lookup
            const summary = refreshedTotal != null ? { username: profile.username, followersCount: refreshedTotal } : { username: profile.username };
            window.dispatchEvent(
              new CustomEvent('follow:changed', { detail: { targetUserId, username: profile.username, summary, action: 'follow' } }),
            );
          } catch {
            /* ignore if window unavailable */
          }
        } catch (err) {
          // ignore refresh errors; keep optimistic count and still notify listeners with username only
          console.warn('Failed to refresh followers count (cached)', err);
          try {
            window.dispatchEvent(
              new CustomEvent('follow:changed', { detail: { targetUserId, username: profile.username, action: 'follow' } }),
            );
          } catch {
            /* ignore */
          }
        }
      } else setFollowState('pending');
    } catch (err) {
      console.error('Failed to follow user', err);
      setFollowState('not-following');
    }
  };

  const handleCancelRequest = async () => {
    if (!targetUserId) return;
    setFollowState('loading');
    try {
      await followAPI.unfollowUser(targetUserId);
      setFollowState('not-following');

      try {
        window.dispatchEvent(
          new CustomEvent('follow:changed', { detail: { targetUserId, username: profile.username, action: 'cancel-request' } }),
        );
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Failed to cancel follow request', err);
      setFollowState('pending');
    }
  };

  const handleUnfollow = async () => {
    // show confirmation modal instead of native confirm
    if (!targetUserId) return;
    setShowConfirm(true);
  };

  const [showConfirm, setShowConfirm] = useState(false);

  const confirmUnfollow = async () => {
    setShowConfirm(false);
    if (!targetUserId) return;
    setFollowState('loading');
    try {
      await followAPI.unfollowUser(targetUserId);
      setFollowState('not-following');
      // optimistic decrement
      setFollowersCount((c) => Math.max(0, c - 1));

        // refresh authoritative count via cached helper, then dispatch a global event
        try {
          invalidateFollowersCount(profile.username);
          const refreshedTotal = await getFollowersCountForUsername(profile.username);
          console.debug('Refreshed followers total after unfollow (cached):', refreshedTotal);
          setFollowersCount(refreshedTotal ?? Math.max(0, followersCount - 1));

          try {
            const summary = refreshedTotal != null ? { username: profile.username, followersCount: refreshedTotal } : { username: profile.username };
            window.dispatchEvent(
              new CustomEvent('follow:changed', { detail: { targetUserId, username: profile.username, summary, action: 'unfollow' } }),
            );
          } catch {
            /* ignore */
          }
        } catch (err) {
          console.warn('Failed to refresh followers count (cached)', err);
          try {
            window.dispatchEvent(
              new CustomEvent('follow:changed', { detail: { targetUserId, username: profile.username, action: 'unfollow' } }),
            );
          } catch {
            /* ignore */
          }
        }
    } catch (err) {
      console.error('Failed to unfollow user', err);
      setFollowState('following');
    }
  };

  // local optimistic followers count
  const [followersCount, setFollowersCount] = useState<number>(stats.followers ?? 0);

  // keep local followers count in sync with prop changes
  useEffect(() => {
    setFollowersCount(stats.followers ?? 0);
  }, [stats.followers]);

  const handleMessage = async () => {
    if (!targetUserId || isCreatingChat) return;

    try {
      setIsCreatingChat(true);

      // Check if a private chat already exists with this user
      const existingChat = chats.find(
        (chat) =>
          chat.type === 'PRIVATE' &&
          chat.participants?.some((p) => p.id === targetUserId)
      );

      if (existingChat) {
        // Chat exists, navigate and select it
        selectChat(existingChat.id);
        router.push('/app/messages');
      } else {
        // Create new private chat
        const newChat = await chatsAPI.createPrivateChat(targetUserId);
        selectChat(newChat.id);
        router.push('/app/messages');
      }
    } catch (err) {
      console.error('Failed to open chat:', err);
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <>
      <div className={styles.profileHeader}>
      <div className={styles.topSection}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <Avatar avatarUrl={profile.avatarUrl} username={profile.displayName || profile.username} size="xl" unoptimized />
          </div>
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.profileActions}>
            <h1 className={styles.username}>{profile.username}</h1>
          </div>

          <div className={styles.profileStats}>
            <div className={styles.statItem}>
              <span className={styles.statCount}>{stats.posts}</span>
              <span className={styles.statLabel}>posts</span>
            </div>
            <div className={styles.statItem}>
              <button className={styles.statButton} onClick={() => openModal('followers')}>
                <span className={styles.statCount}>{followersCount}</span>
                <span className={styles.statLabel}>followers</span>
              </button>
            </div>
            <div className={styles.statItem}>
              <button className={styles.statButton} onClick={() => openModal('following')}>
                <span className={styles.statCount}>{stats.following}</span>
                <span className={styles.statLabel}>following</span>
              </button>
            </div>
          </div>

          <div className={styles.profileBio}>
            <div className={styles.displayName}>{profile.displayName}</div>
            {profile.category && (
              <div className={styles.bioCategory}>{profile.category}</div>
            )}
            {profile.bio && (
              <div className={styles.bioText}>{profile.bio}</div>
            )}
            {profile.website && (
              <a href={`https://${profile.website}`} className={styles.bioLink} target="_blank" rel="noopener noreferrer">
                {profile.website}
              </a>
            )}
          </div>
        </div>
      </div>

      <div className={styles.actionButtons}>
        {isOwnProfile ? (
          <>
            <Link href="/app/settings/account" className={styles.buttonLink}>
              <button className={styles.editButton}>Edit profile</button>
            </Link>
            <button className={styles.archiveButton} onClick={onViewArchive}>View archive</button>
          </>
        ) : (
          <>
            {followState === 'loading' && (
              <button className={styles.followButton} disabled>Loading...</button>
            )}
            {followState === 'not-following' && (
              <button className={styles.followButton} onClick={handleFollow}>Follow</button>
            )}
            {followState === 'pending' && (
              <button
                className={styles.requestedButton}
                onClick={handleCancelRequest}
                onMouseEnter={() => setIsHoveringRequested(true)}
                onMouseLeave={() => setIsHoveringRequested(false)}
              >
                {isHoveringRequested ? 'Cancel request' : 'Requested'}
              </button>
            )}
            {followState === 'following' && (
              <button className={styles.messageButton} onClick={handleUnfollow}>Following</button>
            )}

            <button
              className={styles.messageButton}
              onClick={handleMessage}
              disabled={isCreatingChat}
            >
              {isCreatingChat ? 'Opening...' : 'Message'}
            </button>
          </>
        )}
      </div>
      </div>

      {modalType && (
        <FollowListModal
          isOpen={true}
          onClose={closeModal}
          userId={profile.userId || profile.id || ''}
          type={modalType!}
        />
      )}
      <ConfirmModal
        isOpen={showConfirm}
        title="Unfollow"
        message={`Unfollow @${profile.username}?`}
        confirmLabel="Unfollow"
        cancelLabel="Cancel"
        danger={true}
        onConfirm={confirmUnfollow}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}
