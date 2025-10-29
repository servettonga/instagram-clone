// Profile header component

import Image from 'next/image';
import Link from 'next/link';
import styles from './ProfileHeader.module.scss';

interface ProfileHeaderProps {
  profile: {
    username: string;
    displayName: string;
    bio?: string | null;
    website?: string | null;
    category?: string | null;
    avatarUrl?: string | null;
  };
  isOwnProfile: boolean;
  stats: {
    posts: number;
    followers: number;
    following: number;
  };
}

export default function ProfileHeader({ profile, isOwnProfile, stats }: ProfileHeaderProps) {
  return (
    <div className={styles.profileHeader}>
      <div className={styles.avatarSection}>
        <div className={styles.avatarWrapper}>
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.username}
              width={150}
              height={150}
              className={styles.avatar}
              unoptimized
            />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.displayName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>

      <div className={styles.profileInfo}>
        <div className={styles.profileActions}>
          <h1 className={styles.username}>{profile.username}</h1>
          {isOwnProfile ? (
            <Link href="/app/settings/account">
              <button className={styles.editButton}>Edit profile</button>
            </Link>
          ) : (
            <>
              <button className={styles.followButton}>Follow</button>
              <button className={styles.messageButton}>Message</button>
            </>
          )}
        </div>

        <div className={styles.profileStats}>
          <div className={styles.statItem}>
            <span className={styles.statCount}>{stats.posts}</span>
            <span className={styles.statLabel}>posts</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statCount}>{stats.followers}</span>
            <span className={styles.statLabel}>followers</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statCount}>{stats.following}</span>
            <span className={styles.statLabel}>following</span>
          </div>
        </div>

        <div className={styles.profileBio}>
          <div className={styles.displayName}>{profile.displayName}</div>
          {profile.category && (
            <div className={styles.bioCategory}>{profile.category}</div>
          )}
          {profile.bio && (
            <div className={styles.bioText}>{profile.bio}</div>
          )}
          {profile.website && (
            <a href={`https://${profile.website}`} className={styles.bioLink} target="_blank" rel="noopener noreferrer">
              {profile.website}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
