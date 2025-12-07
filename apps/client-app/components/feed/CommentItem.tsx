'use client';

import { useState } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import UserHoverCard from '@/components/ui/UserHoverCard';
import { HeartIcon, MoreIcon } from '@/components/ui/icons';
import { MentionText } from '@/lib/utils/mentions';
import type { Comment } from '@repo/shared-types';
import styles from './CommentItem.module.scss';

interface CommentItemProps {
  comment: Comment;
  currentUserId?: string;
  isReply?: boolean;
  onReply?: (commentId: string) => void;
  onEdit?: (comment: Comment) => void;
  onDelete?: (commentId: string) => void;
  onToggleLike?: (commentId: string) => void;
  onToggleShowReplies?: (commentId: string) => void;
  showReplies?: boolean;
  replies?: Comment[];
  loadingReplies?: boolean;
  formatTimeAgo: (date: Date | string) => string;
  onCloseModal?: () => void;
}

export default function CommentItem({
  comment,
  currentUserId,
  isReply = false,
  onReply,
  onEdit,
  onDelete,
  onToggleLike,
  onToggleShowReplies,
  showReplies = false,
  replies = [],
  loadingReplies = false,
  formatTimeAgo,
  onCloseModal,
}: CommentItemProps) {
  const [editText, setEditText] = useState(comment.content);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const isOwner = currentUserId === comment.profileId || currentUserId === comment.profile.id;

  const handleEditClick = () => {
    setEditText(comment.content);
    setIsEditing(true);
    setShowMoreMenu(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !onEdit) return;
    setIsSaving(true);
    await onEdit({ ...comment, content: editText.trim() });
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleDeleteClick = () => {
    setShowMoreMenu(false);
    if (onDelete) onDelete(comment.id);
  };

  const containerClass = isReply ? styles.replyItem : styles.comment;

  return (
    <>
      <div className={containerClass}>
        <Link href={`/app/profile/${comment.profile.username}`} onClick={onCloseModal}>
          <Avatar
            avatarUrl={comment.profile.avatarUrl}
            username={comment.profile.username}
            size={isReply ? 'sm' : 'md'}
            unoptimized
          />
        </Link>
        <div className={styles.commentContent}>
          {isEditing ? (
            <div className={styles.commentEditContainer}>
              <textarea
                className={styles.commentEditInput}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder="Edit comment..."
                autoFocus
              />
              <div className={styles.commentEditButtons}>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  className={styles.saveButton}
                  onClick={handleSaveEdit}
                  disabled={!editText.trim() || isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={styles.commentText}>
                <UserHoverCard username={comment.profile.username} onNavigate={onCloseModal}>
                  <Link
                    href={`/app/profile/${comment.profile.username}`}
                    className={styles.commentUsernameLink}
                    onClick={onCloseModal}
                  >
                    {comment.profile.username}
                  </Link>
                </UserHoverCard>{' '}
                <MentionText text={comment.content} />
              </div>
              <div className={styles.commentMeta}>
                <span className={styles.timeAgo}>{formatTimeAgo(comment.createdAt)}</span>
                <span className={styles.likes}>
                  {comment._count?.likes || 0} like{(comment._count?.likes || 0) !== 1 ? 's' : ''}
                </span>
                {!isReply && onReply && (
                  <button className={styles.replyButton} onClick={() => onReply(comment.id)}>
                    Reply
                  </button>
                )}
                {!isReply && (comment._count?.replies ?? 0) > 0 && onToggleShowReplies && (
                  <button className={styles.showRepliesButton} onClick={() => onToggleShowReplies(comment.id)}>
                    {showReplies ? 'Hide' : 'Show'} {comment._count?.replies}{' '}
                    {(comment._count?.replies ?? 0) === 1 ? 'reply' : 'replies'}
                  </button>
                )}
                <div className={styles.moreMenuWrapper}>
                  <button
                    className={styles.moreMenuButton}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMoreMenu(!showMoreMenu);
                    }}
                  >
                    <MoreIcon width={16} height={16} />
                  </button>
                  {showMoreMenu && (
                    <div className={styles.commentMoreMenu}>
                      {isOwner ? (
                        <>
                          <button
                            className={styles.commentMenuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick();
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className={styles.commentMenuItem}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick();
                            }}
                            style={{ color: 'var(--color-error)' }}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <button className={styles.commentMenuItem}>Flag</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        {!isEditing && onToggleLike && (
          <button className={styles.likeButton} onClick={() => onToggleLike(comment.id)}>
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <HeartIcon
                  width={13}
                  height={13}
                  filled={comment.isLikedByUser}
                  fill={comment.isLikedByUser ? 'var(--color-error)' : 'currentColor'}
                />
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Replies */}
      {!isReply && showReplies && (
        <>
          {loadingReplies && <div className={styles.repliesLoading}>Loading replies...</div>}
          {replies.length > 0 && (
            <div className={styles.repliesContainer}>
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId}
                  isReply={true}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onToggleLike={onToggleLike}
                  formatTimeAgo={formatTimeAgo}
                  onCloseModal={onCloseModal}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
