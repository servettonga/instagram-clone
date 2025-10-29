// Recent searches localStorage utility

const RECENT_SEARCHES_KEY = 'instagram_recent_searches';
const MAX_RECENT_SEARCHES = 20;

export interface RecentSearchItem {
  id: string;
  type: 'user' | 'post';
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
 * Get all recent searches from localStorage
 */
export function getRecentSearches(): RecentSearchItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
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
 * Add a new recent search (or update if already exists)
 */
export function addRecentSearch(item: Omit<RecentSearchItem, 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  try {
    const searches = getRecentSearches();

    // Remove if already exists (by id)
    const filtered = searches.filter(s => s.id !== item.id);

    // Add new item at the beginning
    const newSearches = [
      { ...item, timestamp: Date.now() },
      ...filtered,
    ].slice(0, MAX_RECENT_SEARCHES); // Keep only the most recent N items

    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(newSearches));
  } catch (error) {
    console.error('Failed to save recent search:', error);
  }
}

/**
 * Remove a specific recent search by id
 */
export function removeRecentSearch(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const searches = getRecentSearches();
    const filtered = searches.filter(s => s.id !== id);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove recent search:', error);
  }
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Failed to clear recent searches:', error);
  }
}
