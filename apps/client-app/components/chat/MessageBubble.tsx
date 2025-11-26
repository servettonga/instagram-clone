// Message bubble component with edit/delete menu
'use client';

import { useState, useRef, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import MoreIcon from '@/components/ui/icons/MoreIcon';
import ConfirmModal from '@/components/modal/ConfirmModal';
import ImageViewerModal from '@/components/modal/ImageViewerModal';
import type { Message } from '@repo/shared-types';
import styles from './MessageBubble.module.scss';

type GroupPosition = 'single' | 'top' | 'middle' | 'bottom';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showSenderInfo?: boolean;
  showSenderLabel?: boolean;
  groupPosition: GroupPosition;
  showTimestamp: boolean;
  isGroupedWithNext: boolean;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
  currentUserId?: string;
}

export default function MessageBubble({
  message,
  isOwn,
  showSenderInfo = false,
  showSenderLabel = true,
  groupPosition,
  showTimestamp,
  isGroupedWithNext,
  onEdit,
  onDelete,
  currentUserId,
}: MessageBubbleProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [viewerImage, setViewerImage] = useState<{ url: string; alt: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = message.profile.id === currentUserId;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  // Auto-focus and select text when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setEditedContent(message.content);
    setShowMoreMenu(false);
  };

  const handleDeleteClick = () => {
    setShowMoreMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
    setShowDeleteConfirm(false);
  };

  const handleSaveEdit = () => {
    if (onEdit && editedContent.trim() && editedContent !== message.content) {
      onEdit(message.id, editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const senderName = message.profile.displayName || message.profile.username;
  const containerClasses = [
    styles.messageContainer,
    isOwn ? styles.messageContainerOwn : '',
  ]
    .filter(Boolean)
    .join(' ');

  const groupClassName: Record<GroupPosition, string> = {
    single: styles.messageBubbleSingle || '',
    top: styles.messageBubbleTop || '',
    middle: styles.messageBubbleMiddle || '',
    bottom: styles.messageBubbleBottom || '',
  };

  const bubbleClasses = [
    styles.messageBubble,
    groupClassName[groupPosition],
    isOwn ? styles.messageBubbleOwn : '',
  ]
    .filter(Boolean)
    .join(' ');

  const shouldRenderAvatarColumn = !isOwn;
  const shouldShowAvatar = !isOwn && showSenderInfo;

  const rowClasses = [
    styles.messageRow,
    isOwn ? styles.messageRowOwn : '',
    isGroupedWithNext ? styles.messageRowGrouped : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={rowClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {shouldRenderAvatarColumn && (
        <div
          className={`${styles.avatarColumn} ${
            shouldShowAvatar ? '' : styles.avatarColumnPlaceholder
          }`}
        >
          {shouldShowAvatar && (
            <Avatar
              avatarUrl={message.profile.avatarUrl}
              username={message.profile.username}
              size="sm"
              unoptimized
            />
          )}
        </div>
      )}

      <div className={containerClasses}>
        {!isOwn && showSenderInfo && showSenderLabel && (
          <div className={styles.senderLine}>
            <span className={styles.senderName}>{senderName}</span>
          </div>
        )}

        <div className={bubbleClasses}>
          {isEditing ? (
            <div className={styles.messageEditContainer}>
              <textarea
                ref={textareaRef}
                className={styles.messageEditInput}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={3}
              />
              <div className={styles.messageEditButtons}>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelEdit}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleSaveEdit}
                  disabled={!editedContent.trim()}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.messageContent}>{message.content}</div>
              {message.assets && message.assets.length > 0 && (
                <div className={styles.messageAssets}>
                  {message.assets.map((messageAsset) => (
                    <div key={messageAsset.id} className={styles.assetImage}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={messageAsset.asset.thumbnailPath || messageAsset.asset.filePath}
                        alt={messageAsset.asset.fileName}
                        className={styles.assetImg}
                        onClick={() => setViewerImage({
                          url: messageAsset.asset.filePath,
                          alt: messageAsset.asset.fileName,
                        })}
                      />
                    </div>
                  ))}
                </div>
              )}
              {message.isEdited && (
                <span className={styles.editedLabel}>Edited</span>
              )}
            </>
          )}

          {/* More menu - show on hover for owner */}
          {!isEditing && isOwner && isHovered && (
            <div className={styles.moreMenuWrapper} ref={menuRef}>
              <button
                className={styles.moreMenuButton}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMoreMenu(!showMoreMenu);
                }}
                type="button"
              >
                <MoreIcon width={16} height={16} />
              </button>
              {showMoreMenu && (
                <div className={styles.messageMoreMenu}>
                  <button
                    className={styles.messageMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditClick();
                    }}
                    type="button"
                  >
                    Edit
                  </button>
                  <button
                    className={styles.messageMenuItem}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteClick();
                    }}
                    style={{ color: 'var(--color-error)' }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showTimestamp && !isEditing && (
          <div className={styles.messageMeta}>
            <span className={styles.messageTime}>{formatTime(message.createdAt)}</span>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        danger
      />

      <ImageViewerModal
        isOpen={!!viewerImage}
        imageUrl={viewerImage?.url || ''}
        altText={viewerImage?.alt}
        onClose={() => setViewerImage(null)}
      />
    </div>
  );
}
