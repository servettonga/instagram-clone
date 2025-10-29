/**
 * Date/Time utilities for the client application
 */

/**
 * Calculate relative time difference (e.g., "2h ago", "5m ago")
 * Used in feed and profile pages for displaying post timestamps
 *
 * @param date - Date object or ISO string
 * @returns Human-readable relative time string
 */
export function getTimeAgo(date: Date | string): string {
  const now = new Date();
  const postDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo`;
  return `${Math.floor(diffInSeconds / 31536000)}y`;
}
