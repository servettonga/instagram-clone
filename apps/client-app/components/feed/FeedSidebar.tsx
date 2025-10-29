// Feed sidebar component with user info and suggestions

import Image from 'next/image';
import Link from 'next/link';
import Footer from '@/components/ui/Footer';
import styles from './FeedSidebar.module.scss';

interface Profile {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
}

interface Suggestion {
  username: string;
  note: string;
  avatar: string;
}

interface FeedSidebarProps {
  profile?: Profile;
  suggestions: Suggestion[];
}

export default function FeedSidebar({ profile, suggestions }: FeedSidebarProps) {
  if (!profile) return null;

  return (
    <aside className={styles.sidebar}>
      {/* Current User */}
      <div className={styles.sidebarUser}>
        <Link href={`/app/profile/${profile.username}`}>
          <div className={styles.sidebarAvatarWrapper}>
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.username}
                width={56}
                height={56}
                className={styles.sidebarAvatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {profile.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
        </Link>
        <div className={styles.sidebarUserInfo}>
          <Link href={`/app/profile/${profile.username}`} className={styles.sidebarUsername}>
            {profile.username}
          </Link>
          <div className={styles.sidebarDisplayName}>{profile.displayName}</div>
        </div>
      </div>

      {/* Suggestions */}
      <div className={styles.suggestions}>
        <div className={styles.suggestionsHeader}>
          <span className={styles.suggestionsTitle}>Suggestions for you</span>
          <button className={styles.seeAllButton}>See All</button>
        </div>
        <div className={styles.suggestionsList}>
          {suggestions.map((suggestion) => (
            <div key={suggestion.username} className={styles.suggestionItem}>
              <Image
                src={suggestion.avatar}
                alt={suggestion.username}
                width={32}
                height={32}
                className={styles.suggestionAvatar}
                unoptimized
              />
              <div className={styles.suggestionInfo}>
                <Link href={`/app/profile/${suggestion.username}`} className={styles.suggestionUsername}>
                  {suggestion.username}
                </Link>
                <div className={styles.suggestionNote}>{suggestion.note}</div>
              </div>
              <button className={styles.followButton}>Follow</button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <Footer variant="sidebar" />
    </aside>
  );
}
