// Profile summary cache (in-memory, with TTL, inflight dedupe and simple LRU)
import { usersApi } from '@/lib/api/users';
import { followAPI } from '@/lib/api/follow';
import { postsAPI } from '@/lib/api/posts';

export type ProfileSummary = {
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  postsCount?: number | null;
  followersCount?: number | null;
  followingCount?: number | null;
  isPublic?: boolean | null;
  userId?: string;
  updatedAt?: string | null;
};

type CacheEntry = {
  value: ProfileSummary | null;
  expiresAt: number;
};

const DEFAULT_TTL_MS = 1000 * 60 * 5; // 5 minutes
const NEGATIVE_TTL_MS = 1000 * 10; // 10 seconds on error
const MAX_ENTRIES = 200;

const cache = new Map<string, CacheEntry>(); // username -> entry (Map preserves insertion order)
const inflight = new Map<string, Promise<ProfileSummary | null>>();
const userIdToUsername = new Map<string, string>();

function touchKey(key: string, entry: CacheEntry) {
  // Move key to the end to mark as recently used
  cache.delete(key);
  cache.set(key, entry);
}

function evictIfNeeded() {
  while (cache.size > MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (!firstKey) break;
    cache.delete(firstKey);
  }
}

export async function getProfileSummaryForUsername(username: string, ttlMs = DEFAULT_TTL_MS): Promise<ProfileSummary | null> {
  if (!username) return null;

  const now = Date.now();
  const existing = cache.get(username);
  if (existing && existing.expiresAt > now) {
    // LRU touch
    touchKey(username, existing);
    return existing.value;
  }

  // If request already in-flight, return the same promise
  const inflightPromise = inflight.get(username);
  if (inflightPromise) return inflightPromise;

  const p = (async () => {
    try {
      const user = await usersApi.getUserByUsername(username);
      if (!user || !user.profile) {
        const entry: CacheEntry = { value: null, expiresAt: Date.now() + ttlMs };
        cache.set(username, entry);
        evictIfNeeded();
        return null;
      }

      const userId = user.id;
      userIdToUsername.set(userId, username);

      // Fetch followers, following and posts count in parallel
      const followersP = followAPI.getFollowers(userId, 1, 1).then(r => r.total ?? null).catch(() => null);
      const followingP = followAPI.getFollowing(userId, 1, 1).then(r => r.total ?? null).catch(() => null);
      // posts count via postsAPI with profileId (profile.id)
      const postsP = postsAPI.getAllPosts({ profileId: user.profile.id, page: 1, limit: 1 }).then(r => r.pagination?.total ?? null).catch(() => null);

      const [followersCount, followingCount, postsCount] = await Promise.all([followersP, followingP, postsP]);

      const summary: ProfileSummary = {
        username: user.profile.username,
        displayName: user.profile.displayName,
        avatarUrl: user.profile.avatarUrl,
        bio: user.profile.bio ?? null,
        postsCount: postsCount ?? null,
        followersCount: followersCount ?? null,
        followingCount: followingCount ?? null,
        isPublic: user.profile.isPublic ?? null,
        userId,
        updatedAt: new Date().toISOString(),
      };

      const entry: CacheEntry = { value: summary, expiresAt: Date.now() + ttlMs };
      cache.set(username, entry);
      evictIfNeeded();
      return summary;
    } catch (err) {
      // set a short negative cache entry
      const entry: CacheEntry = { value: null, expiresAt: Date.now() + NEGATIVE_TTL_MS };
      cache.set(username, entry);
      evictIfNeeded();
      console.error('getProfileSummaryForUsername error', err);
      return null;
    } finally {
      inflight.delete(username);
    }
  })();

  inflight.set(username, p);
  return p;
}

export async function getFollowersCountForUsername(username: string): Promise<number | null> {
  const s = await getProfileSummaryForUsername(username);
  return s?.followersCount ?? null;
}

export function setProfileSummaryForUsername(username: string, summary: ProfileSummary | null, ttlMs = DEFAULT_TTL_MS) {
  if (!username) return;
  const entry: CacheEntry = { value: summary, expiresAt: Date.now() + ttlMs };
  cache.set(username, entry);
  if (summary?.userId) userIdToUsername.set(summary.userId, username);
  evictIfNeeded();
}

export function invalidateProfileByUsername(username: string) {
  if (!username) return;
  cache.delete(username);
}

export function invalidateProfileByUserId(userId: string) {
  const username = userIdToUsername.get(userId);
  if (username) cache.delete(username);
  userIdToUsername.delete(userId);
}

export function invalidateFollowersCount(username: string) {
  // backward-compat alias
  invalidateProfileByUsername(username);
}
