// Recent searches localStorage utility

const RECENT_SEARCHES_KEY_PREFIX = 'instagram_recent_searches';
const MAX_RECENT_SEARCHES = 20;

/**
 * Get the user-specific localStorage key
 */
function getStorageKey(userId?: string): string {
  if (!userId) return `${RECENT_SEARCHES_KEY_PREFIX}_guest`;
  return `${RECENT_SEARCHES_KEY_PREFIX}_${userId}`;
}

export interface RecentSearchItem {
  id: string;
  type: 'user' | 'post' | 'query';
  // For text queries
  query?: string;
  // For users
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  isVerified?: boolean;
  following?: boolean;
  // For posts
  postCaption?: string;
  postImageUrl?: string;
  timestamp: number;
}

/**
 * Get all recent searches from localStorage for a specific user
 */
export function getRecentSearches(userId?: string): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (!stored) return [];

    const searches = JSON.parse(stored) as RecentSearchItem[];
    // Sort by most recent first
    return searches.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load recent searches:', error);
    return [];
  }
}

/**
 * Add a new recent search (or update if already exists) for a specific user
 */
export function addRecentSearch(item: Omit<RecentSearchItem, 'timestamp'>, userId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const searches = getRecentSearches(userId);

    // Remove if already exists (by id)
    const filtered = searches.filter(s => s.id !== item.id);

    // Add new item at the beginning
    const newSearches = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_SEARCHES); // Keep only the most recent N items

    localStorage.setItem(getStorageKey(userId), JSON.stringify(newSearches));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
}

/**
 * Remove a specific recent search by id for a specific user
 */
export function removeRecentSearch(id: string, userId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const searches = getRecentSearches(userId);
    const filtered = searches.filter(s => s.id !== id);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove recent search:', error);
  }
}

/**
 * Clear all recent searches for a specific user
 */
export function clearRecentSearches(userId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(getStorageKey(userId));
  } catch (error) {
    console.error('Failed to clear recent searches:', error);
  }
}
