'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { postsAPI } from '@/lib/api/posts';
import { usersApi } from '@/lib/api/users';
import type { Post, UserWithProfileAndAccount } from '@repo/shared-types';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileGrid from '@/components/profile/ProfileGrid';
import Footer from '@/components/ui/Footer';
import PostViewModal from '@/components/modal/PostViewModal';
import styles from './profile.module.scss';
import { transformPostForModal } from '@/lib/utils';

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const { user: currentUser } = useAuthStore();

  const isOwnProfile = username === 'me' || username === currentUser?.profile?.username;
  const profile = isOwnProfile ? currentUser?.profile : null;

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [otherUserData, setOtherUserData] = useState<UserWithProfileAndAccount | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showPostModal, setShowPostModal] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

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

  // Transform posts for ProfileGrid
  const gridPosts = userPosts.map(post => ({
    id: post.id,
    imageUrl: post.assets[0]?.url || null,
    likes: post.likesCount,
    comments: post.commentsCount,
    hasMultipleImages: post.assets.length > 1 ? true : undefined,
    isLiked: post.isLikedByCurrentUser,
  }));

  const handlePostClick = (post: { id: string; imageUrl: string | null; likes: number; comments: number; hasMultipleImages?: boolean; isLiked?: boolean; }) => {
    // Find the full post data and its index
    const postIndex = userPosts.findIndex(p => p.id === post.id);
    const fullPost = userPosts[postIndex];
    if (fullPost) {
      setSelectedPost(fullPost);
      setSelectedPostIndex(postIndex);
      setShowPostModal(true);
    }
  };

  const handleNextPost = () => {
    const nextIndex = (selectedPostIndex + 1) % userPosts.length;
    const nextPost = userPosts[nextIndex];
    if (nextPost) {
      setSelectedPostIndex(nextIndex);
      setSelectedPost(nextPost);
    }
  };

  const handlePrevPost = () => {
    const prevIndex = selectedPostIndex === 0 ? userPosts.length - 1 : selectedPostIndex - 1;
    const prevPost = userPosts[prevIndex];
    if (prevPost) {
      setSelectedPostIndex(prevIndex);
      setSelectedPost(prevPost);
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
      <div className={styles.profileWrapper}>
        {/* Profile Header Component */}
        <ProfileHeader
          profile={displayProfile}
          isOwnProfile={isOwnProfile}
          stats={{ ...profileStatsState, posts: userPosts.length }}
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
            {isLoadingPosts ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p>Loading posts...</p>
              </div>
            ) : (
              <ProfileGrid
                posts={gridPosts}
                onPostClick={handlePostClick}
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
          post={transformPostForModal(selectedPost)}
          onNextPost={userPosts.length > 1 ? handleNextPost : undefined}
          onPrevPost={userPosts.length > 1 ? handlePrevPost : undefined}
        />
      )}
    </div>
  );
}
