'use client';

import { useState, useEffect, useCallback } from 'react';
import { commentsAPI } from '@/lib/api/comments';
import CommentItem from './CommentItem';
import ConfirmModal from '@/components/modal/ConfirmModal';
import type { Comment } from '@repo/shared-types';
import styles from './CommentsList.module.scss';

interface CommentsListProps {
  postId: string;
  currentUserId?: string;
  isOpen: boolean;
  formatTimeAgo: (date: Date | string) => string;
  onCloseModal?: () => void;
}

export default function CommentsList({
  postId,
  currentUserId,
  isOpen,
  formatTimeAgo,
  onCloseModal,
}: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const [replies, setReplies] = useState<Record<string, Comment[]>>({});
  const [loadingReplies, setLoadingReplies] = useState<Record<string, boolean>>({});
  const [showRepliesForComment, setShowRepliesForComment] = useState<Record<string, boolean>>({});

  const [replyingToCommentId, setReplyingToCommentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  const fetchRepliesForComment = useCallback(async (commentId: string) => {
    setLoadingReplies((prev) => {
      if (prev[commentId]) return prev;
      return { ...prev, [commentId]: true };
    });

    try {
      const response = await commentsAPI.getCommentReplies(commentId, 1, 50);
      if (response && response.comments) {
        // Sort replies by oldest first (ascending by createdAt)
        const sortedReplies = [...response.comments].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setReplies((prev) => ({ ...prev, [commentId]: sortedReplies }));
      } else {
        setReplies((prev) => ({ ...prev, [commentId]: [] }));
      }
    } catch (error) {
      console.error('Failed to fetch replies:', error);
      setReplies((prev) => ({ ...prev, [commentId]: [] }));
    } finally {
      setLoadingReplies((prev) => ({ ...prev, [commentId]: false }));
    }
  }, []);

  useEffect(() => {
    if (isOpen && postId) {
      const fetchComments = async () => {
        setIsLoadingComments(true);
        try {
          const response = await commentsAPI.getPostComments(postId, 1, 100);
          const rootComments = response.comments.filter((c) => !c.parentCommentId);
          // Sort by oldest first (ascending by createdAt)
          rootComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          setComments(rootComments);
        } catch (error) {
          console.error('Failed to fetch comments:', error);
        } finally {
          setIsLoadingComments(false);
        }
      };
      fetchComments();
    }
  }, [isOpen, postId]);

  const handleReply = (commentId: string) => {
    setReplyingToCommentId(commentId);
    setReplyText('');
  };

  const handleCancelReply = () => {
    setReplyingToCommentId(null);
    setReplyText('');
  };

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    try {
      await commentsAPI.createComment(postId, {
        content: replyText.trim(),
        parentCommentId,
      });
      setShowRepliesForComment((prev) => ({ ...prev, [parentCommentId]: true }));
      await fetchRepliesForComment(parentCommentId);
      setReplyText('');
      setReplyingToCommentId(null);
    } catch (error) {
      console.error('Failed to post reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleToggleShowReplies = (commentId: string) => {
    const isCurrentlyShown = showRepliesForComment[commentId];

    if (!isCurrentlyShown) {
      setShowRepliesForComment((prev) => ({ ...prev, [commentId]: true }));
      if (!replies[commentId]) {
        fetchRepliesForComment(commentId);
      }
    } else {
      setShowRepliesForComment((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleEdit = async (comment: Comment) => {
    try {
      const updated = await commentsAPI.updateComment(comment.id, { content: comment.content });

      if (comment.parentCommentId) {
        setReplies((prev) => ({
          ...prev,
          [comment.parentCommentId!]: prev[comment.parentCommentId!]?.map((r) =>
            r.id === updated.id ? updated : r
          ) || [],
        }));
      } else {
        setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = (commentId: string) => {
    setCommentToDelete(commentId);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!commentToDelete) return;

    try {
      await commentsAPI.deleteComment(commentToDelete);

      setComments((prev) => prev.filter((c) => c.id !== commentToDelete));
      Object.keys(replies).forEach((parentId) => {
        setReplies((prev) => ({
          ...prev,
          [parentId]: prev[parentId]?.filter((r) => r.id !== commentToDelete) || [],
        }));
      });

      setShowDeleteConfirm(false);
      setCommentToDelete(null);
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleToggleLike = async (commentId: string) => {
    try {
      const response = await commentsAPI.toggleLike(commentId);

      const updateLike = (comment: Comment): Comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            isLikedByUser: response.liked,
            _count: {
              replies: comment._count?.replies || 0,
              likes: response.likesCount,
            },
          };
        }
        return comment;
      };

      setComments((prev) => prev.map(updateLike));
      Object.keys(replies).forEach((parentId) => {
        setReplies((prev) => ({
          ...prev,
          [parentId]: prev[parentId]?.map(updateLike) || [],
        }));
      });
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  return (
    <>
      {isLoadingComments ? (
        <div className={styles.loadingComments}>Loading comments...</div>
      ) : (
        comments.map((comment) => {
          const isReplying = replyingToCommentId === comment.id;

          return (
            <div key={comment.id}>
              <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleLike={handleToggleLike}
                onToggleShowReplies={handleToggleShowReplies}
                showReplies={showRepliesForComment[comment.id]}
                replies={replies[comment.id]}
                loadingReplies={loadingReplies[comment.id]}
                formatTimeAgo={formatTimeAgo}
                onCloseModal={onCloseModal}
              />

              {isReplying && (
                <div className={styles.replyContainer}>
                  <input
                    type="text"
                    className={styles.replyInput}
                    placeholder="Add a reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitReply(comment.id);
                      }
                    }}
                    autoFocus
                    disabled={isSubmittingReply}
                  />
                  <div className={styles.replyButtons}>
                    <button
                      className={styles.cancelButton}
                      onClick={handleCancelReply}
                      disabled={isSubmittingReply}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.postButton}
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={!replyText.trim() || isSubmittingReply}
                    >
                      {isSubmittingReply ? 'Posting...' : 'Post'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Delete Comment?"
          message="Are you sure you want to delete this comment?"
          confirmLabel="Delete"
          onConfirm={handleConfirmDelete}
          danger={true}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setCommentToDelete(null);
          }}
        />
      )}
    </>
  );
}
