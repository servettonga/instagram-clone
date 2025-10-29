'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
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
import styles from './PostViewModal.module.scss';

interface Comment {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  timeAgo: string;
  likes: number;
}

interface PostViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    imageUrl?: string;
    username: string;
    avatarUrl: string;
    caption?: string;
    likes: number;
    timeAgo: string;
    comments: Comment[];
    collaborators?: string[];
    assets?: Array<{ url: string }>;
    createdAt?: string;
    profileId?: string;
    aspectRatio?: string;
  };
  onPostDeleted?: () => void;
  onPostUpdated?: () => void;
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
  initialEditMode = false,
  onNextPost,
  onPrevPost
}: PostViewModalProps) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
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
  }, [post.id, post.caption, initialEditMode]);

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
    } else if (ratio === '16/9') {
      return `${styles.imageWrapper} ${styles.imageWrapperWide}`;
    } else if (ratio === '4/5') {
      return `${styles.imageWrapper} ${styles.imageWrapperTall}`;
    }
    return styles.imageWrapper;
  };

  // Determine container class based on aspect ratio
  const getContainerClass = () => {
    const ratio = post.aspectRatio || '4/5';
    if (ratio === '4/5') {
      return `${styles.imageContainer} ${styles.imageContainerRightAlign}`;
    }
    return styles.imageContainer;
  };

  // Determine section class based on aspect ratio
  const getSectionClass = () => {
    const ratio = post.aspectRatio || '4/5';
    if (ratio === '4/5') {
      return `${styles.imageSection} ${styles.imageSectionNoBackground}`;
    }
    return styles.imageSection;
  };

  // Check if caption is longer than 10 lines (use editedCaption to show updates)
  const captionLineCount = editedCaption ? editedCaption.split('\n').length : 0;
  const shouldTruncateCaption = captionLineCount > 10;
  const displayCaption = !shouldTruncateCaption || isExpandedCaption
    ? editedCaption
    : editedCaption?.split('\n').slice(0, 10).join('\n') + (captionLineCount > 10 ? '...' : '');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose, onNextPost, onPrevPost]);

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await postsAPI.deletePost(post.id);
      setShowDeleteConfirm(false);
      onPostDeleted?.();
      onClose();
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

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Top navigation buttons */}
        {onPrevPost && (
          <button className={styles.prevPostButton} onClick={onPrevPost} aria-label="Previous post">
            <NavPrevIcon />
          </button>
        )}

        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <CloseIcon width={18} height={18} stroke="white" />
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
                    src={currentImage.url}
                    alt="Post"
                    className={styles.postImage}
                  />
                ) : null}

                {/* Navigation Arrows - only show if multiple images */}
                {images.length > 1 && (
                  <>
                    <button
                      className={styles.navPrev}
                      aria-label="Previous"
                      onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                    >
                      <NavPrevIcon width={24} height={24} />
                    </button>
                    <button
                      className={styles.navNext}
                      aria-label="Next"
                      onClick={() => setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                    >
                      <NavNextIcon width={24} height={24} />
                    </button>
                  </>
                )}
              </div>
            </div>

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
          </div>

          {/* Info Section */}
          <div className={styles.infoSection}>
            {/* Header */}
            <div className={styles.postHeader}>
              <div className={styles.userInfo}>
                <Link href={`/app/profile/${post.username}`} className={styles.avatarStack} onClick={onClose}>
                  <Image
                    src={post.avatarUrl}
                    alt={post.username}
                    width={24}
                    height={24}
                    className={styles.avatar}
                    unoptimized
                  />
                  {post.collaborators && post.collaborators.length > 0 && (
                    <div className={styles.collaboratorAvatar}>
                      <Image
                        src="https://i.pravatar.cc/150?img=50"
                        alt="Collaborator"
                        width={24}
                        height={24}
                        className={styles.avatar}
                        unoptimized
                      />
                    </div>
                  )}
                </Link>
                <div className={styles.userDetails}>
                  <div className={styles.usernameRow}>
                    <Link href={`/app/profile/${post.username}`} className={styles.usernameLink} onClick={onClose}>
                      {post.username}
                    </Link>
                    {post.collaborators && (
                      <>
                        <span className={styles.and}> and </span>
                        <Link href={`/app/profile/${post.collaborators[0]}`} className={styles.usernameLink} onClick={onClose}>
                          {post.collaborators[0]}
                        </Link>
                      </>
                    )}
                  </div>
                  <div className={styles.followersCount}>2073</div>
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
                  <button className={styles.menuItem} onClick={() => { setShowMenu(false); router.push(`/app/post/${post.id}`); }}>
                    Go to post
                  </button>
                  {isOwnPost ? (
                    <>
                      <button className={styles.menuItem} onClick={() => { setShowMenu(false); setIsEditMode(true); }}>
                        Edit
                      </button>
                      <button className={styles.menuItem} onClick={() => { setShowMenu(false); /* TODO: implement archive */ }}>
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
                  {/* Delete Confirmation Dialog */}
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

                  {/* Original Post Caption */}
                  <div className={styles.comment}>
                    <Link href={`/app/profile/${post.username}`} onClick={onClose}>
                      <Image
                        src={post.avatarUrl}
                        alt={post.username}
                        width={32}
                        height={32}
                        className={styles.commentAvatar}
                        unoptimized
                      />
                    </Link>
                    <div className={styles.commentContent}>
                      <div className={styles.commentText}>
                        <Link href={`/app/profile/${post.username}`} className={styles.commentUsernameLink} onClick={onClose}>
                          {post.username}
                        </Link>
                        {' '}
                        {displayCaption}
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
              {post.comments.map((comment) => (
                <div key={comment.id} className={styles.comment}>
                  <Link href={`/app/profile/${comment.username}`} onClick={onClose}>
                    <Image
                      src={comment.avatarUrl}
                      alt={comment.username}
                      width={32}
                      height={32}
                      className={styles.commentAvatar}
                      unoptimized
                    />
                  </Link>
                  <div className={styles.commentContent}>
                    <div className={styles.commentText}>
                      <Link href={`/app/profile/${comment.username}`} className={styles.commentUsernameLink} onClick={onClose}>
                        {comment.username}
                      </Link>
                      {' '}
                      {comment.text}
                    </div>
                    <div className={styles.commentMeta}>
                      <span className={styles.timeAgo}>{comment.timeAgo}</span>
                      <span className={styles.likes}>{comment.likes} like{comment.likes !== 1 ? 's' : ''}</span>
                      <button className={styles.replyButton}>Reply</button>
                    </div>
                  </div>
                  <button className={styles.likeButton}>
                    <div className={styles.svgWrapper}>
                      <div className={styles.svgWrapperInner}>
                        <HeartIcon width={13} height={13} />
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className={styles.postActions}>
              <div className={styles.actionsRow}>
                <button className={styles.actionButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <HeartIcon width={25} height={25} />
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
                <button className={styles.actionButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <BookmarkIcon width={25} height={25} />
                    </div>
                  </div>
                </button>
              </div>

              <div className={styles.likesSection}>
                <Image
                  src="https://i.pravatar.cc/150?img=50"
                  alt="Liker"
                  width={20}
                  height={20}
                  className={styles.likerAvatar}
                  unoptimized
                />
                <div className={styles.likesText}>
                  Liked by <Link href="/app/profile/openaidalle" className={styles.bold} onClick={onClose}>openaidalle</Link> and <span className={styles.bold}>1,000 others</span>
                </div>
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
              <input
                type="text"
                placeholder="Add a comment…"
                className={styles.commentInput}
              />
              <button className={styles.postButton}>Post</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
