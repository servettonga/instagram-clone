'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './PostViewModal.module.css';

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
    imageUrl: string;
    username: string;
    avatarUrl: string;
    caption: string;
    likes: number;
    timeAgo: string;
    comments: Comment[];
    collaborators?: string[];
  };
}

export default function PostViewModal({ isOpen, onClose, post }: PostViewModalProps) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.postView}>
          {/* Image Section */}
          <div className={styles.imageSection}>
            <div className={styles.imageWrapper}>
              <Image
                src={post.imageUrl}
                alt="Post"
                fill
                className={styles.postImage}
                unoptimized
              />
            </div>

            {/* Carousel Indicators */}
            <div className={styles.carouselIndicators}>
              <div className={`${styles.indicator} ${styles.indicatorActive}`} />
              <div className={styles.indicator} />
              <div className={styles.indicator} />
            </div>

            {/* Navigation Arrows */}
            <button className={styles.navNext} aria-label="Next">
              <svg width="30" height="30" viewBox="0 0 30 30" fill="white">
                <circle cx="15" cy="15" r="15" fillOpacity="0.8"/>
                <path d="M12 9L18 15L12 21" stroke="black" strokeWidth="2" fill="none"/>
              </svg>
            </button>
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
              <button className={styles.moreButton}>
                <div className={styles.svgWrapper}>
                  <div className={styles.svgWrapperInner}>
                    <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.6094 14C13.4378 14 14.1094 13.3284 14.1094 12.5C14.1094 11.6716 13.4378 11 12.6094 11C11.7809 11 11.1094 11.6716 11.1094 12.5C11.1094 13.3284 11.7809 14 12.6094 14Z" fill="#262626"/>
                      <path d="M6.60938 14C7.4378 14 8.10938 13.3284 8.10938 12.5C8.10938 11.6716 7.4378 11 6.60938 11C5.78095 11 5.10938 11.6716 5.10938 12.5C5.10938 13.3284 5.78095 14 6.60938 14Z" fill="#262626"/>
                      <path d="M18.6094 14C19.4378 14 20.1094 13.3284 20.1094 12.5C20.1094 11.6716 19.4378 11 18.6094 11C17.7809 11 17.1094 11.6716 17.1094 12.5C17.1094 13.3284 17.7809 14 18.6094 14Z" fill="#262626"/>
                    </svg>
                  </div>
                </div>
              </button>
            </div>

            {/* Comments Section */}
            <div className={styles.commentsSection}>
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
                    {post.caption}
                  </div>
                  <div className={styles.commentMeta}>
                    <span className={styles.timeAgo}>3d</span>
                    <button className={styles.translateButton}>See translation</button>
                  </div>
                </div>
              </div>

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
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                         <path d="M9.00534 2.45199C9.66255 2.48832 10.2788 2.78294 10.7197 3.27164C11.1606 3.76034 11.3906 4.40351 11.3593 5.06099C11.3593 6.59699 10.0333 7.54049 8.76084 8.67199C7.50484 9.79349 6.82834 10.4065 6.60934 10.548C6.37084 10.3935 5.53784 9.63649 4.45784 8.67199C3.17984 7.53599 1.85934 6.58349 1.85934 5.06099C1.82812 4.40351 2.05803 3.76034 2.49897 3.27164C2.9399 2.78294 3.55612 2.48832 4.21334 2.45199C4.57741 2.44095 4.93812 2.52458 5.26019 2.69469C5.58227 2.8648 5.85469 3.11557 6.05084 3.42249C6.47084 4.00999 6.54084 4.30399 6.61084 4.30399C6.68084 4.30399 6.74984 4.00999 7.16584 3.42099C7.36087 3.11265 7.63339 2.86088 7.95619 2.69084C8.27898 2.5208 8.64074 2.43844 9.00534 2.45199ZM9.00534 1.45199C8.5513 1.43745 8.09984 1.52553 7.68456 1.70966C7.26929 1.8938 6.9009 2.16924 6.60684 2.51549C6.31302 2.17025 5.94539 1.89544 5.53111 1.71136C5.11683 1.52728 4.66648 1.43864 4.21334 1.45199C3.29077 1.48806 2.42003 1.88798 1.79151 2.56428C1.16299 3.24059 0.827833 4.13825 0.859336 5.06099C0.859336 6.86599 2.13434 7.97449 3.36684 9.04599C3.50834 9.16899 3.65134 9.29299 3.79334 9.41949L4.30684 9.87849C4.86686 10.4114 5.45397 10.915 6.06584 11.3875C6.22773 11.4923 6.41647 11.5481 6.60934 11.5481C6.8022 11.5481 6.99095 11.4923 7.15284 11.3875C7.78418 10.9006 8.38936 10.3807 8.96584 9.82999L9.42684 9.41799C9.57334 9.28799 9.72184 9.15849 9.86934 9.03099C11.0363 8.01849 12.3593 6.87099 12.3593 5.06099C12.3908 4.13825 12.0557 3.24059 11.4272 2.56428C10.7986 1.88798 9.9279 1.48806 9.00534 1.45199Z" fill="#262626"/>
                        </svg>
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
                      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.4014 4.38835C18.7158 4.46101 19.9482 5.05025 20.8301 6.02765C21.712 7.00505 22.1718 8.29139 22.1094 9.60635C22.1094 12.6783 19.4574 14.5653 16.9124 16.8283C14.4004 19.0713 13.0474 20.2973 12.6094 20.5803C12.1324 20.2713 10.4664 18.7573 8.30636 16.8283C5.75036 14.5563 3.10936 12.6513 3.10936 9.60635C3.04692 8.29139 3.50675 7.00505 4.38862 6.02765C5.27049 5.05025 6.50293 4.46101 7.81736 4.38835C8.5455 4.36628 9.26692 4.53353 9.91107 4.87375C10.5552 5.21397 11.1001 5.71551 11.4924 6.32935C12.3324 7.50435 12.4724 8.09235 12.6124 8.09235C12.7524 8.09235 12.8904 7.50435 13.7224 6.32635C14.1124 5.70967 14.6575 5.20614 15.3031 4.86606C15.9487 4.52598 16.6722 4.36126 17.4014 4.38835ZM17.4014 2.38835C16.4933 2.35927 15.5904 2.53543 14.7598 2.9037C13.9293 3.27197 13.1925 3.82286 12.6044 4.51535C12.0167 3.82487 11.2815 3.27526 10.4529 2.9071C9.62434 2.53894 8.72364 2.36166 7.81736 2.38835C5.97223 2.4605 4.23074 3.26033 2.9737 4.61294C1.71666 5.96555 1.04635 7.76088 1.10936 9.60635C1.10936 13.2163 3.65936 15.4333 6.12436 17.5763C6.40736 17.8223 6.69336 18.0703 6.97736 18.3233L8.00436 19.2413C9.1244 20.3071 10.2986 21.3145 11.5224 22.2593C11.8461 22.469 12.2236 22.5805 12.6094 22.5805C12.9951 22.5805 13.3726 22.469 13.6964 22.2593C14.959 21.2856 16.1694 20.2458 17.3224 19.1443L18.2444 18.3203C18.5374 18.0603 18.8344 17.8013 19.1294 17.5463C21.4634 15.5213 24.1094 13.2263 24.1094 9.60635C24.1724 7.76088 23.5021 5.96555 22.245 4.61294C20.988 3.26033 19.2465 2.4605 17.4014 2.38835Z" fill="#262626"/>
                      </svg>
                    </div>
                  </div>
                </button>
                <button className={styles.actionButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21.2654 17.4924C22.4805 15.3905 22.8889 12.9181 22.4142 10.5371C21.9395 8.15609 20.6142 6.02934 18.6859 4.55414C16.7576 3.07895 14.3582 2.35622 11.9359 2.52097C9.51368 2.68572 7.23424 3.72668 5.52345 5.44938C3.81266 7.17208 2.78755 9.45869 2.63961 11.882C2.49168 14.3054 3.23104 16.6997 4.71958 18.6177C6.20812 20.5357 8.34401 21.8462 10.7282 22.3044C13.1125 22.7626 15.582 22.337 17.6754 21.1074L22.6094 22.4844L21.2654 17.4924Z" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </button>
                <button className={styles.actionButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.6094 3.48438L9.82739 10.5674" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M12.3074 20.8184L22.6094 3.48535H2.60938L9.82738 10.5684L12.3074 20.8184Z" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </button>
                <button className={styles.actionButton}>
                  <div className={styles.svgWrapper}>
                    <div className={styles.svgWrapperInner}>
                      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20.6094 21.4844L12.6094 13.9244L4.60938 21.4844V3.48438H20.6094V21.4844Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
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

              <div className={styles.postTime}>3 DAYS AGO</div>
            </div>

            <div className={styles.addCommentSection}>
              <button className={styles.emojiButton}>
                <div className={styles.svgWrapper}>
                  <div className={styles.svgWrapperInner}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15.83 10.9971C15.5992 10.9971 15.3736 11.0655 15.1817 11.1937C14.9897 11.322 14.8402 11.5042 14.7518 11.7175C14.6635 11.9307 14.6404 12.1653 14.6854 12.3917C14.7305 12.6181 14.8416 12.826 15.0048 12.9892C15.168 13.1525 15.376 13.2636 15.6023 13.3086C15.8287 13.3537 16.0634 13.3305 16.2766 13.2422C16.4898 13.1539 16.6721 13.0043 16.8003 12.8124C16.9286 12.6205 16.997 12.3949 16.997 12.1641C16.997 11.8545 16.8741 11.5577 16.6552 11.3389C16.4363 11.12 16.1395 10.9971 15.83 10.9971ZM9.33 12.1641C9.33 11.9332 9.26154 11.7075 9.13326 11.5156C9.00498 11.3237 8.82267 11.1741 8.60937 11.0858C8.39607 10.9975 8.16137 10.9744 7.93497 11.0195C7.70856 11.0647 7.50063 11.1759 7.33746 11.3392C7.17429 11.5025 7.06322 11.7106 7.01831 11.937C6.97339 12.1634 6.99664 12.3981 7.08512 12.6113C7.17361 12.8246 7.32334 13.0068 7.51538 13.1349C7.70743 13.263 7.93315 13.3312 8.164 13.3311C8.47334 13.3308 8.76991 13.2077 8.98855 12.9889C9.20719 12.7701 9.33 12.4734 9.33 12.1641ZM14.493 15.4041C14.1748 15.7463 13.7896 16.0193 13.3613 16.2063C12.933 16.3932 12.4708 16.49 12.0035 16.4907C11.5362 16.4913 11.0738 16.3958 10.645 16.2101C10.2162 16.0244 9.83018 15.7524 9.511 15.4111C9.34445 15.2046 9.10269 15.0727 8.83892 15.0445C8.57515 15.0163 8.31098 15.094 8.10451 15.2606C7.89803 15.4271 7.76618 15.6689 7.73796 15.9326C7.70974 16.1964 7.78745 16.4606 7.95401 16.6671C8.46045 17.2404 9.083 17.6996 9.78037 18.014C10.4777 18.3285 11.234 18.4912 11.999 18.4912C12.764 18.4912 13.5203 18.3285 14.2176 18.014C14.915 17.6996 15.5376 17.2404 16.044 16.6671C16.204 16.4608 16.2769 16.2001 16.2473 15.9408C16.2177 15.6814 16.0878 15.4439 15.8854 15.279C15.6831 15.1141 15.4243 15.0349 15.1643 15.0583C14.9043 15.0816 14.6637 15.2057 14.494 15.4041H14.493ZM12 0.503052C9.72552 0.503052 7.50211 1.17751 5.61095 2.44115C3.71978 3.70479 2.2458 5.50084 1.37539 7.60219C0.504983 9.70354 0.277244 12.0158 0.720974 14.2466C1.1647 16.4774 2.25997 18.5265 3.86828 20.1348C5.47658 21.7431 7.52568 22.8384 9.75647 23.2821C11.9872 23.7258 14.2995 23.4981 16.4009 22.6277C18.5022 21.7573 20.2983 20.2833 21.5619 18.3921C22.8255 16.5009 23.5 14.2775 23.5 12.0031C23.4966 8.95412 22.2839 6.03105 20.1279 3.87512C17.972 1.7192 15.0489 0.506493 12 0.503052ZM12 21.5031C10.1211 21.5031 8.28435 20.9459 6.72209 19.902C5.15982 18.8581 3.94218 17.3744 3.22315 15.6385C2.50412 13.9026 2.31599 11.9925 2.68255 10.1497C3.0491 8.30687 3.95389 6.61414 5.28249 5.28554C6.61109 3.95694 8.30383 3.05215 10.1466 2.68559C11.9895 2.31903 13.8996 2.50716 15.6355 3.2262C17.3714 3.94523 18.8551 5.16287 19.899 6.72513C20.9428 8.2874 21.5 10.1241 21.5 12.0031C21.4974 14.5218 20.4956 16.9366 18.7146 18.7176C16.9336 20.4987 14.5187 21.5004 12 21.5031Z" fill="#262626"/>
                    </svg>
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
