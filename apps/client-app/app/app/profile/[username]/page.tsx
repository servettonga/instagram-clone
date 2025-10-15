'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/authStore';
import styles from './profile.module.css';
import PostViewModal from '@/components/modal/PostViewModal';
import { useState } from 'react';
import Link from 'next/link';

const MOCK_USER_POSTS = Array.from({ length: 11 }, (_, i) => ({
  id: `post-${i}`,
  imageUrl: i < 3 ? `https://picsum.photos/seed/profile${i}/309/309` : null,
  likes: Math.floor(Math.random() * 100000),
  comments: Math.floor(Math.random() * 1000),
}));

// Split posts into rows of 3
const postsInRows: { id: string; imageUrl: string | null; likes: number; comments: number; }[][] = [];
for (let i = 0; i < MOCK_USER_POSTS.length; i += 3) {
  postsInRows.push(MOCK_USER_POSTS.slice(i, i + 3));
}

// Mock comments data for modal
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

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuthStore();

  const isOwnProfile = username === 'me' || username === user?.profile?.username;
  const profile = isOwnProfile ? user?.profile : null;

  const [selectedPost, setSelectedPost] = useState<{ id: string; imageUrl: string | null; likes: number; comments: number; } | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  // Mock data for other users
  const displayProfile = profile || {
    username: username || 'user',
    displayName: 'Upvox',
    bio: 'Your favourite fun clips 🎦 in your language 🌎',
    website: 'upvox.net',
    category: 'Product/service',
    avatarUrl: 'https://i.pravatar.cc/150?u=' + (username || 'default'),
  };

  const handlePostClick = (post: typeof MOCK_USER_POSTS[0]) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileWrapper}>
        {/* Profile Header */}
        <div className={styles.profileHeader}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarWrapper}>
              {displayProfile.avatarUrl ? (
                <Image
                  src={displayProfile.avatarUrl}
                  alt={displayProfile.username}
                  width={150}
                  height={150}
                  className={styles.avatar}
                  unoptimized
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {displayProfile.displayName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>

          <div className={styles.profileInfo}>
            <div className={styles.profileActions}>
              <h1 className={styles.username}>{displayProfile.username}</h1>
              {isOwnProfile ? (
                <>
                  <Link href="/app/settings/account"><button className={styles.editButton} >Edit profile</button></Link>
                </>
              ) : (
                <>
                  <button className={styles.followButton}>Follow</button>
                  <button className={styles.messageButton}>Message</button>
                </>
              )}
            </div>

            <div className={styles.profileStats}>
              <div className={styles.statItem}>
                <span className={styles.statCount}>11</span>
                <span className={styles.statLabel}>posts</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statCount}>41</span>
                <span className={styles.statLabel}>followers</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statCount}>17</span>
                <span className={styles.statLabel}>following</span>
              </div>
            </div>

            <div className={styles.profileBio}>
              <div className={styles.displayName}>{displayProfile.displayName}</div>
              <div className={styles.bioCategory}>profile.category</div>
              {displayProfile.bio && (
                <div className={styles.bioText}>{displayProfile.bio}</div>
              )}
                <a href={`#`} className={styles.bioLink} target="_blank" rel="noopener noreferrer">
                  profile.website
                </a>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className={styles.postsSection}>
          <div className={styles.postsTabs}>
            <button className={`${styles.tab} ${styles.tabActive}`}>
                <div style={{width: 12, height: 12, position: 'relative', overflow: 'hidden'}}>
                  <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.125 2H2.125V11H11.125V2Z" stroke="#262626" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5.13257 2V11" stroke="#262626" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8.11743 2V11" stroke="#262626" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11.125 5.00745H2.125" stroke="#262626" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M11.125 7.99255H2.125" stroke="#262626" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              <span>POSTS</span>
            </button>
            <button className={styles.tab}>
              <div style={{width: 12, height: 12, position: 'relative', overflow: 'hidden'}}>
                <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1.43066 4.00098H11.3812" stroke="#8E8E8E" strokeLinejoin="round"/>
                  <path d="M7.1582 1.50049L8.5872 4.00099" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.00977 1.55505L5.40727 4.00105" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.40625 6.5005V8.225C1.40625 9.6495 1.75525 10.228 2.20925 10.6975C2.67925 11.1515 3.25825 11.501 4.68225 11.501H8.13025C9.55425 11.501 10.1332 11.1515 10.6032 10.6975C11.0572 10.228 11.4062 9.6495 11.4062 8.225V4.776C11.4062 3.352 11.0572 2.773 10.6032 2.3035C10.1332 1.8495 9.55425 1.5 8.13025 1.5H4.68225C3.25825 1.5 2.67925 1.8495 2.20925 2.3035C1.75525 2.773 1.40625 3.352 1.40625 4.776V6.5005Z" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                  <path fillRule="evenodd" clipRule="evenodd" d="M5.28779 9.33202C5.21873 9.29215 5.16138 9.23478 5.12153 9.16571C5.08168 9.09663 5.06073 9.01827 5.06079 8.93852V6.31502C5.0607 6.23517 5.08164 6.1567 5.12152 6.08752C5.16139 6.01834 5.21879 5.96088 5.28793 5.92094C5.35708 5.88099 5.43552 5.85997 5.51537 5.85999C5.59523 5.86 5.67366 5.88105 5.74279 5.92102L8.01529 7.23302C8.08445 7.27289 8.14189 7.33028 8.18182 7.3994C8.22176 7.46852 8.24279 7.54694 8.24279 7.62677C8.24279 7.7066 8.22176 7.78502 8.18182 7.85414C8.14189 7.92327 8.08445 7.98065 8.01529 8.02052L5.74279 9.33252C5.67362 9.37246 5.59516 9.39348 5.51529 9.39348C5.43542 9.39348 5.35696 9.37246 5.28779 9.33252V9.33202Z" fill="#8E8E8E"/>
                  </svg>
                </div>
              </div>
              <span>REELS</span>
            </button>
            <button className={styles.tab}>
              <div data-svg-wrapper style={{position: 'relative'}}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.7031 11L6.70312 7.22L2.70312 11V2H10.7031V11Z" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>SAVED</span>
            </button>
            <button className={styles.tab}>
              <div style={{width: 12, height: 12, position: 'relative', overflow: 'hidden'}}>
                <div data-svg-wrapper style={{left: 0, top: 0, position: 'absolute'}}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.24113 2.39854L6.14062 1.49854L7.04012 2.39854C7.18924 2.54746 7.39138 2.63109 7.60213 2.63104H10.2316C10.4727 2.63104 10.7039 2.7268 10.8744 2.89728C11.0449 3.06775 11.1406 3.29895 11.1406 3.54004V10.592C11.1406 10.8331 11.0449 11.0643 10.8744 11.2348C10.7039 11.4053 10.4727 11.501 10.2316 11.501H2.04963C1.80854 11.501 1.57734 11.4053 1.40686 11.2348C1.23639 11.0643 1.14062 10.8331 1.14062 10.592V3.54004C1.14063 3.29895 1.23639 3.06775 1.40686 2.89728C1.57734 2.7268 1.80854 2.63104 2.04963 2.63104H4.67963C4.8902 2.63096 5.09214 2.54734 5.24113 2.39854Z" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9.43957 11.501V11.2C9.43957 10.6764 9.23162 10.1742 8.86143 9.80396C8.49125 9.43368 7.98916 9.2256 7.46557 9.22546H4.88807C4.3644 9.22546 3.86218 9.43349 3.49189 9.80378C3.1216 10.1741 2.91357 10.6763 2.91357 11.2V11.5015" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.17668 7.81552C7.15864 7.81552 7.95468 7.01948 7.95468 6.03752C7.95468 5.05556 7.15864 4.25952 6.17668 4.25952C5.19472 4.25952 4.39868 5.05556 4.39868 6.03752C4.39868 7.01948 5.19472 7.81552 6.17668 7.81552Z" stroke="#8E8E8E" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span>TAGGED</span>
            </button>
          </div>

          <div className={styles.postsGrid}>
            {postsInRows.map((row, rowIndex) => (
              <div key={rowIndex} className={styles.postsRow}>
                {row.map((post) => (
                  <div key={post.id} className={styles.gridItem} onClick={() => post.imageUrl && handlePostClick(post)}>
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
                        <div className={styles.overlay}>
                          <div className={styles.stats}>
                            <span>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                              </svg>
                              {post.likes.toLocaleString()}
                            </span>
                            <span>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                              </svg>
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
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerLinks}>
          <span>Meta</span>
          <span>About</span>
          <span>Blog</span>
          <span>Jobs</span>
          <span>Help</span>
          <span>API</span>
          <span>Privacy</span>
          <span>Terms</span>
          <span>Top Accounts</span>
          <span>Locations</span>
          <span>Instagram Lite</span>
          <span>Contact Uploading & Non-Users</span>
          <span>Meta Verified</span>
        </div>
        <div className={styles.copyright}>
          <div className={styles.languageSelect}>
            <span>English</span>
            <svg width="12" height="12" viewBox="0 0 12 12" transform="rotate(180)">
              <path d="M1 4.5L6 9.5L11 4.5" fill="#8E8E8E"/>
            </svg>
          </div>
          <span className={styles.copyrightText}>© 2023 Instagram from Meta</span>
        </div>
      </div>
      {showPostModal && selectedPost && selectedPost.imageUrl && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          post={{
            id: selectedPost.id,
            imageUrl: selectedPost.imageUrl,
            username: displayProfile.username,
            avatarUrl: displayProfile.avatarUrl || 'https://i.pravatar.cc/150?u=' + displayProfile.username,
            caption: 'Amazing photo! Check out my latest work.',
            likes: selectedPost.likes,
            timeAgo: '3d',
            comments: MOCK_COMMENTS,
          }}
        />
      )}
    </div>
  );
}
