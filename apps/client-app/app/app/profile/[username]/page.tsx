'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
  const { user: currentUser } = useAuthStore();

  const isOwnProfile = username === 'me' || username === currentUser?.profile?.username;
  const profile = isOwnProfile ? currentUser?.profile : null;

  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [otherUserData, setOtherUserData] = useState<UserWithProfileAndAccount | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number>(0);
  const [showPostModal, setShowPostModal] = useState(false);

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
      try {
        const userData = await usersApi.getUserByUsername(username);
        setOtherUserData(userData);
      } catch (error) {
        console.error('Failed to load user data:', error);
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
  }));

  const handlePostClick = (post: { id: string; imageUrl: string | null; likes: number; comments: number; hasMultipleImages?: boolean; }) => {
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

  const profileStats = {
    posts: userPosts.length,
    followers: 0,
    following: 0,
  };

  // Display current user's profile if own profile, otherwise show other user's profile
  const displayProfile = profile || otherUserData?.profile || {
    username: username || 'user',
    displayName: 'User',
    bio: '',
    website: '',
    category: '',
    avatarUrl: null,
  };

  return (
    <div className={styles.profileContainer}>
      <div className={styles.profileWrapper}>
        {/* Profile Header Component */}
        <ProfileHeader
          profile={displayProfile}
          isOwnProfile={isOwnProfile}
          stats={profileStats}
        />

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
          post={transformPostForModal(selectedPost, MOCK_COMMENTS)}
          onNextPost={userPosts.length > 1 ? handleNextPost : undefined}
          onPrevPost={userPosts.length > 1 ? handlePrevPost : undefined}
        />
      )}
    </div>
  );
}
