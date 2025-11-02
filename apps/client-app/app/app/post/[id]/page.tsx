'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { postsAPI } from '@/lib/api/posts';
import { commentsAPI } from '@/lib/api/comments';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/routes';
import {
  MoreIcon,
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
  EmojiIcon,
  NavPrevIcon,
  NavNextIcon,
} from '@/components/ui/icons';
import ConfirmModal from '@/components/modal/ConfirmModal';
import CommentsList from '@/components/feed/CommentsList';
import type { Post } from '@repo/shared-types';
import styles from './page.module.scss';

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Comments state (minimal - CommentsList handles the rest)
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsKey, setCommentsKey] = useState(0);

  // Post like state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedPost = await postsAPI.getPost(postId);
        setPost(fetchedPost);
        setIsLiked(fetchedPost.isLikedByCurrentUser);
        setLikesCount(fetchedPost.likesCount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !postId) return;

    setIsSubmittingComment(true);
    try {
      await commentsAPI.createComment(postId, {
        content: commentText.trim(),
      });
      setCommentText('');
      // Force CommentsList to refetch
      setCommentsKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleTogglePostLike = async () => {
    if (isLiking || !postId) return;

    setIsLiking(true);
    // Optimistic update
    const previousLiked = isLiked;
    const previousCount = likesCount;
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      const result = await postsAPI.toggleLike(postId);
      setIsLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (error) {
      console.error('Failed to toggle post like:', error);
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleEditClick = () => {
    setEditedCaption(post?.content || '');
    setIsEditMode(true);
    setShowMenu(false);
  };

  const handleCancelEdit = () => {
    setEditedCaption('');
    setIsEditMode(false);
  };

  const handleSaveCaption = async () => {
    if (!post) return;

    setIsSaving(true);
    try {
      await postsAPI.updatePost(post.id, { content: editedCaption });
      setPost({ ...post, content: editedCaption });
      setIsEditMode(false);
    } catch (error) {
      console.error('Failed to update post:', error);
      alert('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
    setShowMenu(false);
  };

  const handleDeletePost = async () => {
    if (!post) return;

    setIsDeleting(true);
    try {
      await postsAPI.deletePost(post.id);
      // Redirect to profile after deletion
      const profileRoute = currentUser?.profile?.username
        ? ROUTES.APP.PROFILE.USER(currentUser.profile.username)
        : ROUTES.APP.PROFILE.ME;
      router.push(profileRoute);
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('Failed to delete post. Please try again.');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const createdAt = new Date(date);
    const seconds = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    const weeks = Math.floor(days / 7);
    return `${weeks}w`;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading post...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className={styles.errorContainer}>
        <h2>Post not found</h2>
        <p>{error || 'The post you are looking for does not exist.'}</p>
        <Link href={ROUTES.APP.FEED} className={styles.backLink}>
          ← Back to Feed
        </Link>
      </div>
    );
  }

  const images = post.assets || [];
  const currentImage = images[currentImageIndex];
  const isOwnPost = currentUser?.profile?.id === post.profileId;

  // Determine wrapper class based on aspect ratio
  const getWrapperClass = () => {
    const ratio = (post.aspectRatio || '4/5').replace(':', '/');
    if (ratio === '1/1') {
      return `${styles.imageWrapper} ${styles.imageWrapperSquare}`;
    } else if (ratio === '16/9') {
      return `${styles.imageWrapper} ${styles.imageWrapperWide}`;
    } else if (ratio === '4/5') {
      return `${styles.imageWrapper} ${styles.imageWrapperTall}`;
    }
    return styles.imageWrapper;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.postView}>
        {/* Image Section */}
        <div className={getWrapperClass()}>
          {currentImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentImage.url}
              alt="Post"
              className={styles.postImage}
            />
          ) : null}

          {/* Carousel Indicators - only show if multiple images */}
          {images.length > 1 && (
              <div className={styles.carouselIndicators}>
                {images.map((_, index) => (
                  <div
                    key={index}
                    className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                  />
                ))}
              </div>
            )}

            {/* Navigation Arrows - only show if multiple images */}
            {images.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    className={styles.navPrev}
                    aria-label="Previous"
                    onClick={() => setCurrentImageIndex(prev => prev - 1)}
                  >
                    <NavPrevIcon />
                  </button>
                )}
                {currentImageIndex < images.length - 1 && (
                  <button
                    className={styles.navNext}
                    aria-label="Next"
                    onClick={() => setCurrentImageIndex(prev => prev + 1)}
                  >
                    <NavNextIcon />
                  </button>
                )}
              </>
            )}
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          {/* Header */}
          <div className={styles.postHeader}>
            <div className={styles.userInfo}>
              <Link href={ROUTES.APP.PROFILE.USER(post.profile.username)} className={styles.avatarStack}>
                <Avatar avatarUrl={post.profile.avatarUrl} username={post.profile.username} size="md" unoptimized />
              </Link>
              <div className={styles.userDetails}>
                <div className={styles.usernameRow}>
                  <Link href={ROUTES.APP.PROFILE.USER(post.profile.username)} className={styles.usernameLink}>
                    {post.profile.username}
                  </Link>
                </div>
              </div>
            </div>

            <button className={styles.moreButton} onClick={() => setShowMenu(!showMenu)}>
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <MoreIcon />
                </div>
              </div>
            </button>

            {/* More Menu */}
            {showMenu && (
              <div className={styles.moreMenu}>
                {isOwnPost ? (
                  <>
                    <button className={styles.menuItem} onClick={handleEditClick}>
                      Edit
                    </button>
                    <button className={styles.menuItem} onClick={handleDeleteClick} style={{ color: 'var(--color-error)' }}>
                      Delete
                    </button>
                  </>
                ) : (
                  <>
                    <button className={styles.menuItem} style={{ color: 'var(--color-error)' }}>
                      Report
                    </button>
                    <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                      Unfollow
                    </button>
                  </>
                )}
                <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className={styles.commentsSection}>
            {/* Caption as first comment */}
            {post.content && (
              <div className={styles.comment}>
                <Link href={ROUTES.APP.PROFILE.USER(post.profile.username)}>
                  <Avatar avatarUrl={post.profile.avatarUrl} username={post.profile.username} size="md" unoptimized />
                </Link>
                <div className={styles.commentContent}>
                  {isEditMode ? (
                    <div className={styles.editCaptionContainer}>
                      <textarea
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        className={styles.editCaptionInput}
                        rows={4}
                      />
                      <div className={styles.editActions}>
                        <button
                          onClick={handleCancelEdit}
                          className={styles.cancelButton}
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveCaption}
                          className={styles.saveButton}
                          disabled={isSaving}
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className={styles.commentText}>
                      <Link href={ROUTES.APP.PROFILE.USER(post.profile.username)} className={styles.commentUsernameLink}>
                        {post.profile.username}
                      </Link>{' '}
                      {post.content}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Comments */}
            <CommentsList
              key={commentsKey}
              postId={postId}
              currentUserId={currentUser?.profile?.id}
              isOpen={true}
              formatTimeAgo={formatTimeAgo}
            />
          </div>

          {/* Post Actions */}
          <div className={styles.postActions}>
            <div className={styles.actionsRow}>
              <button
                className={styles.actionButton}
                aria-label="Like"
                onClick={handleTogglePostLike}
                disabled={isLiking}
              >
                <HeartIcon width={24} height={24} filled={isLiked} fill={isLiked ? 'var(--color-error)' : 'currentColor'} />
              </button>
              <button className={styles.actionButton} aria-label="Share">
                <ShareIcon width={24} height={24} />
              </button>
              <button className={styles.actionButton} aria-label="Save" style={{ marginLeft: 'auto' }}>
                <BookmarkIcon width={24} height={24} />
              </button>
            </div>

            {/* Likes Section */}
            {likesCount > 0 && (
              <div className={styles.likesSection}>
                <span className={styles.likesText}>
                  <span className={styles.bold}>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</span>
                </span>
              </div>
            )}

            {/* Post Time */}
            <div className={styles.postTime}>
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Add Comment */}
          <div className={styles.addCommentSection}>
            <button className={styles.emojiButton} aria-label="Emoji">
              <EmojiIcon width={24} height={24} />
            </button>
            <input
              type="text"
              placeholder="Add a comment..."
              className={styles.commentInput}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitComment();
                }
              }}
              disabled={isSubmittingComment}
            />
            <button
              className={styles.postButton}
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? 'Posting...' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Post?"
        message={'Are you sure you want to delete this post? This action cannot be undone.'}
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        danger={true}
        onConfirm={handleDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
