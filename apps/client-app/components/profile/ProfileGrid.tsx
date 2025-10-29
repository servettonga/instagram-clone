// Profile posts grid component with tabs

import Image from 'next/image';
import { GridIcon, ReelsIcon, BookmarkSimpleIcon, UserTagIcon, HeartIcon, CommentIcon, MultiImageIcon } from '@/components/ui/icons';
import styles from './ProfileGrid.module.scss';

interface Post {
  id: string;
  imageUrl: string | null;
  likes: number;
  comments: number;
  hasMultipleImages?: boolean;
}

interface ProfileGridProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
}

export default function ProfileGrid({ posts, onPostClick }: ProfileGridProps) {
  // Split posts into rows of 4
  const postsInRows: Post[][] = [];
  for (let i = 0; i < posts.length; i += 4) {
    postsInRows.push(posts.slice(i, i + 4));
  }

  return (
    <div className={styles.postsSection}>
      <div className={styles.postsTabs}>
        <button className={`${styles.tab} ${styles.tabActive}`}>
          <GridIcon />
        </button>
        <button className={styles.tab}>
          <ReelsIcon />
        </button>
        <button className={styles.tab}>
          <BookmarkSimpleIcon />
        </button>
        <button className={styles.tab}>
          <UserTagIcon />
        </button>
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
                      src={post.imageUrl}
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
                          <HeartIcon width={20} height={20} fill="white" filled/>
                          {post.likes.toLocaleString()}
                        </span>
                        <span>
                          <CommentIcon width={20} height={20} fill="white" filled />
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
