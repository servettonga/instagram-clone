// New chat modal component
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api/users';
import { chatsAPI } from '@/lib/api/chats';
import { useChatStore } from '@/lib/store/chatStore';
import { ROUTES } from '@/lib/routes';
import Avatar from '@/components/ui/Avatar';
import { FiX, FiCheck } from 'react-icons/fi';
import styles from './NewChatModal.module.scss';

interface UserProfile {
  userId: string;
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [groupName, setGroupName] = useState('');

  const { addChat, selectChat, chats } = useChatStore();

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setGroupName('');
      setError(null);
    }
  }, [isOpen]);

  // Search users with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      try {
        const response = await usersApi.searchUsers(searchQuery, { limit: 20 });
        const profiles = response.data.map(user => ({
          userId: user.id,
          profileId: user.profile.id,
          username: user.profile.username,
          displayName: user.profile.displayName,
          avatarUrl: user.profile.avatarUrl,
        }));
        setSearchResults(profiles);
      } catch (err) {
        console.error('Search failed:', err);
        setError('Failed to search users');
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const toggleUserSelection = (user: UserProfile) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.userId === user.userId);
      if (isSelected) {
        return prev.filter((u) => u.userId !== user.userId);
      }
      return [...prev, user];
    });
  };

  const isUserSelected = (userId: string) => {
    return selectedUsers.some((u) => u.userId === userId);
  };

  const handleCreateChat = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      let newChat;

      if (selectedUsers.length === 1) {
        // Create private chat - check if one already exists
        const firstUser = selectedUsers[0];
        if (!firstUser) {
          setError('Invalid user selection');
          return;
        }

        // Check if a private chat already exists with this user
        const existingChat = chats.find(
          chat =>
            chat.type === 'PRIVATE' &&
            chat.participants.some(p => p.profile.userId === firstUser.userId)
        );

        if (existingChat) {
          // Navigate to existing chat instead of creating a new one
          selectChat(existingChat.id);
          router.push(ROUTES.APP.MESSAGES);
          onClose();
          return;
        }

        newChat = await chatsAPI.createPrivateChat(firstUser.userId);
      } else {
        // Create group chat
        if (!groupName.trim()) {
          setError('Please enter a group name');
          setIsCreating(false);
          return;
        }
        const userIds = selectedUsers.map((u) => u.userId);
        newChat = await chatsAPI.createGroupChat(groupName, userIds);
      }

      addChat(newChat);
      selectChat(newChat.id);
      router.push(ROUTES.APP.MESSAGES);
      onClose();
    } catch (err: unknown) {
      console.error('Failed to create chat:', err);
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to create chat');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  const showGroupNameInput = selectedUsers.length > 1;
  const canCreateChat = selectedUsers.length > 0 && (!showGroupNameInput || groupName.trim());

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>New Message</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.toSection}>
          <label className={styles.toLabel}>To:</label>
          <div className={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              autoFocus
            />
          </div>
        </div>

        {selectedUsers.length > 0 && (
          <div className={styles.selectedUsers}>
            {selectedUsers.map((user) => (
              <div key={user.userId} className={styles.selectedUserChip}>
                <span>{user.displayName || user.username}</span>
                <button
                  onClick={() => toggleUserSelection(user)}
                  className={styles.removeChip}
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {showGroupNameInput && (
          <div className={styles.groupNameInput}>
            <input
              type="text"
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className={styles.input}
            />
          </div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <div className={styles.resultsContainer}>
          {isSearching ? (
            <div className={styles.loadingState}>Searching...</div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div className={styles.emptyState}>No users found</div>
          ) : searchResults.length > 0 ? (
            <div className={styles.resultsList}>
              {searchResults.map((user) => (
                <button
                  key={user.userId}
                  className={styles.userItem}
                  onClick={() => toggleUserSelection(user)}
                  disabled={isCreating}
                >
                  <Avatar
                    avatarUrl={user.avatarUrl}
                    username={user.username}
                    size="md"
                    unoptimized
                  />
                  <div className={styles.userInfo}>
                    <span className={styles.username}>{user.username}</span>
                    {user.displayName && (
                      <span className={styles.displayName}>{user.displayName}</span>
                    )}
                  </div>
                  {isUserSelected(user.userId) && (
                    <span className={styles.checkIcon} aria-hidden>
                      <FiCheck size={20} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              Search for users to start a conversation
            </div>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className={styles.modalFooter}>
            <button
              className={styles.chatButton}
              onClick={handleCreateChat}
              disabled={isCreating || !canCreateChat}
            >
              {isCreating ? 'Creating...' : 'Chat'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
