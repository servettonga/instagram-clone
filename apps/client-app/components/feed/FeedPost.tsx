// Individual post component for the feed

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
import { getImageSize } from '@/lib/utils/image';
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
import Avatar from '@/components/ui/Avatar';
import ConfirmModal from '@/components/modal/ConfirmModal';
import styles from './FeedPost.module.scss';

interface FeedPostProps {
  post: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
    timeAgo: string;
    imageUrl: string;
    assets?: Array<{ url: string }>;
    likes: number;
    caption?: string;
    commentsCount: number;
    aspectRatio?: string;
    profileId?: string;
    isLikedByUser?: boolean;
  };
  onCommentClick: () => void;
  onPostDeleted?: () => void;
  onEditClick?: () => void;
  onPostUpdated?: () => void;
}

export default function FeedPost({ post, onCommentClick, onPostDeleted, onEditClick, onPostUpdated }: FeedPostProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Like state
  const [isLiked, setIsLiked] = useState(post.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isLiking, setIsLiking] = useState(false);

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

  const handleToggleLike = async () => {
    if (isLiking) return;

    setIsLiking(true);
    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      const result = await postsAPI.toggleLike(post.id);
      setIsLiked(result.liked);
      setLikesCount(result.likesCount);
      onPostUpdated?.(); // Notify parent to refresh if needed
    } catch (error) {
      console.error('Failed to toggle like:', error);
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <article className={styles.post}>
      {/* Post Header */}
      <div className={styles.postHeader}>
        <div className={styles.postUser}>
          <div className={styles.avatarWrapper}>
            {/* Avatar */}
            <Avatar avatarUrl={post.avatarUrl} username={post.displayName || post.username} size="md" unoptimized />
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
                  <button className={styles.menuItem} style={{ color: 'var(--color-error)' }} onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} disabled={isDeleting}>
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
      {/* Delete confirmation using centralized ConfirmModal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Post?"
        message={deleteError ? `${deleteError}` : 'This post will be deleted permanently.'}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
        danger={true}
      />

      {/* Post Image */}
      <div
        className={styles.postImageWrapper}
        style={{ aspectRatio: post.aspectRatio || '4/5' }}
      >
        {images[currentImageIndex]?.url ? (
          <Image
            src={getImageSize(images[currentImageIndex].url, 'medium')}
            alt={`Post by ${post.username}`}
            fill
            sizes="(max-width: 768px) 100vw, 468px"
            className={styles.postImage}
            unoptimized
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <span>Image not available</span>
          </div>
        )}

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
          <button
            className={styles.actionButton}
            onClick={handleToggleLike}
            disabled={isLiking}
          >
            <HeartIcon filled={isLiked} fill={isLiked ? "var(--color-error)" : "currentColor"} />
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
          {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
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
