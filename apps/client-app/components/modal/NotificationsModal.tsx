'use client';

import { useEffect, useRef, useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Image from 'next/image';
import Link from 'next/link';
import { CloseIcon } from '@/components/ui/icons';
import { normalizeImageUrl } from '@/lib/utils/image';
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

// Types that can be grouped by post
const GROUPABLE_TYPES = [
  NotificationType.POST_LIKE,
  NotificationType.POST_COMMENT,
  NotificationType.COMMENT_LIKE,
  NotificationType.COMMENT_REPLY,
];

interface GroupedNotification {
  id: string;
  type: NotificationType;
  notifications: Notification[];
  postId: string | null;
  postImageUrl: string | null;
  latestCreatedAt: string;
  isRead: boolean;
}

function groupNotificationsByPost(notifications: Notification[]): (Notification | GroupedNotification)[] {
  const result: (Notification | GroupedNotification)[] = [];
  const postGroups = new Map<string, Map<NotificationType, Notification[]>>();

  notifications.forEach((notif) => {
    // Get post ID from notification
    const entityType = notif.data?.entityType as string | undefined;
    const entityId = notif.data?.entityId as string | undefined;
    const metadataPostId = notif.data?.postId as string | undefined;

    let postId: string | null = null;
    if (entityType === 'post' && entityId) {
      postId = entityId;
    } else if (metadataPostId) {
      postId = metadataPostId;
    }

    // Check if this notification type can be grouped
    if (postId && GROUPABLE_TYPES.includes(notif.type)) {
      if (!postGroups.has(postId)) {
        postGroups.set(postId, new Map());
      }
      const typeMap = postGroups.get(postId)!;
      if (!typeMap.has(notif.type)) {
        typeMap.set(notif.type, []);
      }
      typeMap.get(notif.type)!.push(notif);
    } else {
      // Non-groupable notification, add as-is
      result.push(notif);
    }
  });

  // Convert groups to GroupedNotification objects
  postGroups.forEach((typeMap, postId) => {
    typeMap.forEach((notifs, type) => {
      if (notifs.length === 0) {
        // No notifications, skip
        return;
      }
      if (notifs.length === 1) {
        // Single notification, don't group
        result.push(notifs[0]!);
      } else {
        // Multiple notifications, create a group
        const latestNotif = notifs[0]!; // Already sorted by date, guaranteed to exist
        // Find postImageUrl from any notification in the group (some might not have it)
        const postImageUrl = notifs.find((n) => n.data?.postImageUrl)?.data?.postImageUrl as string | null;
        result.push({
          id: `group-${postId}-${type}`,
          type,
          notifications: notifs,
          postId,
          postImageUrl,
          latestCreatedAt: latestNotif.createdAt,
          isRead: notifs.every((n) => n.isRead),
        });
      }
    });
  });

  // Sort by latest created date
  result.sort((a, b) => {
    const dateA = 'latestCreatedAt' in a ? a.latestCreatedAt : a.createdAt;
    const dateB = 'latestCreatedAt' in b ? b.latestCreatedAt : b.createdAt;
    return new Date(dateB).getTime() - new Date(dateA).getTime();
  });

  return result;
}

function groupNotificationsByTime(items: (Notification | GroupedNotification)[]): {
  today: (Notification | GroupedNotification)[];
  yesterday: (Notification | GroupedNotification)[];
  thisWeek: (Notification | GroupedNotification)[];
  earlier: (Notification | GroupedNotification)[];
} {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups = {
    today: [] as (Notification | GroupedNotification)[],
    yesterday: [] as (Notification | GroupedNotification)[],
    thisWeek: [] as (Notification | GroupedNotification)[],
    earlier: [] as (Notification | GroupedNotification)[],
  };

  items.forEach((item) => {
    const dateStr = 'latestCreatedAt' in item ? item.latestCreatedAt : item.createdAt;
    const itemDate = new Date(dateStr);
    if (itemDate >= todayStart) {
      groups.today.push(item);
    } else if (itemDate >= yesterdayStart) {
      groups.yesterday.push(item);
    } else if (itemDate >= weekStart) {
      groups.thisWeek.push(item);
    } else {
      groups.earlier.push(item);
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

  const groupedByPost = groupNotificationsByPost(notifications);
  const grouped = groupNotificationsByTime(groupedByPost);
  const hasUnread = notifications.some((n) => !n.isRead);

  // Helper to generate grouped message like "x, y and 3 others liked your post"
  const generateGroupedMessage = (group: GroupedNotification): string => {
    const actors = group.notifications
      .map((n) => n.data?.actorUsername as string)
      .filter(Boolean);
    const uniqueActors = [...new Set(actors)];

    let actionText = '';
    switch (group.type) {
      case NotificationType.POST_LIKE:
        actionText = 'liked your post';
        break;
      case NotificationType.POST_COMMENT:
        actionText = 'commented on your post';
        break;
      case NotificationType.COMMENT_LIKE:
        actionText = 'liked your comment';
        break;
      case NotificationType.COMMENT_REPLY:
        actionText = 'replied to your comment';
        break;
      default:
        actionText = 'interacted with your post';
    }

    if (uniqueActors.length === 1) {
      return `<strong>${uniqueActors[0]}</strong> ${actionText}`;
    } else if (uniqueActors.length === 2) {
      return `<strong>${uniqueActors[0]}</strong> and <strong>${uniqueActors[1]}</strong> ${actionText}`;
    } else {
      const othersCount = uniqueActors.length - 1;
      return `<strong>${uniqueActors[0]}</strong> and ${othersCount} others ${actionText}`;
    }
  };

  const renderNotificationItem = (item: Notification | GroupedNotification) => {
    // Check if it's a grouped notification
    if ('notifications' in item) {
      return renderGroupedNotification(item);
    }
    return renderSingleNotification(item);
  };

  const renderGroupedNotification = (group: GroupedNotification) => {
    const latestNotif = group.notifications[0];
    if (!latestNotif) return null; // Safety check

    const actorAvatar = latestNotif.data?.actorAvatarUrl as string | undefined;
    const actorUsername = latestNotif.data?.actorUsername as string | undefined;
    const time = getTimeAgo(group.latestCreatedAt);
    const linkTo = group.postId ? `/app/post/${group.postId}` : undefined;

    const message = generateGroupedMessage(group);

    // For grouped notifications with multiple users, show max 2 stacked avatars
    const uniqueAvatars = [...new Map(
      group.notifications
        .filter((n) => n.data?.actorUsername)
        .map((n) => [n.data?.actorUsername, { username: n.data?.actorUsername as string, avatar: n.data?.actorAvatarUrl as string | undefined }])
    ).values()].slice(0, 2);

    const avatarComponent = (
      <div
        className={uniqueAvatars.length > 1 ? styles.stackedAvatars : styles.avatarWrapper}
        onClick={(e) => {
          if (linkTo && actorUsername) {
            e.preventDefault();
            e.stopPropagation();
            onClose();
            window.location.href = `/app/profile/${actorUsername}`;
          }
        }}
      >
        {uniqueAvatars.length > 1 ? (
          uniqueAvatars.map((actor, idx) => (
            <div key={actor.username} className={styles.stackedAvatar} style={{ zIndex: uniqueAvatars.length - idx }}>
              <Avatar avatarUrl={actor.avatar} username={actor.username} size="sm" unoptimized />
            </div>
          ))
        ) : (
          <Avatar avatarUrl={actorAvatar} username={actorUsername || ''} size="md" unoptimized />
        )}
      </div>
    );

    const notificationContent = (
      <>
        {avatarComponent}
        <div className={styles.notifContent}>
          <span dangerouslySetInnerHTML={{ __html: message }} />
          <span className={styles.time}> {time}</span>
        </div>
        {group.postImageUrl && (
          <div className={styles.postThumbnail}>
            <Image
              src={normalizeImageUrl(group.postImageUrl)}
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

    if (linkTo) {
      return (
        <Link
          key={group.id}
          href={linkTo}
          className={`${styles.notificationItem} ${!group.isRead ? styles.unread : ''}`}
          onClick={() => {
            // Mark all notifications in the group as read
            group.notifications.forEach((n) => {
              if (!n.isRead) handleNotificationClick(n.id);
            });
            onClose();
          }}
        >
          {notificationContent}
        </Link>
      );
    }

    return (
      <div key={group.id} className={`${styles.notificationItem} ${!group.isRead ? styles.unread : ''}`}>
        {notificationContent}
      </div>
    );
  };

  const renderSingleNotification = (notif: Notification) => {
    const actorUsername = notif.data?.actorUsername as string | undefined;
    const actorAvatar = notif.data?.actorAvatarUrl as string | undefined;
    const actorId = notif.data?.actorId as string | undefined;
    const entityType = notif.data?.entityType as string | undefined;
    const entityId = notif.data?.entityId as string | undefined;
    const metadataPostId = notif.data?.postId as string | undefined;
    const postImageUrl = notif.data?.postImageUrl as string | undefined;

    const time = getTimeAgo(notif.createdAt);
    const isFollowRequest = notif.type === NotificationType.FOLLOW_REQUEST;
    const isFollowAccepted = notif.type === NotificationType.FOLLOW_ACCEPTED;

    // Determine the link destination based on notification type
    let linkTo: string | undefined;

    // For follow accepted notifications, link to the user's profile
    if (isFollowAccepted && actorUsername) {
      linkTo = `/app/profile/${actorUsername}`;
    }
    // Check if notification is related to a post
    else if (entityType === 'post' && entityId) {
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
    // For follow accepted notifications, the whole item links to profile, so don't add separate profile link
    const avatarComponent = actorUsername && (
      <div onClick={(e) => {
        if (linkTo && !isFollowAccepted) {
          // If notification is wrapped in a link (to a post), prevent navigation and manually navigate to profile
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
              src={normalizeImageUrl(postImageUrl)}
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
                  {grouped.today.map(renderNotificationItem)}
                </div>
              )}

              {/* Yesterday */}
              {grouped.yesterday.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Yesterday</h3>
                  {grouped.yesterday.map(renderNotificationItem)}
                </div>
              )}

              {/* This Week */}
              {grouped.thisWeek.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>This Week</h3>
                  {grouped.thisWeek.map(renderNotificationItem)}
                </div>
              )}

              {/* Earlier */}
              {grouped.earlier.length > 0 && (
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Earlier</h3>
                  {grouped.earlier.map(renderNotificationItem)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
