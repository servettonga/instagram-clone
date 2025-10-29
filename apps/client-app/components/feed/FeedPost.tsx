// Individual post component for the feed

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
import {
  VerifiedBadge,
  MoreIcon,
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  NavPrevIcon,
  NavNextIcon,
} from '@/components/ui/icons';
import styles from './FeedPost.module.scss';

interface FeedPostProps {
  post: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    isVerified: boolean;
    timeAgo: string;
    imageUrl: string;
    assets?: Array<{ url: string }>;
    likes: number;
    caption?: string;
    commentsCount: number;
    aspectRatio?: string;
    profileId?: string;
  };
  onCommentClick: () => void;
  onPostDeleted?: () => void;
  onEditClick?: () => void;
}

export default function FeedPost({ post, onCommentClick, onPostDeleted, onEditClick }: FeedPostProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get assets array (use imageUrl as fallback for single image)
  const images = post.assets && post.assets.length > 0 ? post.assets : [{ url: post.imageUrl }];
  const hasMultipleImages = images.length > 1;

  // Check if current user is the post owner
  const isOwnPost = currentUser?.profile?.id === post.profileId;

  // Check if caption is longer than 160 characters
  const CAPTION_CHAR_LIMIT = 160;
  const shouldTruncate = post.caption && post.caption.length > CAPTION_CHAR_LIMIT;

  // Get display text - truncate at character limit
  const displayCaption = !shouldTruncate || isExpanded
    ? post.caption
    : post.caption?.substring(0, CAPTION_CHAR_LIMIT) + '...';

  const handleDeletePost = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await postsAPI.deletePost(post.id);
      setShowDeleteConfirm(false);
      onPostDeleted?.();
    } catch (error) {
      console.error('Failed to delete post:', error);
      setDeleteError('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <article className={styles.post}>
      {/* Post Header */}
      <div className={styles.postHeader}>
        <div className={styles.postUser}>
          <div className={styles.avatarWrapper}>
            <Image
              src={post.avatarUrl}
              alt={post.username}
              width={32}
              height={32}
              className={styles.avatar}
              unoptimized
            />
          </div>
          <div className={styles.userInfo}>
            <div className={styles.usernameRow}>
              <Link href={`/app/profile/${post.username}`} className={styles.username}>
                {post.username}
              </Link>
              {post.isVerified && <VerifiedBadge className={styles.verifiedBadge} />}
            </div>
            <span className={styles.timeAgo}>{post.timeAgo}</span>
          </div>
        </div>
        <button className={styles.moreButton} onClick={() => setShowMenu(!showMenu)}>
          <MoreIcon />
        </button>

        {/* More Menu */}
        {showMenu && (
          <div className={styles.moreMenu}>
            <>
              <button className={styles.menuItem} onClick={() => { setShowMenu(false); router.push(`/app/post/${post.id}`); }}>
                Go to post
              </button>
              {isOwnPost ? (
                <>
                  <button className={styles.menuItem} onClick={() => { setShowMenu(false); onEditClick?.(); }}>
                    Edit
                  </button>
                  <button className={styles.menuItem} onClick={() => { setShowMenu(false); /* TODO: Archive functionality */ }}>
                    Archive
                  </button>
                  <button className={styles.menuItem} style={{ color: '#ED4956' }} onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} disabled={isDeleting}>
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                    Save
                  </button>
                  <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                    Flag
                  </button>
                </>
              )}
            </>
          </div>
        )}
      </div>

            {/* Delete Confirmation Dialog - Outside postHeader to avoid clipping */}
      {showDeleteConfirm && (
        <div className={styles.confirmationDialog}>
          <div className={styles.confirmationContent}>
            <h3 className={styles.confirmationTitle}>Delete Post?</h3>
            <p className={styles.confirmationText}>This post will be deleted permanently.</p>
            {deleteError && <div className={styles.errorMessage}>{deleteError}</div>}
            <div className={styles.confirmationButtons}>
              <button
                className={styles.confirmCancelButton}
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDeletePost}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Image */}
      <div
        className={styles.postImageWrapper}
        style={{ aspectRatio: post.aspectRatio || '4/5' }}
      >
        <Image
          src={images[currentImageIndex]?.url || post.imageUrl}
          alt={`Post by ${post.username}`}
          fill
          sizes="(max-width: 768px) 100vw, 468px"
          className={styles.postImage}
          unoptimized
        />

        {/* Navigation buttons for multiple images */}
        {hasMultipleImages && (
          <>
            {currentImageIndex > 0 && (
              <button
                className={`${styles.navButton} ${styles.navButtonPrev}`}
                onClick={() => setCurrentImageIndex(prev => prev - 1)}
                aria-label="Previous image"
              >
                <NavPrevIcon width={16} height={16} />
              </button>
            )}
            {currentImageIndex < images.length - 1 && (
              <button
                className={`${styles.navButton} ${styles.navButtonNext}`}
                onClick={() => setCurrentImageIndex(prev => prev + 1)}
                aria-label="Next image"
              >
                <NavNextIcon width={16} height={16} />
              </button>
            )}
          </>
        )}

        {/* Image indicators */}
        {hasMultipleImages && (
          <div className={styles.imageIndicators}>
            {images.map((_, index) => (
              <div
                key={index}
                className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Post Actions */}
      <div className={styles.postActions}>
        <div className={styles.actionsLeft}>
          <button className={styles.actionButton}>
            <HeartIcon />
          </button>
          <button className={styles.actionButton} onClick={onCommentClick}>
            <CommentIcon />
          </button>
          <button className={styles.actionButton}>
            <ShareIcon />
          </button>
        </div>
        <button className={styles.actionButton}>
          <BookmarkIcon />
        </button>
      </div>

      {/* Post Info */}
      <div className={styles.postInfo}>
        <div className={styles.likes}>
          {post.likes.toLocaleString()} likes
        </div>
        {post.caption && (
          <div className={styles.caption}>
            <Link href={`/app/profile/${post.username}`} className={styles.captionUsername}>
              {post.username}
            </Link>
            <span className={styles.captionText}>
              {' '}
              {displayCaption}
            </span>
            {shouldTruncate && (
              <button
                className={styles.seeMoreButton}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? ' See less' : ' See more'}
              </button>
            )}
          </div>
        )}
        {post.commentsCount > 0 && (
          <button className={styles.viewComments} onClick={onCommentClick}>
            View all {post.commentsCount.toLocaleString()} comments
          </button>
        )}
      </div>
    </article>
  );
}
