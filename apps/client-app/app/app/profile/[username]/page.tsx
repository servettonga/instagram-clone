'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
import { usersApi } from '@/lib/api/users';
import type { Post, UserWithProfileAndAccount } from '@repo/shared-types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileGrid from '@/components/profile/ProfileGrid';
import Footer from '@/components/ui/Footer';
import PostViewModal from '@/components/modal/PostViewModal';
import MobileHeader from '@/components/layout/MobileHeader';
import styles from './profile.module.scss';
import { transformPostForModal } from '@/lib/utils';

type TabType = 'posts' | 'reels' | 'saved' | 'tagged' | 'archive';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = params.username as string;
  const { user: currentUser } = useAuthStore();

  const isOwnProfile = username === 'me' || username === currentUser?.profile?.username;
  const profile = isOwnProfile ? currentUser?.profile : null;

  // Get initial tab from URL query parameter
  const initialTab = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(initialTab && ['posts', 'reels', 'saved', 'tagged', 'archive'].includes(initialTab) ? initialTab : 'posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [archivedPosts, setArchivedPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isLoadingArchived, setIsLoadingArchived] = useState(false);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [otherUserData, setOtherUserData] = useState<UserWithProfileAndAccount | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const initialSavedLoadedRef = useRef(false);

  // Get profile ID based on profile type
  const getProfileId = useCallback(() => isOwnProfile ? profile?.id : otherUserData?.profile?.id, [isOwnProfile, profile?.id, otherUserData?.profile?.id]);

  // Reusable function to load user posts
  const loadUserPostsData = useCallback(async (updateSelectedPost = false, currentSelectedPost?: Post | null) => {
    const profileId = getProfileId();
    if (!profileId) return;

    setIsLoadingPosts(true);
    try {
      const response = await postsAPI.getAllPosts({
        profileId,
        page: 1,
        limit: 50,
      });
      setUserPosts(response.data);

      // Update selected post if it exists in the new data (used after edit)
      if (updateSelectedPost && currentSelectedPost) {
        const updatedPost = response.data.find(p => p.id === currentSelectedPost.id);
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (error) {
      console.error('Failed to load user posts:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  }, [getProfileId]);

  // Load archived posts
  const loadArchivedPosts = useCallback(async () => {
    if (!isOwnProfile) return;

    setIsLoadingArchived(true);
    try {
      const response = await postsAPI.getArchivedPosts({
        page: 1,
        limit: 50,
      });
      setArchivedPosts(response.data);
    } catch (error) {
      console.error('Failed to load archived posts:', error);
    } finally {
      setIsLoadingArchived(false);
    }
  }, [isOwnProfile]);

  // Load saved posts
  const loadSavedPosts = useCallback(async () => {
    if (!isOwnProfile) return;

    setIsLoadingSaved(true);
    try {
      const response = await postsAPI.getSavedPosts({
        page: 1,
        limit: 50,
      });
      setSavedPosts(response.data);
    } catch (error) {
      console.error('Failed to load saved posts:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [isOwnProfile]);

  // Load other user's data (for non-own profiles)
  useEffect(() => {
    if (isOwnProfile || !username) return;

    const loadOtherUserData = async () => {
      setIsLoadingUser(true);
      setUserNotFound(false);
      try {
        const userData = await usersApi.getUserByUsername(username);
        setOtherUserData(userData);
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Check if it's a 404 error
        const err = error as { response?: { status?: number } };
        if (err.response?.status === 404) {
          setUserNotFound(true);
        }
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadOtherUserData();
  }, [username, isOwnProfile]);

  // Load user's posts
  useEffect(() => {
    loadUserPostsData(false);
  }, [loadUserPostsData]);

  // Load saved posts if initial tab is 'saved'
  useEffect(() => {
    if (initialTab === 'saved' && isOwnProfile && !initialSavedLoadedRef.current) {
      initialSavedLoadedRef.current = true;
      loadSavedPosts();
    }
  }, [initialTab, isOwnProfile, loadSavedPosts]);

  // Transform posts for ProfileGrid based on active tab
  const currentPosts = activeTab === 'archive' ? archivedPosts : activeTab === 'saved' ? savedPosts : userPosts;
  const gridPosts = currentPosts.map(post => ({
    id: post.id,
    imageUrl: post.assets[0]?.url || null,
    likes: post.likesCount,
    comments: post.commentsCount,
    hasMultipleImages: post.assets.length > 1 ? true : undefined,
    isLiked: post.isLikedByCurrentUser,
  }));

  const handlePostClick = (post: { id: string; imageUrl: string | null; likes: number; comments: number; hasMultipleImages?: boolean; isLiked?: boolean; }) => {
    // Find the full post data and its index from the current tab's posts
    const postIndex = currentPosts.findIndex(p => p.id === post.id);
    const fullPost = currentPosts[postIndex];
    if (fullPost) {
      setSelectedPost(fullPost);
      setSelectedPostIndex(postIndex);
      setShowPostModal(true);
    }
  };

  const handleNextPost = () => {
    const nextIndex = (selectedPostIndex + 1) % currentPosts.length;
    const nextPost = currentPosts[nextIndex];
    if (nextPost) {
      setSelectedPostIndex(nextIndex);
      setSelectedPost(nextPost);
    }
  };

  const handlePrevPost = () => {
    const prevIndex = selectedPostIndex === 0 ? currentPosts.length - 1 : selectedPostIndex - 1;
    const prevPost = currentPosts[prevIndex];
    if (prevPost) {
      setSelectedPostIndex(prevIndex);
      setSelectedPost(prevPost);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'archive' && archivedPosts.length === 0 && !isLoadingArchived) {
      loadArchivedPosts();
    }
    if (tab === 'saved' && savedPosts.length === 0 && !isLoadingSaved) {
      loadSavedPosts();
    }
  };

  const [profileStatsState, setProfileStatsState] = useState({
    posts: userPosts.length,
    followers: 0,
    following: 0,
  });

  // helper to get the actual userId (not profile id) required by follow API
  const getUserIdForProfile = useCallback(() => {
    if (isOwnProfile) return currentUser?.id || null;
    return otherUserData?.id || null;
  }, [isOwnProfile, currentUser?.id, otherUserData?.id]);

  const loadProfileStats = useCallback(async () => {
    const userId = getUserIdForProfile();
    if (!userId) return;
    try {
      const followersRes = await (await import('@/lib/api/follow')).followAPI.getFollowers(userId, 1, 1);
      const followingRes = await (await import('@/lib/api/follow')).followAPI.getFollowing(userId, 1, 1);
      setProfileStatsState({ posts: userPosts.length, followers: followersRes.total ?? 0, following: followingRes.total ?? 0 });
    } catch (err) {
      console.error('Failed to load profile stats:', err);
    }
  }, [getUserIdForProfile, userPosts.length]);

  // Load stats initially and when profile changes
  useEffect(() => {
    loadProfileStats();
  }, [loadProfileStats]);

  // Listen to global follow changes to refresh counts when someone follows/unfollows
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { targetUserId?: string; action?: 'follow' | 'unfollow' } | undefined;
      const userId = getUserIdForProfile();
      if (!userId) return;
      if (!detail) return;
      // If the event affects this profile, reload stats
      if (detail.targetUserId === userId) {
        loadProfileStats();
      }
      // If current user followed/unfollowed someone and we're viewing own profile, refresh following count
      if (isOwnProfile && detail.action && (detail.action === 'follow' || detail.action === 'unfollow')) {
        loadProfileStats();
      }
    };

    window.addEventListener('follow:changed', handler as EventListener);
    return () => window.removeEventListener('follow:changed', handler as EventListener);
  }, [getUserIdForProfile, isOwnProfile, loadProfileStats]);

  // Display current user's profile if own profile, otherwise show other user's profile
  const displayProfile = profile || otherUserData?.profile || {
    username: username || 'user',
    displayName: 'User',
    bio: '',
    website: '',
    category: '',
    avatarUrl: null,
    isPublic: true,
  };

  // Show loading state
  if (isLoadingUser) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileWrapper}>
          <div className={styles.notFoundContainer}>
            <p>Loading...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show 404 for non-existent users
  if (userNotFound) {
    return (
      <div className={styles.profileContainer}>
        <div className={styles.profileWrapper}>
          <div className={styles.notFoundContainer}>
            <h2>Profile isn&apos;t available</h2>
            <p>The link may be broken, or the profile may have been removed.</p>
            <button
              className={styles.primaryButton}
              onClick={() => router.push('/app/feed')}
            >
              See more on Innogram
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Check if profile is private and user is not following
  const isPrivateProfile = !isOwnProfile && displayProfile.isPublic === false && userPosts.length === 0 && !isLoadingPosts;

  return (
    <div className={styles.profileContainer}>
      <MobileHeader variant="profile" title={displayProfile.username} />
      <div className={styles.profileWrapper}>
        {/* Profile Header Component */}
        <ProfileHeader
          profile={displayProfile}
          isOwnProfile={isOwnProfile}
          stats={{ ...profileStatsState, posts: userPosts.length }}
          onViewArchive={() => handleTabChange('archive')}
        />

        {/* Private Profile Message */}
        {isPrivateProfile ? (
          <div className={styles.privateProfileContainer}>
            <h2>This account is private</h2>
            <p>Follow to see their photos and videos.</p>
          </div>
        ) : (
          <>
            {/* Profile Grid Component */}
            {(activeTab === 'posts' && isLoadingPosts) || (activeTab === 'archive' && isLoadingArchived) || (activeTab === 'saved' && isLoadingSaved) ? (
              <ProfileGrid
                posts={[]}
                onPostClick={handlePostClick}
                isOwnProfile={isOwnProfile}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            ) : activeTab === 'reels' || activeTab === 'tagged' ? (
              <>
                <ProfileGrid
                  posts={[]}
                  onPostClick={handlePostClick}
                  isOwnProfile={isOwnProfile}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    {activeTab === 'reels' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                        <polygon points="10,8 16,12 10,16" fill="currentColor" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    )}
                  </div>
                  <h3>{activeTab === 'reels' ? 'No reels yet' : 'Photos of you'}</h3>
                  <p>{activeTab === 'reels' ? 'No reels to show.' : 'When people tag you in photos, they\'ll appear here.'}</p>
                </div>
              </>
            ) : gridPosts.length === 0 ? (
              <>
                <ProfileGrid
                  posts={[]}
                  onPostClick={handlePostClick}
                  isOwnProfile={isOwnProfile}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                />
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>
                    {activeTab === 'archive' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" />
                      </svg>
                    ) : activeTab === 'saved' ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                      </svg>
                    ) : (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21,15 16,10 5,21" />
                      </svg>
                    )}
                  </div>
                  <h3>{activeTab === 'archive' ? 'No archived posts' : activeTab === 'saved' ? 'Save' : 'No posts yet'}</h3>
                  <p>{activeTab === 'archive' ? 'When you archive posts, they\'ll appear here.' : activeTab === 'saved' ? 'Save photos and videos that you want to see again.' : 'Start sharing photos to see them here.'}</p>
                </div>
              </>
            ) : (
              <ProfileGrid
                posts={gridPosts}
                onPostClick={handlePostClick}
                isOwnProfile={isOwnProfile}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            )}
          </>
        )}
      </div>

      {/* Footer Component */}
      <Footer />
      {showPostModal && selectedPost && selectedPost.assets[0] && (
        <PostViewModal
          isOpen={showPostModal}
          onClose={() => {
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          onPostDeleted={() => {
            setUserPosts(prev => prev.filter(p => p.id !== selectedPost.id));
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          onPostUpdated={() => loadUserPostsData(true, selectedPost)}
          onPostArchived={(archived) => {
            if (archived) {
              // Post was archived - remove from posts, add to archived
              setUserPosts(prev => prev.filter(p => p.id !== selectedPost.id));
              // Refresh archived posts if we've loaded them before
              if (archivedPosts.length > 0) {
                loadArchivedPosts();
              }
            } else {
              // Post was unarchived - remove from archived, refresh posts
              setArchivedPosts(prev => prev.filter(p => p.id !== selectedPost.id));
              loadUserPostsData();
            }
            setShowPostModal(false);
            setSelectedPost(null);
          }}
          onPostSaved={(saved) => {
            // Refresh saved posts list if we're on the saved tab
            if (activeTab === 'saved') {
              if (saved) {
                // Post was saved - refresh the list to include it
                loadSavedPosts();
              } else {
                // Post was unsaved - remove from list
                setSavedPosts(prev => prev.filter(p => p.id !== selectedPost.id));
              }
            }
          }}
          post={transformPostForModal(selectedPost)}
          onNextPost={currentPosts.length > 1 ? handleNextPost : undefined}
          onPrevPost={currentPosts.length > 1 ? handlePrevPost : undefined}
        />
      )}
    </div>
  );
}
