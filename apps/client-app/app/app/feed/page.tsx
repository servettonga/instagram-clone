// /feed

'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import styles from './feed.module.css';
import PostViewModal from '@/components/modal/PostViewModal';

// Mock data for feed posts
const MOCK_POSTS = [
  {
    id: '1',
    username: 'lewishamilton',
    displayName: 'Lewis Hamilton',
    avatarUrl: 'https://i.pravatar.cc/150?img=12',
    isVerified: true,
    timeAgo: '5h',
    imageUrl: 'https://picsum.photos/seed/post1/468/585',
    likes: 741368,
    caption: 'Parabéns Ayrton, minha inspiração sempre 🇧🇷💫',
    commentsCount: 13384,
  },
  {
    id: '2',
    username: 'kurzgesagt',
    displayName: 'Kurzgesagt',
    avatarUrl: 'https://i.pravatar.cc/150?img=25',
    isVerified: true,
    timeAgo: '8h',
    imageUrl: 'https://picsum.photos/seed/post2/468/468',
    likes: 6724,
    caption: 'For every video we upload to YouTube we create different versions of the final thumbnail.',
    commentsCount: 37,
  },
  {
    id: '3',
    username: 'discovery',
    displayName: 'Discovery',
    avatarUrl: 'https://i.pravatar.cc/150?img=33',
    isVerified: true,
    timeAgo: '2d',
    imageUrl: 'https://picsum.photos/seed/post3/468/585',
    likes: 78780,
    caption: 'If you had to choose, where would you be the fastest: air, land, or sea?',
    commentsCount: 456,
  },
];

// Mock comments for the modal
const MOCK_COMMENTS = [
  {
    id: 'comment-1',
    username: 'user1',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    text: 'Amazing post!',
    timeAgo: '2h',
    likes: 10,
  },
  {
    id: 'comment-2',
    username: 'user2',
    avatarUrl: 'https://i.pravatar.cc/150?img=2',
    text: 'Love this! 🔥',
    timeAgo: '5h',
    likes: 5,
  },
];

