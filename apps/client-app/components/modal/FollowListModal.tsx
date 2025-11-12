'use client';

import { useEffect, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Link from 'next/link';
import { CloseIcon } from '@/components/ui/icons';
import styles from './FollowListModal.module.scss';
import { followAPI } from '@/lib/api/follow';
import ConfirmModal from '@/components/modal/ConfirmModal';
import { usersApi } from '@/lib/api/users';
import { useAuthStore } from '@/lib/store/authStore';
import type { Follower, Following, FollowProfile } from '@repo/shared-types';

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string; // the owner of the profile whose followers/following we are listing
  type: 'followers' | 'following';
}

export default function FollowListModal({ isOpen, onClose, userId, type }: FollowListModalProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<(Follower | Following)[]>([]);
  const { user: currentUser } = useAuthStore();

  // map of profileId -> follow status (from perspective of currentUser)
  const [followStatusMap, setFollowStatusMap] = useState<Record<string, { isFollowing: boolean; isPending: boolean } | null>>({});

  useEffect(() => {
    if (!isOpen) return;
    // Avoid calling API with missing id (could happen for placeholder profile)
    if (!userId) {
      setItems([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        if (type === 'followers') {
          const res = await followAPI.getFollowers(userId, 1, 100);
          setItems(res.followers || []);
        } else {
          const res = await followAPI.getFollowing(userId, 1, 100);
          setItems(res.following || []);
        }
      } catch (err) {
        console.error('Failed to load follow list', err);
        // Show nothing on error and keep UI responsive
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, type, userId]);

  // State for confirm modal
  const [showConfirm, setShowConfirm] = useState(false);
  const [profileToConfirm, setProfileToConfirm] = useState<FollowProfile | null>(null);
  const [actionToConfirm, setActionToConfirm] = useState<'follow' | 'unfollow' | 'remove' | null>(null);

  const requestAction = (profile: FollowProfile, action: 'follow' | 'unfollow' | 'remove') => {
    // Set profile+action for confirmation
    setProfileToConfirm(profile);
    setActionToConfirm(action);
    setShowConfirm(true);
  };

  const performAction = async (profile: FollowProfile, action?: 'follow' | 'unfollow' | 'remove') => {
    try {
      // Attempt to unfollow/remove the user. Backend expects a userId (not profile id).
      // some API responses include userId on the profile object (follow requests), prefer that when available
      let targetUserId = (profile as unknown as { userId?: string }).userId;
      if (!targetUserId) {
        // Fetch user by username to get user id
        try {
          const user = await usersApi.getUserByUsername(profile.username);
          targetUserId = user.id;
        } catch (err) {
          console.error('Failed to resolve user id for unfollow', err);
          return;
        }
      }

      // Decide which API to call based on action
      if (action === 'follow') {
        await followAPI.followUser(targetUserId!);
      } else {
        // 'unfollow' or 'remove' both call unfollow endpoint for now
        await followAPI.unfollowUser(targetUserId!);
      }
      // Update local list depending on action: remove from list for 'remove', otherwise update followStatusMap
      if (action === 'remove') {
        setItems(prev => prev.filter(item => item.profile.id !== profile.id));
      } else if (action === 'follow') {
        setFollowStatusMap(prev => ({ ...prev, [profile.id]: { isFollowing: true, isPending: false } }));
      } else {
        // unfollow
        setFollowStatusMap(prev => ({ ...prev, [profile.id]: { isFollowing: false, isPending: false } }));
      }

      // notify others
      try {
        window.dispatchEvent(new CustomEvent('follow:changed', { detail: { targetUserId, action: action === 'follow' ? 'follow' : 'unfollow' } }));
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('Failed to unfollow/remove', err);
    }
  };

  // When items load, populate followStatusMap for the current viewer (so we can show Follow/Unfollow)
  useEffect(() => {
    if (!currentUser || !items || items.length === 0) return;

    let mounted = true;
    const loadStatuses = async () => {
      const map: Record<string, { isFollowing: boolean; isPending: boolean } | null> = {};
      await Promise.all(items.map(async (it) => {
        const profile = it.profile;
        try {
          // resolve user id
          const user = await usersApi.getUserByUsername(profile.username);
          const status = await followAPI.isFollowing(currentUser.id, user.id);
          if (!mounted) return;
          map[profile.id] = { isFollowing: status.isFollowing, isPending: status.isPending };
          } catch {
            // don't block on errors; leave null
            map[profile.id] = null;
          }
      }));
      if (mounted) setFollowStatusMap(map);
    };

    loadStatuses();

    return () => { mounted = false; };
  }, [items, currentUser]);

  const filtered = items.filter(item => {
    const p = item.profile;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (p.username || '').toLowerCase().includes(q) || (p.displayName || '').toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <>
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{type === 'followers' ? 'Followers' : 'Following'}</h3>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className={styles.searchWrapper}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${type}`}
            className={styles.searchInput}
            autoFocus
          />
        </div>

        <div className={styles.listArea}>
          {loading ? (
            <div className={styles.loading}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>No results</div>
          ) : (
            <ul className={styles.list}>
              {filtered.map(item => (
                <li key={item.profile.id} className={styles.listItem}>
                  <Link href={`/app/profile/${item.profile.username}`} className={styles.userLink} onClick={onClose}>
                    <div className={styles.avatarWrap}>
                      <Avatar avatarUrl={item.profile.avatarUrl} username={item.profile.username} size="md" unoptimized />
                    </div>
                    <div className={styles.userInfo}>
                      <div className={styles.username}>{item.profile.username}</div>
                      <div className={styles.displayName}>{item.profile.displayName}</div>
                    </div>
                  </Link>

                  <div className={styles.actions}>
                    {(() => {
                      const isOwner = currentUser?.id === userId;
                      const isSelf = currentUser?.profile?.username === item.profile.username;
                      
                      // Don't show any button for yourself
                      if (isSelf) {
                        return null;
                      }

                      const status = followStatusMap[item.profile.id];
                      let action: 'follow' | 'unfollow' | 'remove' = 'unfollow';
                      if (type === 'followers') {
                        if (isOwner) action = 'remove';
                        else action = status?.isFollowing ? 'unfollow' : 'follow';
                      } else {
                        // viewing following list
                        if (isOwner) action = 'unfollow';
                        else action = status?.isFollowing ? 'unfollow' : 'follow';
                      }

                      const label = action === 'remove' ? 'Remove' : action === 'unfollow' ? 'Unfollow' : 'Follow';

                      return (
                        <button
                          className={styles.actionButton}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); requestAction(item.profile, action); }}
                        >
                          {label}
                        </button>
                      );
                    })()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
    <ConfirmModal
      isOpen={showConfirm}
      title={actionToConfirm === 'remove' ? 'Remove follower' : actionToConfirm === 'follow' ? 'Follow' : 'Unfollow'}
      message={profileToConfirm ? (
        actionToConfirm === 'remove' ? `Remove @${profileToConfirm.username} from your followers?` :
        actionToConfirm === 'follow' ? `Follow @${profileToConfirm.username}?` : `Unfollow @${profileToConfirm.username}?`
      ) : ''}
      confirmLabel={actionToConfirm === 'remove' ? 'Remove' : actionToConfirm === 'follow' ? 'Follow' : 'Unfollow'}
      cancelLabel="Cancel"
      danger={actionToConfirm === 'remove' || actionToConfirm === 'unfollow'}
      onConfirm={() => {
        if (profileToConfirm && actionToConfirm) performAction(profileToConfirm, actionToConfirm);
        setShowConfirm(false);
        setProfileToConfirm(null);
        setActionToConfirm(null);
      }}
      onCancel={() => { setShowConfirm(false); setProfileToConfirm(null); setActionToConfirm(null); }}
    />
    </>
  );
}
