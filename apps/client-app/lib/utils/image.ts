/**
 * Utility functions for image URL manipulation
 */

export type ImageSize = 'thumbnail' | 'medium' | 'full';

/**
 * Transform absolute image URLs to relative URLs for local network compatibility
 * In development, database stores URLs like http://localhost:8000/uploads/...
 * These need to be converted to relative /uploads/... so they go through Next.js rewrites
 *
 * @param url - Original image URL
 * @returns Transformed URL (relative in development, unchanged in production)
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  // In development, convert absolute localhost URLs to relative paths
  // This allows Next.js rewrites to proxy them correctly for local network access
  if (process.env.NODE_ENV === 'development') {
    // Match http://localhost:8000/uploads/... or http://127.0.0.1:8000/uploads/...
    const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/;
    if (localhostPattern.test(url)) {
      return url.replace(localhostPattern, '');
    }
  }

  return url;
}

/**
 * Get the appropriate image size variant from a full-size image URL
 * @param url - Original image URL (typically the full-size version)
 * @param size - Desired size variant ('thumbnail', 'medium', or 'full')
 * @returns URL with the appropriate size suffix
 *
 * @example
 * getImageSize('http://localhost:8000/uploads/posts/post-123-full.webp', 'thumbnail')
 * // Returns: '/uploads/posts/post-123-thumb.webp' (in development)
 */
export function getImageSize(url: string, size: ImageSize = 'full'): string {
  if (!url) return url;

  // First normalize the URL for local network compatibility
  let normalizedUrl = normalizeImageUrl(url);

  // Don't modify URLs that aren't own post images
  if (!normalizedUrl.includes('/uploads/posts/') || !normalizedUrl.includes('.webp')) {
    return normalizedUrl;
  }

  // Map size to the actual file suffix used by the backend
  const sizeMap: Record<ImageSize, string> = {
    thumbnail: '-thumb.webp',
    medium: '-medium.webp',
    full: '-full.webp',
  };

  const targetSuffix = sizeMap[size];

  // Replace any existing size suffix with the target one
  // Handles: -thumb.webp, -medium.webp, -full.webp
  return normalizedUrl.replace(/-(thumb|medium|full)\.webp$/i, targetSuffix);
}