export default function FeedPage() {
  const { user } = useAuthStore();
  const profile = user?.profile;
  const [selectedPost, setSelectedPost] = useState<typeof MOCK_POSTS[0] | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'for-you' | 'following'>('for-you');

  const handleOpenPostModal = (post: typeof MOCK_POSTS[0]) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedContent}>
        {/* Feed Posts */}
        <div className={styles.postsColumn}>
          {/* Feed Tabs */}
          <div className={styles.feedTabs}>
            <button
              className={`${styles.feedTab} ${activeTab === 'for-you' ? styles.feedTabActive : ''}`}
              onClick={() => setActiveTab('for-you')}
            >
              For you
            </button>
            <button
              className={`${styles.feedTab} ${activeTab === 'following' ? styles.feedTabActive : ''}`}
              onClick={() => setActiveTab('following')}
            >
              Following
            </button>
          </div>
          {MOCK_POSTS.map((post) => (
                        <article key={post.id} className={styles.post}>
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
                      unoptimized // For external URLs
                    />
                  </div>
                  <div className={styles.userInfo}>
                    <div className={styles.usernameRow}>
                      <Link href={`/app/profile/${post.username}`} className={styles.username}>
                        {post.username}
                      </Link>
                      {post.isVerified && (
                        <svg aria-label="Verified" className={styles.verifiedBadge} fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12">
                          <title>Verified</title>
                          <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd"></path>
                        </svg>
                      )}
                    </div>
                    <span className={styles.timeAgo}>{post.timeAgo}</span>
                  </div>
                </div>
                <button className={styles.moreButton}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
                    <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
                  </svg>
                </button>
              </div>

              {/* Post Image - Use fill for responsive sizing */}
              <div className={styles.postImageWrapper}>
                <Image
                  src={post.imageUrl}
                  alt={`Post by ${post.username}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 468px"
                  className={styles.postImage}
                  unoptimized // For external URLs like picsum.photos
                />
              </div>

              {/* Post Actions */}
              <div className={styles.postActions}>
                <div className={styles.actionsLeft}>
                  <button className={styles.actionButton}>
                    <div style={{width: 24, height: 24, position: 'relative', overflow: 'hidden'}}>
                      <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                        <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.4014 4.38835C18.7158 4.46101 19.9482 5.05025 20.8301 6.02765C21.712 7.00505 22.1718 8.29139 22.1094 9.60635C22.1094 12.6783 19.4574 14.5653 16.9124 16.8283C14.4004 19.0713 13.0474 20.2973 12.6094 20.5803C12.1324 20.2713 10.4664 18.7573 8.30636 16.8283C5.75036 14.5563 3.10936 12.6513 3.10936 9.60635C3.04692 8.29139 3.50675 7.00505 4.38862 6.02765C5.27049 5.05025 6.50293 4.46101 7.81736 4.38835C8.5455 4.36628 9.26692 4.53353 9.91107 4.87375C10.5552 5.21397 11.1001 5.71551 11.4924 6.32935C12.3324 7.50435 12.4724 8.09235 12.6124 8.09235C12.7524 8.09235 12.8904 7.50435 13.7224 6.32635C14.1124 5.70967 14.6575 5.20614 15.3031 4.86606C15.9487 4.52598 16.6722 4.36126 17.4014 4.38835ZM17.4014 2.38835C16.4933 2.35927 15.5904 2.53543 14.7598 2.9037C13.9293 3.27197 13.1925 3.82286 12.6044 4.51535C12.0167 3.82487 11.2815 3.27526 10.4529 2.9071C9.62434 2.53894 8.72364 2.36166 7.81736 2.38835C5.97223 2.4605 4.23074 3.26033 2.9737 4.61294C1.71666 5.96555 1.04635 7.76088 1.10936 9.60635C1.10936 13.2163 3.65936 15.4333 6.12436 17.5763C6.40736 17.8223 6.69336 18.0703 6.97736 18.3233L8.00436 19.2413C9.1244 20.3071 10.2986 21.3145 11.5224 22.2593C11.8461 22.469 12.2236 22.5805 12.6094 22.5805C12.9951 22.5805 13.3726 22.469 13.6964 22.2593C14.959 21.2856 16.1694 20.2458 17.3224 19.1443L18.2444 18.3203C18.5374 18.0603 18.8344 17.8013 19.1294 17.5463C21.4634 15.5213 24.1094 13.2263 24.1094 9.60635C24.1724 7.76088 23.5021 5.96555 22.245 4.61294C20.988 3.26033 19.2465 2.4605 17.4014 2.38835Z" fill="#262626"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                  <button className={styles.actionButton} onClick={() => handleOpenPostModal(post)}>
                    <div style={{width: 24, height: 24, position: 'relative', overflow: 'hidden'}}>
                      <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                        <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21.2654 17.4924C22.4805 15.3905 22.8889 12.9181 22.4142 10.5371C21.9395 8.15609 20.6142 6.02934 18.6859 4.55414C16.7576 3.07895 14.3582 2.35622 11.9359 2.52097C9.51368 2.68572 7.23424 3.72668 5.52345 5.44938C3.81266 7.17208 2.78755 9.45869 2.63961 11.882C2.49168 14.3054 3.23104 16.6997 4.71958 18.6177C6.20812 20.5357 8.34401 21.8462 10.7282 22.3044C13.1125 22.7626 15.582 22.337 17.6754 21.1074L22.6094 22.4844L21.2654 17.4924Z" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                  <button className={styles.actionButton}>
                    <div style={{width: 24, height: 24, position: 'relative', overflow: 'hidden'}}>
                      <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                        <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.6094 3.48438L9.82739 10.5674" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                        <path d="M12.3074 20.8184L22.6094 3.48535H2.60938L9.82738 10.5684L12.3074 20.8184Z" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </button>
                </div>
                <button className={styles.actionButton}>
                  <div style={{width: 24, height: 24, position: 'relative', overflow: 'hidden'}}>
                    <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20.6094 21.4844L12.6094 13.9244L4.60938 21.4844V3.48438H20.6094V21.4844Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </button>
              </div>

              {/* Post Info */}
              <div className={styles.postInfo}>
                <div className={styles.likes}>
                  {post.likes.toLocaleString()} likes
                </div>
                <div className={styles.caption}>
                  <Link href={`/app/profile/${post.username}`} className={styles.captionUsername}>
                    {post.username}
                  </Link>
                  <span className={styles.captionText}> {post.caption}</span>
                </div>
                {post.commentsCount > 0 && (
                  <button className={styles.viewComments} onClick={() => handleOpenPostModal(post)}>
                    View all {post.commentsCount.toLocaleString()} comments
                  </button>
                )}
                <div className={styles.addComment}>
                  <input
                    type="text"
                    placeholder="Add a comment…"
                    className={styles.commentInput}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Sidebar */}
        <aside className={styles.sidebar}>
          {/* Current User */}
          <div className={styles.sidebarUser}>
            <Link href={`/app/profile/${profile?.username}`}>
              <div className={styles.sidebarAvatarWrapper}>
                {profile?.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt={profile.username}
                    width={56}
                    height={56}
                    className={styles.sidebarAvatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    {profile?.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
              </div>
            </Link>
            <div className={styles.sidebarUserInfo}>
              <Link href={`/app/profile/${profile?.username}`} className={styles.sidebarUsername}>{profile?.username}</Link>
              <div className={styles.sidebarDisplayName}>{profile?.displayName}</div>
            </div>
          </div>

          {/* Suggestions */}
          <div className={styles.suggestions}>
            <div className={styles.suggestionsHeader}>
              <span className={styles.suggestionsTitle}>Suggestions for you</span>
              <button className={styles.seeAllButton}>See All</button>
            </div>
            <div className={styles.suggestionsList}>
              {[
                { username: 'imkir', note: 'Follows you', avatar: 'https://i.pravatar.cc/150?img=45' },
                { username: 'organic__al', note: 'Followed by chirag_singla17', avatar: 'https://i.pravatar.cc/150?img=46' },
                { username: 'im_gr', note: 'Followed by chirag_singla17', avatar: 'https://i.pravatar.cc/150?img=47' },
                { username: 'abh952', note: 'Follows you', avatar: 'https://i.pravatar.cc/150?img=48' },
                { username: 'sakbrl', note: 'Follows you', avatar: 'https://i.pravatar.cc/150?img=49' },
              ].map((suggestion) => (
                <div key={suggestion.username} className={styles.suggestionItem}>
                  <Image
                    src={suggestion.avatar}
                    alt={suggestion.username}
                    width={32}
                    height={32}
                    className={styles.suggestionAvatar}
                    unoptimized
                  />
                  <div className={styles.suggestionInfo}>
                    <div className={styles.suggestionUsername}>{suggestion.username}</div>
                    <div className={styles.suggestionNote}>{suggestion.note}</div>
                  </div>
                  <button className={styles.followButton}>Follow</button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          <footer className={styles.sidebarFooter}>
            <div className={styles.footerLinks}>
              About · Help · Privacy · Terms · Zeta Verified
            </div>
            <div className={styles.copyright}>© 2025 INNOGRAM FROM ZETA</div>
          </footer>
        </aside>
      </div>

      {/* Post View Modal */}
      {showPostModal && selectedPost && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          post={{
            id: selectedPost.id,
            imageUrl: selectedPost.imageUrl,
            username: selectedPost.username,
            avatarUrl: selectedPost.avatarUrl,
            caption: selectedPost.caption,
            likes: selectedPost.likes,
            timeAgo: selectedPost.timeAgo,
            comments: MOCK_COMMENTS,
          }}
        />
      )}
    </div>
  );
}
