'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
import { getFollowersCountForUsername } from '@/lib/utils/profileCache';
import { commentsAPI } from '@/lib/api/comments';
import { normalizeImageUrl } from '@/lib/utils/image';
import {
  CloseIcon,
  HeartIcon,
  ShareIcon,
  BookmarkIcon,
  MoreIcon,
  EmojiIcon,
  NavPrevIcon,
  NavNextIcon,
} from '@/components/ui/icons';
import ConfirmModal from '@/components/modal/ConfirmModal';
import CommentsList from '@/components/feed/CommentsList';
import MentionPicker from '@/components/ui/MentionPicker';
import UserHoverCard from '@/components/ui/UserHoverCard';
import { MentionText } from '@/lib/utils/mentions';
import styles from './PostViewModal.module.scss';

interface PostViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    imageUrl?: string;
    username: string;
      avatarUrl?: string;
    caption?: string;
    likes: number;
    timeAgo: string;
    collaborators?: string[];
    assets?: Array<{ url: string }>;
    createdAt?: string;
    profileId?: string;
    aspectRatio?: string;
    isLikedByUser?: boolean;
    isSavedByUser?: boolean;
    isArchived?: boolean;
  };
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
  onPostArchived?: (archived: boolean) => void;
  onPostSaved?: (saved: boolean) => void;
  initialEditMode?: boolean;
  onNextPost?: () => void;
  onPrevPost?: () => void;
}

