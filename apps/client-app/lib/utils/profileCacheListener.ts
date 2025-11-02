import { invalidateProfileByUsername, getProfileSummaryForUsername, setProfileSummaryForUsername, ProfileSummary } from './profileCache';
import { usersApi } from '@/lib/api/users';

let mounted = false;

export function initFollowCacheInvalidation() {
  if (typeof window === 'undefined' || mounted) return () => {};
  mounted = true;

  const handler = async (e: Event) => {
  const detail = (e as CustomEvent).detail as { targetUserId?: string; username?: string; summary?: Partial<ProfileSummary>; action?: 'follow' | 'unfollow' } | undefined;
    if (!detail) return;

    try {
      if (detail.summary && detail.summary.username) {
        // If caller provided a summary that includes username, seed the cache directly
        setProfileSummaryForUsername(detail.summary.username as string, detail.summary as ProfileSummary);
        return;
      }

      if (detail.username) {
        // Invalidate by username and refresh in background
        invalidateProfileByUsername(detail.username);
        getProfileSummaryForUsername(detail.username).catch(() => {});
        return;
      }

      if (detail.targetUserId) {
        // Fallback: resolve username by id
        const user = await usersApi.getUserById(detail.targetUserId);
        const username = user?.profile?.username;
        if (!username) return;
        invalidateProfileByUsername(username);
        getProfileSummaryForUsername(username).catch(() => {});
      }
    } catch (err) {
      console.warn('Failed to invalidate follower/profile cache for event', detail, err);
    }
  };

  window.addEventListener('follow:changed', handler as EventListener);

  return () => {
    window.removeEventListener('follow:changed', handler as EventListener);
    mounted = false;
  };
}
