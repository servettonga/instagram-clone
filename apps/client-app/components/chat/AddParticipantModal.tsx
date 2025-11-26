'use client';

import { useState, useEffect } from 'react';
import { usersApi } from '@/lib/api/users';
import { chatsAPI } from '@/lib/api/chats';
import Avatar from '@/components/ui/Avatar';
import { FiX } from 'react-icons/fi';
import styles from './NewChatModal.module.scss';

interface UserProfile {
  userId: string;
  profileId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AddParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  existingParticipantIds: string[];
  onParticipantAdded: () => void;
}

export default function AddParticipantModal({
  isOpen,
  onClose,
  chatId,
  existingParticipantIds,
  onParticipantAdded,
}: AddParticipantModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
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
        const profiles = response.data
          .filter((user) => !existingParticipantIds.includes(user.id))
          .map((user) => ({
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
  }, [searchQuery, existingParticipantIds]);

  const handleAddUser = async (userId: string) => {
    setIsAdding(true);
    setError(null);
    try {
      await chatsAPI.addParticipant(chatId, userId);
      onParticipantAdded();
      onClose();
    } catch (err) {
      console.error('Failed to add participant:', err);
      setError('Failed to add participant. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Add Participant</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Search Input */}
        <div className={styles.toSection}>
          <div className={styles.searchInputWrapper}>
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              autoFocus
            />
          </div>
        </div>

        {/* Error Message */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Search Results */}
        <div className={styles.resultsContainer}>
          {isSearching ? (
            <p className={styles.loadingState}>Searching...</p>
          ) : searchResults.length > 0 ? (
            <div className={styles.resultsList}>
              {searchResults.map((user) => (
                <div key={user.userId} className={styles.userItemWrapper}>
                  <div className={styles.userItem}>
                    <Avatar
                      avatarUrl={user.avatarUrl}
                      username={user.username}
                      size="md"
                      unoptimized
                    />
                    <div className={styles.userInfo}>
                      <p className={styles.username}>
                        {user.displayName || user.username}
                      </p>
                      <p className={styles.displayName}>@{user.username}</p>
                    </div>
                  </div>
                  <button
                    className={styles.selectButton}
                    onClick={() => handleAddUser(user.userId)}
                    disabled={isAdding}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <p className={styles.emptyState}>No users found</p>
          ) : (
            <p className={styles.emptyState}>Search for users to add</p>
          )}
        </div>
      </div>
    </div>
  );
}
