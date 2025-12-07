// Profile posts grid component with tabs

import Image from 'next/image';
import { GridIcon, ReelsIcon, BookmarkSimpleIcon, UserTagIcon, HeartIcon, CommentIcon, MultiImageIcon, ArchiveIcon } from '@/components/ui/icons';
import { getImageSize } from '@/lib/utils/image';
import styles from './ProfileGrid.module.scss';

interface Post {
  id: string;
  imageUrl: string | null;
  likes: number;
  comments: number;
  hasMultipleImages?: boolean;
  isLiked?: boolean;
}

type TabType = 'posts' | 'reels' | 'saved' | 'tagged' | 'archive';

interface ProfileGridProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  isOwnProfile?: boolean;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

export default function ProfileGrid({ posts, onPostClick, isOwnProfile = false, activeTab = 'posts', onTabChange }: ProfileGridProps) {
  // Split posts into rows of 4
  const postsInRows: Post[][] = [];
  for (let i = 0; i < posts.length; i += 4) {
    postsInRows.push(posts.slice(i, i + 4));
  }

  const handleTabClick = (tab: TabType) => {
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className={styles.postsSection}>
      <div className={styles.postsTabs}>
        <button
          className={`${styles.tab} ${activeTab === 'posts' ? styles.tabActive : ''}`}
          onClick={() => handleTabClick('posts')}
        >
          <GridIcon />
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'reels' ? styles.tabActive : ''}`}
          onClick={() => handleTabClick('reels')}
        >
          <ReelsIcon />
        </button>
        {isOwnProfile && (
          <button
            className={`${styles.tab} ${activeTab === 'saved' ? styles.tabActive : ''}`}
            onClick={() => handleTabClick('saved')}
          >
            <BookmarkSimpleIcon />
          </button>
        )}
        <button
          className={`${styles.tab} ${activeTab === 'tagged' ? styles.tabActive : ''}`}
          onClick={() => handleTabClick('tagged')}
        >
          <UserTagIcon />
        </button>
        {isOwnProfile && (
          <button
            className={`${styles.tab} ${activeTab === 'archive' ? styles.tabActive : ''}`}
            onClick={() => handleTabClick('archive')}
          >
            <ArchiveIcon />
          </button>
        )}
      </div>

      <div className={styles.postsGrid}>
        {postsInRows.map((row, rowIndex) => (
          <div key={rowIndex} className={styles.postsRow}>
            {row.map((post) => (
              <div
                key={post.id}
                className={styles.gridItem}
                onClick={() => post.imageUrl && onPostClick(post)}
              >
                {post.imageUrl && (
                  <>
                    <Image
                      src={getImageSize(post.imageUrl, 'medium')}
                      alt="Post"
                      fill
                      sizes="309px"
                      className={styles.gridImage}
                      unoptimized
                    />
                    {post.hasMultipleImages && (
                      <div className={styles.multiImageIndicator}>
                        <MultiImageIcon width={16} height={16} />
                      </div>
                    )}
                    <div className={styles.overlay}>
                      <div className={styles.stats}>
                        <span>
                          <HeartIcon
                              width={20}
                              height={20}
                              fill={post.isLiked ? "var(--color-error)" : "var(--color-white)"}
                              filled
                            />
                          {post.likes.toLocaleString()}
                        </span>
                        <span>
                          <CommentIcon width={20} height={20} fill="var(--color-white)" filled />
                          {post.comments.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