export default function PostViewModal({
  isOpen,
  onClose,
  post,
  onPostDeleted,
  onPostUpdated,
  onPostArchived,
  onPostSaved,
  initialEditMode = false,
  onNextPost,
  onPrevPost
}: PostViewModalProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpandedCaption, setIsExpandedCaption] = useState(false);
  const [isEditMode, setIsEditMode] = useState(initialEditMode);
  const [editedCaption, setEditedCaption] = useState(post.caption || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsKey, setCommentsKey] = useState(0);

  // Mention picker state for main comment input
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPickerPosition, setMentionPickerPosition] = useState({ top: 0, left: 0 });
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Post like state
  const [isLiked, setIsLiked] = useState(post.isLikedByUser || false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [isLiking, setIsLiking] = useState(false);
  const initialLikeStateRef = useRef(post.isLikedByUser || false);
  const likeStateChangedRef = useRef(false);
  const previousUrlRef = useRef<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  // Post save state
  const [isSaved, setIsSaved] = useState(post.isSavedByUser || false);
  const [isSavingPost, setIsSavingPost] = useState(false);



  // Reset states when post changes (when navigating between posts)
  useEffect(() => {
    setCurrentImageIndex(0);
    setEditedCaption(post.caption || '');
    setIsExpandedCaption(false);
    setIsEditMode(initialEditMode);
    setShowMenu(false);
    setShowDeleteConfirm(false);
    setDeleteError(null);
    setSaveError(null);
    setSaveSuccess(false);
    setIsLiked(post.isLikedByUser || false);
    setLikesCount(post.likes);
    setIsSaved(post.isSavedByUser || false);
    initialLikeStateRef.current = post.isLikedByUser || false;
    likeStateChangedRef.current = false;
    setFollowersCount(null);
  }, [post.id, post.caption, initialEditMode, post.isLikedByUser, post.likes, post.isSavedByUser]);



  // Load followers count for the post's author when modal opens or post changes (cached)
  useEffect(() => {
    let mounted = true;
    const loadFollowers = async () => {
      if (!isOpen || !post.username) return;
      try {
        const total = await getFollowersCountForUsername(post.username);
        if (mounted) setFollowersCount(total);
      } catch (error) {
        console.error('Failed to load followers count (cached):', error);
        if (mounted) setFollowersCount(null);
      }
    };

    loadFollowers();

    return () => { mounted = false; };
  }, [isOpen, post.username]);

  // Update URL when modal opens or post changes
  useEffect(() => {
    if (isOpen && post.id) {
      // Store the current URL on first open
      if (previousUrlRef.current === null) {
        previousUrlRef.current = window.location.pathname + window.location.search;
      }
      // Update URL to the post URL
      window.history.replaceState(null, '', `${basePath}/app/post/${post.id}`);
    }
  }, [isOpen, post.id, basePath]);

  // Get all images from post
  const images = post.assets || (post.imageUrl ? [{ url: post.imageUrl }] : []);
  const currentImage = images[currentImageIndex];

  // Check if current user is the post owner
  const isOwnPost = currentUser?.profile?.id === post.profileId;

  // Determine wrapper class based on aspect ratio
  const getWrapperClass = () => {
    const ratio = post.aspectRatio || '4/5';
    if (ratio === '1/1') {
      return `${styles.imageWrapper} ${styles.imageWrapperSquare}`;
    }
    if (ratio === '16/9') {
      return `${styles.imageWrapper} ${styles.imageWrapperWide}`;
    }
    if (ratio === '4/5') {
      return `${styles.imageWrapper} ${styles.imageWrapperTall}`;
    }
    return styles.imageWrapper;
  };

  // Determine container class based on aspect ratio
  const getContainerClass = () => {
    return styles.imageContainer;
  };

  // Determine section class based on aspect ratio
  const getSectionClass = () => {
    const ratio = post.aspectRatio || '4/5';
    if (ratio === '1/1') {
      return `${styles.imageSection} ${styles.imageSectionSquare}`;
    }
    if (ratio === '16/9') {
      return `${styles.imageSection} ${styles.imageSectionWide}`;
    }
    if (ratio === '4/5') {
      return `${styles.imageSection} ${styles.imageSectionTall}`;
    }
    return styles.imageSection;
  };

  // Check if caption is longer than 10 lines (use editedCaption to show updates)
  const captionLineCount = editedCaption ? editedCaption.split('\n').length : 0;
  const shouldTruncateCaption = captionLineCount > 10;
  const displayCaption = !shouldTruncateCaption || isExpandedCaption
    ? editedCaption
    : editedCaption?.split('\n').slice(0, 10).join('\n') + (captionLineCount > 10 ? '...' : '');

  const handleClose = useCallback(() => {
    // Restore previous URL if it was stored
    if (previousUrlRef.current !== null) {
      window.history.replaceState(null, '', previousUrlRef.current);
      previousUrlRef.current = null;
    }
    // If like state changed, notify parent to refresh
    if (likeStateChangedRef.current && onPostUpdated) {
      onPostUpdated();
    }
    onClose();
  }, [onClose, onPostUpdated]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      } else if (event.key === 'ArrowRight' && onNextPost) {
        onNextPost();
      } else if (event.key === 'ArrowLeft' && onPrevPost) {
        onPrevPost();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleClose, onNextPost, onPrevPost]);

  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchivePost = async () => {
    setIsArchiving(true);
    try {
      if (post.isArchived) {
        await postsAPI.unarchivePost(post.id);
        onPostArchived?.(false);
      } else {
        await postsAPI.archivePost(post.id);
        onPostArchived?.(true);
      }
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to archive/unarchive post:', error);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await postsAPI.deletePost(post.id);
      setShowDeleteConfirm(false);
      onPostDeleted?.();
      handleClose();
    } catch (error) {
      console.error('Failed to delete post:', error);
      setDeleteError('Failed to delete post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveCaption = async () => {
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await postsAPI.updatePost(post.id, { content: editedCaption });
      setSaveSuccess(true);
      setIsEditMode(false);
      // Call the callback to refresh the post data in parent pages (feed/profile)
      onPostUpdated?.();
      // Auto-clear success message after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Failed to update post:', error);
      setSaveError('Failed to update post. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedCaption(post.caption || '');
    setIsEditMode(false);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    setIsSubmittingComment(true);
    try {
      await commentsAPI.createComment(post.id, {
        content: commentText.trim(),
      });
      setCommentText('');
      setShowMentionPicker(false);
      setMentionQuery('');
      // Force CommentsList to refetch
      setCommentsKey(prev => prev + 1);
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleCommentTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    setCommentText(value);

    // Check if there's an '@' before cursor
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      // Check if there's whitespace between @ and cursor
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);

      if (!/\s/.test(textAfterAt)) {
        // No whitespace, show mention picker
        setMentionStartIndex(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionPicker(true);

        // Calculate position for mention picker
        if (commentInputRef.current) {
          const rect = commentInputRef.current.getBoundingClientRect();
          setMentionPickerPosition({
            top: rect.bottom + window.scrollY,
            left: rect.left + window.scrollX,
          });
        }
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleMentionSelect = (username: string) => {
    if (mentionStartIndex === -1) return;

    const beforeMention = commentText.substring(0, mentionStartIndex);
    const afterCursor = commentText.substring(commentInputRef.current?.selectionStart || commentText.length);
    const newText = `${beforeMention}@${username} ${afterCursor}`;

    setCommentText(newText);
    setShowMentionPicker(false);
    setMentionQuery('');
    setMentionStartIndex(-1);

    // Focus back on input
    setTimeout(() => {
      if (commentInputRef.current) {
        const newCursorPos = beforeMention.length + username.length + 2;
        commentInputRef.current.focus();
        commentInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleTogglePostLike = async () => {
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
      // Track that like state changed from initial
      likeStateChangedRef.current = result.liked !== initialLikeStateRef.current;
    } catch (error) {
      console.error('Failed to toggle post like:', error);
      // Revert optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      likeStateChangedRef.current = previousLiked !== initialLikeStateRef.current;
    } finally {
      setIsLiking(false);
    }
  };

  const handleTogglePostSave = async () => {
    if (isSavingPost) return;

    setIsSavingPost(true);
    // Optimistic update
    const previousSaved = isSaved;
    setIsSaved(!isSaved);

    try {
      const result = await postsAPI.toggleSave(post.id);
      setIsSaved(result.saved);
      onPostSaved?.(result.saved);
    } catch (error) {
      console.error('Failed to toggle post save:', error);
      // Revert optimistic update on error
      setIsSaved(previousSaved);
    } finally {
      setIsSavingPost(false);
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

  if (!isOpen) return null;

  return (
    <>
    <div className={styles.modalBackdrop} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Top navigation buttons */}
        {onPrevPost && (
          <button className={styles.prevPostButton} onClick={onPrevPost} aria-label="Previous post">
            <NavPrevIcon />
          </button>
        )}

        <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
          <CloseIcon width={18} height={18} />
        </button>

        {onNextPost && (
          <button className={styles.nextPostButton} onClick={onNextPost} aria-label="Next post">
            <NavNextIcon />
          </button>
        )}

        <div className={styles.postView}>
          {/* Image Section */}
          <div className={getSectionClass()}>
            {/* Outer container that takes full space */}
            <div className={getContainerClass()}>
              {/* Inner container with aspect ratio */}
              <div className={getWrapperClass()}>
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizeImageUrl(currentImage.url)}
                    alt="Post"
                    className={styles.postImage}
                  />
                ) : null}

                {/* Navigation Arrows - only show if multiple images */}
                {images.length > 1 && (
                  <>
                    {currentImageIndex > 0 && (
                      <button
                        className={styles.navPrev}
                        aria-label="Previous"
                        onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                      >
                        <NavPrevIcon width={24} height={24} />
                      </button>
                    )}
                    {currentImageIndex < images.length - 1 && (
                      <button
                        className={styles.navNext}
                        aria-label="Next"
                        onClick={() => setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                      >
                        <NavNextIcon width={24} height={24} />
                      </button>
                    )}

                    {/* Carousel Indicators - moved inside imageWrapper */}
                    <div className={styles.carouselIndicators}>
                      {images.map((_, index) => (
                        <div
                          key={index}
                          className={`${styles.indicator} ${index === currentImageIndex ? styles.indicatorActive : ''}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className={styles.infoSection}>
            {/* Header */}
            <div className={styles.postHeader}>
              <div className={styles.userInfo}>
                <Link href={`/app/profile/${post.username}`} className={styles.avatarStack} onClick={onClose}>
                  <Avatar avatarUrl={post.avatarUrl} username={post.username} size="md" unoptimized />
                  {/* TODO: Add collaborators support when API is ready */}
                </Link>
                <div className={styles.userDetails}>
                  <div className={styles.usernameRow}>
                    <UserHoverCard username={post.username} onNavigate={onClose}>
                      <Link href={`/app/profile/${post.username}`} className={styles.usernameLink} onClick={onClose}>
                        {post.username}
                      </Link>
                    </UserHoverCard>
                    {post.collaborators && post.collaborators[0] && (
                      <>
                        <span className={styles.and}> and </span>
                        <UserHoverCard username={post.collaborators[0]} onNavigate={onClose}>
                          <Link href={`/app/profile/${post.collaborators[0]}`} className={styles.usernameLink} onClick={onClose}>
                            {post.collaborators[0]}
                          </Link>
                        </UserHoverCard>
                      </>
                    )}
                  </div>
                  <div className={styles.followersCount}>{followersCount !== null ? followersCount.toLocaleString() + ' Followers' : ''}</div>
                </div>
              </div>
              <button className={styles.moreButton} onClick={() => setShowMenu(!showMenu)}>
                <div className={styles.svgWrapper}>
                  <div className={styles.svgWrapperInner}>
                    <MoreIcon width={25} height={25} />
                  </div>
                </div>
              </button>

              {/* More Menu */}
              {showMenu && (
                <div className={styles.moreMenu}>
                  <button className={styles.menuItem} onClick={() => { setShowMenu(false); router.push(`${basePath}/app/post/${post.id}`); }}>
                    Go to post
                  </button>
                  {isOwnPost ? (
                    <>
                      <button className={styles.menuItem} onClick={() => { setShowMenu(false); setIsEditMode(true); }}>
                        Edit
                      </button>
                      <button className={styles.menuItem} onClick={handleArchivePost} disabled={isArchiving}>
                        {isArchiving ? 'Processing...' : post.isArchived ? 'Unarchive' : 'Archive'}
                      </button>
                      <button className={styles.menuItem} style={{ color: 'var(--color-error)' }} onClick={() => { setShowMenu(false); setShowDeleteConfirm(true); }} disabled={isDeleting}>
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button className={styles.menuItem} onClick={() => { setShowMenu(false); handleTogglePostSave(); }} disabled={isSavingPost}>
                        {isSavingPost ? 'Saving...' : isSaved ? 'Unsave' : 'Save'}
                      </button>
                      <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                        Flag
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className={styles.commentsSection}>
              {/* Edit Mode with Error/Success Messages */}
              {isEditMode && isOwnPost ? (
                <div className={styles.editCaptionContainer}>
                  <textarea
                    className={styles.editCaptionInput}
                    value={editedCaption}
                    onChange={(e) => setEditedCaption(e.target.value)}
                    placeholder="Edit caption..."
                  />
                  {saveError && <div className={styles.errorMessage}>{saveError}</div>}
                  {saveSuccess && <div className={styles.successMessage}>Post updated successfully!</div>}
                  <div className={styles.editButtonsContainer}>
                    <button
                      className={styles.saveButton}
                      onClick={handleSaveCaption}
                      disabled={isSaving}
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Delete confirmation using site-wide ConfirmModal */}
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

                  {/* Original Post Caption */}
                  <div className={styles.comment}>
                    <Link href={`/app/profile/${post.username}`} onClick={onClose}>
                      <Avatar avatarUrl={post.avatarUrl} username={post.username} size="md" unoptimized />
                    </Link>
                    <div className={styles.commentContent}>
                      <div className={styles.commentText}>
                        <UserHoverCard username={post.username} onNavigate={onClose}>
                          <Link href={`/app/profile/${post.username}`} className={styles.commentUsernameLink} onClick={onClose}>
                            {post.username}
                          </Link>
                        </UserHoverCard>
                        {' '}
                        <MentionText text={displayCaption || ''} />
                        {shouldTruncateCaption && (
                          <button
                            className={styles.seeMoreButton}
                            onClick={() => setIsExpandedCaption(!isExpandedCaption)}
                          >
                            {isExpandedCaption ? ' See less' : ' See more'}
                          </button>
                        )}
                      </div>
                      <div className={styles.commentMeta}>
                        <span className={styles.timeAgo}>{post.timeAgo}</span>
                        {post.caption && <button className={styles.translateButton}>See translation</button>}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Comments */}
              <CommentsList
                key={commentsKey}
                postId={post.id}
                currentUserId={currentUser?.profile?.id}
                isOpen={isOpen}
                formatTimeAgo={formatTimeAgo}
                onCloseModal={onClose}
              />
            </div>

            {/* Actions */}
            <div className={styles.postActions}>
              <div className={styles.actionsRow}>
                <button
                  className={styles.actionButton}
                  onClick={handleTogglePostLike}
                  disabled={isLiking}
                >
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <HeartIcon width={25} height={25} filled={isLiked} fill={isLiked ? "var(--color-error)" : "currentColor"} />
                    </div>
                  </div>
                </button>
                <button className={styles.actionButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <ShareIcon width={25} height={25} />
                    </div>
                  </div>
                </button>
                <button
                  className={styles.actionButton}
                  onClick={handleTogglePostSave}
                  disabled={isSavingPost}
                >
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <BookmarkIcon width={25} height={25} filled={isSaved} />
                    </div>
                  </div>
                </button>
              </div>

              <div className={styles.likesSection}>
                {likesCount > 0 && (
                  <div className={styles.likesText}>
                    <span className={styles.bold}>{likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}</span>
                  </div>
                )}
              </div>

              <div className={styles.postTime}>{post.timeAgo}</div>
            </div>

            <div className={styles.addCommentSection}>
              <button className={styles.emojiButton}>
                <div className={styles.svgWrapper}>
                  <div className={styles.svgWrapperInner}>
                    <EmojiIcon />
                  </div>
                </div>
              </button>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={commentInputRef}
                  type="text"
                  placeholder="Add a comment…"
                  className={styles.commentInput}
                  value={commentText}
                  onChange={handleCommentTextChange}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !showMentionPicker) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  disabled={isSubmittingComment}
                />
                {showMentionPicker && (
                  <MentionPicker
                    searchQuery={mentionQuery}
                    position={mentionPickerPosition}
                    onSelect={handleMentionSelect}
                    onClose={() => setShowMentionPicker(false)}
                  />
                )}
              </div>
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
      </div>
    </div>

    </>
  );
}
