'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Image from 'next/image';
import Link from 'next/link';
import { CloseIcon } from '@/components/ui/icons';
import styles from './NotificationsModal.module.scss';
import { notificationsApi, type Notification } from '@/lib/api/notifications';
import { followAPI } from '@/lib/api/follow';
import { NotificationType } from '@repo/shared-types';
import { getTimeAgo } from '@/lib/utils/date';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

function groupNotifications(notifications: Notification[]): {
  today: Notification[];
  yesterday: Notification[];
  thisWeek: Notification[];
  earlier: Notification[];
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups = {
    today: [] as Notification[],
    yesterday: [] as Notification[],
    thisWeek: [] as Notification[],
    earlier: [] as Notification[],
  };

  notifications.forEach((notif) => {
    const notifDate = new Date(notif.createdAt);
    if (notifDate >= todayStart) {
      groups.today.push(notif);
    } else if (notifDate >= yesterdayStart) {
      groups.yesterday.push(notif);
    } else if (notifDate >= weekStart) {
      groups.thisWeek.push(notif);
    } else {
      groups.earlier.push(notif);
    }
  });

  return groups;
}

export default function NotificationsModal({ isOpen, onClose, isCollapsed = false }: NotificationsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Load notifications when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await notificationsApi.getNotifications(undefined, 50);
        setNotifications(response.notifications);
        // Dispatch event to update unread status in navbar after loading
        window.dispatchEvent(new CustomEvent('notifications:changed'));
      } catch (err) {
        console.error('Failed to load notifications:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (modalRef.current && !modalRef.current.contains(target)) {
        const isNotificationsButton = target.closest('button[data-notifications-button]');
        if (!isNotificationsButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Mark notification as read when clicked
  const handleNotificationClick = async (notificationId: string) => {
    try {
      await notificationsApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, isRead: true, readAt: new Date().toISOString() } : notif
        )
      );
      // Dispatch event to update unread status in navbar
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({
          ...notif,
          isRead: true,
          readAt: new Date().toISOString(),
        }))
      );
      // Dispatch event to update unread status in navbar
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Handle accepting a follow request
  const handleAcceptFollowRequest = async (notificationId: string, actorId: string) => {
    setProcessingRequest(notificationId);
    try {
      await followAPI.approveFollowRequest(actorId);
      // Remove notification from list after accepting
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      // Dispatch event to update follow counts
      window.dispatchEvent(new CustomEvent('follow:changed', { detail: { targetUserId: actorId, action: 'follow' } }));
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Failed to accept follow request:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  // Handle ignoring a follow request - just removes notification without rejecting the request
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleIgnoreFollowRequest = async (notificationId: string, _actorId: string) => {
    setProcessingRequest(notificationId);
    try {
      // Just mark as read and remove from UI - don't actually reject the request
      await notificationsApi.markAsRead(notificationId);
      // Remove notification from list after ignoring
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      window.dispatchEvent(new CustomEvent('notifications:changed'));
    } catch (err) {
      console.error('Failed to ignore follow request:', err);
    } finally {
      setProcessingRequest(null);
    }
  };

  if (!isOpen) return null;

  const grouped = groupNotifications(notifications);
  const hasUnread = notifications.some((n) => !n.isRead);

  const renderNotification = (notif: Notification) => {
    const actorUsername = notif.data?.actorUsername as string | undefined;
    const actorAvatar = notif.data?.actorAvatarUrl as string | undefined;
    const actorId = notif.data?.actorId as string | undefined;
    const entityType = notif.data?.entityType as string | undefined;
    const entityId = notif.data?.entityId as string | undefined;
    const metadataPostId = notif.data?.postId as string | undefined;
    const postImageUrl = notif.data?.postImageUrl as string | undefined;

    const time = getTimeAgo(notif.createdAt);
    const isFollowRequest = notif.type === NotificationType.FOLLOW_REQUEST;

    // Determine the link destination based on notification type
    let linkTo: string | undefined;

    // Check if notification is related to a post
    if (entityType === 'post' && entityId) {
      // For POST_LIKE, entityId is the postId
      linkTo = `/app/post/${entityId}`;
    } else if (metadataPostId) {
      // For POST_COMMENT, COMMENT_LIKE, and COMMENT_REPLY, postId is in metadata
      linkTo = `/app/post/${metadataPostId}`;
    }

    // Process message to make username bold
    let processedMessage = notif.message;
    if (actorUsername) {
      processedMessage = notif.message.replace(actorUsername, `<strong>${actorUsername}</strong>`);
    }

    // Avatar component - make it a link only if the notification itself is not already a link
    const avatarComponent = actorUsername && (
      <div onClick={(e) => {
        if (linkTo) {
          // If notification is wrapped in a link, prevent navigation and manually navigate to profile
          e.preventDefault();
          e.stopPropagation();
          onClose();
          window.location.href = `/app/profile/${actorUsername}`;
        }
      }}>
        {linkTo ? (
          <Avatar avatarUrl={actorAvatar} username={actorUsername} size="md" unoptimized />
        ) : (
          <Link
            href={`/app/profile/${actorUsername}`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            <Avatar avatarUrl={actorAvatar} username={actorUsername} size="md" unoptimized />
          </Link>
        )}
      </div>
    );

    const notificationContent = (
      <>
        {avatarComponent}
        <div className={styles.notifContent}>
          <span dangerouslySetInnerHTML={{ __html: processedMessage }} />
          <span className={styles.time}> {time}</span>
        </div>
        {/* Show Accept/Ignore buttons for follow requests */}
        {isFollowRequest && actorId && (
          <div className={styles.requestActions}>
            <button
              className={styles.acceptButton}
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptFollowRequest(notif.id, actorId);
              }}
              disabled={processingRequest === notif.id}
            >
              Accept
            </button>
            <button
              className={styles.ignoreButton}
              onClick={(e) => {
                e.stopPropagation();
                handleIgnoreFollowRequest(notif.id, actorId);
              }}
              disabled={processingRequest === notif.id}
            >
              Ignore
            </button>
          </div>
        )}
        {/* Show post thumbnail if available */}
        {postImageUrl && (
          <div className={styles.postThumbnail}>
            <Image
              src={postImageUrl}
              alt="Post"
              width={44}
              height={44}
              className={styles.thumbnailImage}
              unoptimized
            />
          </div>
        )}
      </>
    );

    // If there's a post link, wrap the entire notification
    if (linkTo) {
      return (
        <Link
          key={notif.id}
          href={linkTo}
          className={`${styles.notificationItem} ${!notif.isRead ? styles.unread : ''}`}
          onClick={() => {
            handleNotificationClick(notif.id);
            onClose();
          }}
        >
          {notificationContent}
        </Link>
      );
    }

    // Otherwise, make it clickable to just mark as read (but not for follow requests)
    return (
      <div
        key={notif.id}
        className={`${styles.notificationItem} ${!notif.isRead ? styles.unread : ''}`}
        onClick={() => !isFollowRequest && handleNotificationClick(notif.id)}
        style={{ cursor: isFollowRequest ? 'default' : 'pointer' }}
      >
        {notificationContent}
      </div>
    );
  };

  return (
    <div className={`${styles.modalOverlay} ${isCollapsed ? styles.modalOverlayCollapsed : ''}`}>
      <div className={styles.notificationsPanel} ref={modalRef}>
        <div className={styles.header}>
          <h2 className={styles.title}>Notifications</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasUnread && (
              <button
                className={styles.markAllRead}
                onClick={handleMarkAllAsRead}
                disabled={loading}
              >
                Mark all read
              </button>
            )}
            <button className={styles.closeButton} onClick={onClose}>
              <CloseIcon width={18} height={18} />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>Loading notifications...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-error)' }}>{error}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p>No notifications yet</p>
            </div>
          ) : (
            <>
              {/* Today */}
              {grouped.today.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Today</h3>
                  {grouped.today.map(renderNotification)}
                </div>
              )}

              {/* Yesterday */}
              {grouped.yesterday.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Yesterday</h3>
                  {grouped.yesterday.map(renderNotification)}
                </div>
              )}

              {/* This Week */}
              {grouped.thisWeek.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>This Week</h3>
                  {grouped.thisWeek.map(renderNotification)}
                </div>
              )}

              {/* Earlier */}
              {grouped.earlier.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Earlier</h3>
                  {grouped.earlier.map(renderNotification)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
