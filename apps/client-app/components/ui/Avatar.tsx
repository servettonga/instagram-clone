'use client';

import Image from 'next/image';
import React from 'react';
import styles from './Avatar.module.scss';
import { normalizeImageUrl } from '@/lib/utils/image';

interface AvatarProps {
  avatarUrl?: string | null;
  username?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alt?: string;
  unoptimized?: boolean;
}
export default function Avatar({ avatarUrl, username, size = 'md', alt = '', unoptimized = false }: AvatarProps) {
  // Normalize URL for local network compatibility
  const normalizedAvatarUrl = normalizeImageUrl(avatarUrl);

  // compute initials: always use first letters of first two words when possible
  const computeInitials = (name?: string) => {
    const count = 2;
    if (!name) return '?'.repeat(count);
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      return (words[0]!.charAt(0) + words[1]!.charAt(0)).toUpperCase();
    }
    const compact = name.replace(/\s+/g, '');
    // pad with ? if short
    const result = compact.substring(0, count).toUpperCase();
    return result.padEnd(count, '?');
  };

  // Map token to numeric px for Image component and to SCSS class
  const tokenToPx: Record<string, number> = {
    sm: 24,
    md: 32,
    lg: 56,
    xl: 112,
  };
  const px = tokenToPx[size] || tokenToPx['md'];
  const stylesMap = styles as unknown as Record<string, string>;
  const sizeClass = stylesMap[size] || styles.md;

  if (normalizedAvatarUrl && normalizedAvatarUrl.trim().length > 0) {
    return (
      <Image
          src={normalizedAvatarUrl}
          alt={alt || username || 'Avatar'}
          width={px}
          height={px}
          className={`${styles.image} ${sizeClass}`}
          unoptimized={unoptimized}
        />
    );
  }

  // Placeholder with gradient and centered letters
  return (
    <div className={`${styles.root} ${sizeClass}`} aria-hidden>
      {computeInitials(username)}
    </div>
  );
}
