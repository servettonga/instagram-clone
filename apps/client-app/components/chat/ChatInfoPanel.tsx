'use client';

import { useState } from 'react';
import type { Chat } from '@repo/shared-types';
import { useAuthStore } from '@/lib/store/authStore';
import { useChatStore } from '@/lib/store/chatStore';
import { chatsAPI } from '@/lib/api/chats';
import Avatar from '@/components/ui/Avatar';
import { FiX } from 'react-icons/fi';
import AddParticipantModal from './AddParticipantModal';
import styles from './ChatInfoPanel.module.scss';

interface ChatInfoPanelProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onChatUpdated: () => void;
}

export default function ChatInfoPanel({ chat, isOpen, onClose, onChatUpdated }: ChatInfoPanelProps) {
  const { user } = useAuthStore();
  const { isUserOnline, removeChat, updateChat } = useChatStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(chat.name);

  const profile = user?.profile;

  // Get other participant for private chats
  const otherParticipant = chat.type === 'PRIVATE'
    ? chat.participants.find((p) => p.profileId !== profile?.id)
    : null;

  const otherUser = otherParticipant?.profile;
  const isOnline = otherUser ? isUserOnline(otherUser.userId) : false;

  // Check if current user is admin in group chat
  const currentParticipant = chat.participants.find((p) => p.profileId === profile?.id);
  const isAdmin = currentParticipant?.role === 'ADMIN';

  const handleDeleteChat = async () => {
    try {
      await chatsAPI.deleteChat(chat.id);
      removeChat(chat.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete chat:', error);
      alert('Failed to delete chat. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveChat = async () => {
    try {
      await chatsAPI.leaveChat(chat.id);
      removeChat(chat.id);
      onClose();
    } catch (error) {
      console.error('Failed to leave chat:', error);
      alert('Failed to leave chat. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handleBlockUser = () => {
    // TODO: Implement block user
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName === chat.name) {
      setIsEditingName(false);
      setEditedName(chat.name);
      return;
    }

    try {
      const updatedChat = await chatsAPI.updateChat(chat.id, { name: editedName.trim() });
      updateChat(chat.id, { name: updatedChat.name });
      setIsEditingName(false);
      onChatUpdated();
    } catch (error) {
      console.error('Failed to update chat name:', error);
      alert('Failed to update chat name. Please try again.');
      setEditedName(chat.name);
      setIsEditingName(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedName(chat.name);
    setIsEditingName(false);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in Panel */}
      <div className={`${styles.panel} ${isOpen ? styles.panelOpen : ''}`}>
        {/* Header */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Details</h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.panelContent}>
          {chat.type === 'PRIVATE' && otherUser ? (
            <>
              {/* Private Chat Info */}
              <div className={styles.profileSection}>
                <Avatar
                  avatarUrl={otherUser.avatarUrl}
                  username={otherUser.username}
                  size="lg"
                  unoptimized
                />
                <h3 className={styles.profileName}>{otherUser.displayName}</h3>
                <a
                  href={`/app/profile/${otherUser.username}`}
                  className={styles.profileUsername}
                  onClick={(e) => {
                    e.preventDefault();
                    window.location.href = `/app/profile/${otherUser.username}`;
                  }}
                >
                  @{otherUser.username}
                </a>
                {isOnline && (
                  <span className={styles.onlineIndicator}>Online</span>
                )}
              </div>

              {/* Actions */}
              <div className={styles.actionsSection}>
                <button
                  className={`${styles.textActionButton} ${styles.textActionButtonDanger}`}
                  onClick={handleBlockUser}
                >
                  Block User
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Group Chat Info */}
              <div className={styles.groupSection}>
                <div className={styles.groupHeader}>
                  <Avatar
                    avatarUrl={null}
                    username={chat.name}
                    size="lg"
                    unoptimized
                  />
                  {isEditingName ? (
                    <div className={styles.editNameContainer}>
                      <input
                        type="text"
                        className={styles.nameInput}
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        autoFocus
                      />
                      <div className={styles.editNameButtons}>
                        <button className={styles.saveButton} onClick={handleSaveName}>
                          Save
                        </button>
                        <button className={styles.cancelButton} onClick={handleCancelEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.groupNameContainer}>
                      <h3 className={styles.groupName}>{chat.name}</h3>
                      {isAdmin && (
                        <button
                          className={styles.editNameButton}
                          onClick={() => setIsEditingName(true)}
                          aria-label="Edit chat name"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )}
                  <p className={styles.groupMemberCount}>
                    {chat.participants.length} members
                  </p>
                </div>

                {/* Members List */}
                <div className={styles.membersSection}>
                  <div className={styles.sectionHeader}>
                    <h4 className={styles.sectionTitle}>Members</h4>
                    {isAdmin && (
                      <button
                        className={styles.sectionActionButton}
                        onClick={() => setShowAddParticipant(true)}
                      >
                        Add participant
                      </button>
                    )}
                  </div>
                  <div className={styles.membersList}>
                    {chat.participants
                      .sort((a, b) => {
                        // Admins first
                        if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                        if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                        return 0;
                      })
                      .map((participant) => (
                      <div key={participant.id} className={styles.memberItem}>
                        <Avatar
                          avatarUrl={participant.profile.avatarUrl}
                          username={participant.profile.username}
                          size="sm"
                          unoptimized
                        />
                        <div className={styles.memberInfo}>
                          <a
                            href={`/app/profile/${participant.profile.username}`}
                            className={styles.memberName}
                            onClick={(e) => {
                              e.preventDefault();
                              window.location.href = `/app/profile/${participant.profile.username}`;
                            }}
                          >
                            {participant.profile.displayName}
                          </a>
                          <span className={styles.memberUsername}>
                            @{participant.profile.username}
                          </span>
                        </div>
                        {participant.role === 'ADMIN' && (
                          <span className={styles.adminBadge}>Admin</span>
                        )}
                        {isUserOnline(participant.profile.userId) && (
                          <span className={styles.onlineDot} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Delete/Leave Chat */}
          <div className={styles.dangerSection}>
            {!showDeleteConfirm ? (
              <button
                className={styles.dangerTextButton}
                onClick={() => setShowDeleteConfirm(true)}
              >
                {chat.type === 'PRIVATE' || isAdmin ? 'Delete Chat' : 'Leave Chat'}
              </button>
            ) : (
              <div className={styles.confirmDelete}>
                <p>
                  {chat.type === 'PRIVATE' || isAdmin
                    ? 'Are you sure you want to delete this chat?'
                    : 'Are you sure you want to leave this chat?'}
                </p>
                <div className={styles.confirmButtons}>
                  <button
                    className={styles.confirmButton}
                    onClick={chat.type === 'PRIVATE' || isAdmin ? handleDeleteChat : handleLeaveChat}
                  >
                    {chat.type === 'PRIVATE' || isAdmin ? 'Delete' : 'Leave'}
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Participant Modal */}
      <AddParticipantModal
        isOpen={showAddParticipant}
        onClose={() => setShowAddParticipant(false)}
        chatId={chat.id}
        existingParticipantIds={chat.participants.map((p) => p.profile.userId)}
        onParticipantAdded={onChatUpdated}
      />
    </>
  );
}
