/**
 * Utility functions for image URL manipulation
 */

export type ImageSize = 'thumbnail' | 'medium' | 'full';

/**
 * Get the appropriate image size variant from a full-size image URL
 * @param url - Original image URL (typically the full-size version)
 * @param size - Desired size variant ('thumbnail', 'medium', or 'full')
 * @returns URL with the appropriate size suffix
 *
 * @example
 * getImageSize('http://localhost:8000/uploads/posts/post-123-full.webp', 'thumbnail')
 * // Returns: 'http://localhost:8000/uploads/posts/post-123-thumb.webp'
 */
export function getImageSize(url: string, size: ImageSize = 'full'): string {
  if (!url) return url;

  // Don't modify URLs that aren't own post images
  if (!url.includes('/uploads/posts/') || !url.includes('.webp')) {
    return url;
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
  return url.replace(/-(thumb|medium|full)\.webp$/i, targetSuffix);
}
