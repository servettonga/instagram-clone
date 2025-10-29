'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { postsAPI } from '@/lib/api/posts';
import { useAuthStore } from '@/lib/store/authStore';
import {
  MoreIcon,
  HeartIcon,
  CommentIcon,
  ShareIcon,
  BookmarkIcon,
  EmojiIcon,
} from '@/components/ui/icons';
import type { Post } from '@repo/shared-types';
import styles from './page.module.scss';

export default function PostPage() {
  const params = useParams();
  const { user: currentUser } = useAuthStore();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!postId) return;

    const fetchPost = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedPost = await postsAPI.getPost(postId);
        setPost(fetchedPost);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

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
        <Link href="/app/feed" className={styles.backLink}>
          Back to Feed
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

  // Determine container class based on aspect ratio
  const getContainerClass = () => {
    const ratio = (post.aspectRatio || '4/5').replace(':', '/');
    if (ratio === '4/5') {
      return `${styles.imageContainer} ${styles.imageContainerRightAlign}`;
    }
    return styles.imageContainer;
  };

  // Determine section class based on aspect ratio
  const getSectionClass = () => {
    const ratio = (post.aspectRatio || '4/5').replace(':', '/');
    if (ratio === '4/5') {
      return `${styles.imageSection} ${styles.imageSectionNoBackground}`;
    }
    return styles.imageSection;
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.postView}>
        {/* Image Section */}
        <div className={getSectionClass()}>
          <div className={getContainerClass()}>
            <div className={getWrapperClass()}>
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage.url}
                  alt="Post"
                  className={styles.postImage}
                />
              ) : null}
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

          {/* Navigation Arrows - only show if multiple images */}
          {images.length > 1 && (
            <>
              <button
                className={styles.navPrev}
                aria-label="Previous"
                onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
              >
                <svg width="30" height="30" viewBox="0 0 30 30" fill="white">
                  <circle cx="15" cy="15" r="15" fillOpacity="0.8" />
                  <path d="M18 9L12 15L18 21" stroke="black" strokeWidth="2" fill="none" />
                </svg>
              </button>
              <button
                className={styles.navNext}
                aria-label="Next"
                onClick={() => setCurrentImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
              >
                <svg width="30" height="30" viewBox="0 0 30 30" fill="white">
                  <circle cx="15" cy="15" r="15" fillOpacity="0.8" />
                  <path d="M12 9L18 15L12 21" stroke="black" strokeWidth="2" fill="none" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          {/* Header */}
          <div className={styles.postHeader}>
            <div className={styles.userInfo}>
              <Link href={`/app/profile/${post.profile.username}`} className={styles.avatarStack}>
                <Image
                  src={post.profile.avatarUrl || 'https://i.pravatar.cc/150?img=1'}
                  alt={post.profile.username}
                  width={32}
                  height={32}
                  className={styles.avatar}
                  unoptimized
                />
              </Link>
              <div className={styles.userDetails}>
                <div className={styles.usernameRow}>
                  <Link href={`/app/profile/${post.profile.username}`} className={styles.usernameLink}>
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
            {showMenu && isOwnPost && (
              <div className={styles.moreMenu}>
                <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                  Edit
                </button>
                <button className={styles.menuItem} onClick={() => setShowMenu(false)}>
                  Archive
                </button>
                <button className={styles.menuItem} style={{ color: '#ED4956' }} onClick={() => setShowMenu(false)}>
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div className={styles.commentsSection}>
            {/* Caption as first comment */}
            {post.content && (
              <div className={styles.comment}>
                <Link href={`/app/profile/${post.profile.username}`}>
                  <Image
                    src={post.profile.avatarUrl || 'https://i.pravatar.cc/150?img=1'}
                    alt={post.profile.username}
                    width={32}
                    height={32}
                    className={styles.commentAvatar}
                    unoptimized
                  />
                </Link>
                <div className={styles.commentContent}>
                  <p className={styles.commentText}>
                    <Link href={`/app/profile/${post.profile.username}`} className={styles.commentUsernameLink}>
                      {post.profile.username}
                    </Link>{' '}
                    {post.content}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Post Actions */}
          <div className={styles.postActions}>
            <div className={styles.actionsRow}>
              <button className={styles.actionButton} aria-label="Like">
                <HeartIcon width={24} height={24} />
              </button>
              <button className={styles.actionButton} aria-label="Comment">
                <CommentIcon width={24} height={24} />
              </button>
              <button className={styles.actionButton} aria-label="Share">
                <ShareIcon width={24} height={24} />
              </button>
              <button className={styles.actionButton} aria-label="Save" style={{ marginLeft: 'auto' }}>
                <BookmarkIcon width={24} height={24} />
              </button>
            </div>

            {/* Likes Section */}
            {post.likesCount > 0 && (
              <div className={styles.likesSection}>
                <span className={styles.likesText}>
                  <span className={styles.bold}>{post.likesCount} likes</span>
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
            />
            <button className={styles.postButton} disabled>Post</button>
          </div>
        </div>
      </div>
    </div>
  );
}
