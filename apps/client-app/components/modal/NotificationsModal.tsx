'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CloseIcon, AvatarPlaceholderIcon } from '@/components/ui/icons';
import styles from './NotificationsModal.module.scss';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const NOTIFICATIONS = {
  yesterday: [
    { id: '1', username: 'roirin_femlivart2931ec', type: 'follow', time: '1d', avatarUrl: 'https://i.pravatar.cc/150?img=10' },
  ],
  thisWeek: [
    { id: '2', usernames: ['imkirtzxzxza', 'arus_xsoyal'], type: 'suggestion', time: '1d' },
    { id: '3', username: 'lorem_ipsum', followedBy: ['One_more_acc'], type: 'suggestion', time: '3d', avatarUrl: 'https://i.pravatar.cc/150?img=11' },
  ],
  earlier: [
    { id: '4', usernames: ['brainmemind', 'sarakbrl', 'yashwant_chandel_'], type: 'like', postImage: 'https://picsum.photos/seed/notif1/44/44', time: '7w' },
    { id: '5', usernames: ['brainmemind', 'hirdesh__10'], othersCount: 13, type: 'like', postImage: 'https://picsum.photos/seed/notif2/44/44', time: '7w' },
    { id: '6', usernames: ['brainmemind', 'mr_danish_sk_302_'], othersCount: 202, type: 'like', postImage: 'https://picsum.photos/seed/notif3/44/44', time: '7w' },
  ],
};

export default function NotificationsModal({ isOpen, onClose, isCollapsed = false }: NotificationsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

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

  if (!isOpen) return null;

  return (
    <div className={`${styles.modalOverlay} ${isCollapsed ? styles.modalOverlayCollapsed : ''}`}>
      <div className={styles.notificationsPanel} ref={modalRef}>
        <div className={styles.header}>
          <h2 className={styles.title}>Notifications</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <CloseIcon width={18} height={18} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Yesterday */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Yesterday</h3>
            {NOTIFICATIONS.yesterday.map((notif) => (
              <Link key={notif.id} href={`/app/profile/${notif.username}`} className={styles.notificationItem} onClick={onClose}>
                <Image
                  src={notif.avatarUrl!}
                  alt={notif.username}
                  width={44}
                  height={44}
                  className={styles.avatar}
                  unoptimized
                />
                <div className={styles.notifContent}>
                  <span className={styles.username}>{notif.username}</span>
                  <span className={styles.action}> started following you. </span>
                  <span className={styles.time}>{notif.time}</span>
                </div>
                <button className={styles.followButton} onClick={(e) => e.preventDefault()}>Follow</button>
              </Link>
            ))}
          </div>

          {/* This Week */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>This Week</h3>
            {NOTIFICATIONS.thisWeek.map((notif) => (
              <div key={notif.id} className={styles.notificationItem}>
                {notif.type === 'suggestion' && notif.avatarUrl && (
                  <Link href={`/app/profile/${notif.username}`} onClick={onClose}>
                    <Image
                      src={notif.avatarUrl}
                      alt={notif.username!}
                      width={44}
                      height={44}
                      className={styles.avatar}
                      unoptimized
                    />
                  </Link>
                )}
                {!notif.avatarUrl && (
                  <div className={styles.avatarPlaceholder}>
                    <AvatarPlaceholderIcon />
                  </div>
                )}
                <div className={styles.notifContent}>
                  {notif.username ? (
                    <>
                      <Link href={`/app/profile/${notif.username}`} className={styles.usernameLink} onClick={onClose}>
                        {notif.username}
                      </Link>
                      <span className={styles.action}> is on Instagram. </span>
                      {notif.followedBy && (
                        <>
                          <Link href={`/app/profile/${notif.followedBy[0]}`} className={styles.usernameLink} onClick={onClose}>
                            {notif.followedBy[0]}
                          </Link>
                          <span className={styles.action}> and 1 other follow them. </span>
                        </>
                      )}
                      <span className={styles.time}>{notif.time}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.action}>Follow </span>
                      {notif.usernames?.map((username, i) => (
                        <span key={username}>
                          <Link href={`/app/profile/${username}`} className={styles.usernameLink} onClick={onClose}>
                            {username}
                          </Link>
                          {i < notif.usernames!.length - 1 && ', '}
                        </span>
                      ))}
                      <span className={styles.action}> and others you know to see their photos and videos. </span>
                      <span className={styles.time}>{notif.time}</span>
                    </>
                  )}
                </div>
                {notif.username && <button className={styles.followButton} onClick={(e) => e.stopPropagation()}>Follow</button>}
              </div>
            ))}
          </div>

          {/* Earlier */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Earlier</h3>
            {NOTIFICATIONS.earlier.map((notif) => (
              <div key={notif.id} className={styles.notificationItem}>
                <div className={styles.multiAvatar}>
                  <div className={styles.avatarStack}>
                    <AvatarPlaceholderIcon />
                  </div>
                </div>
                <div className={styles.notifContent}>
                  {notif.usernames?.map((username, i) => (
                    <span key={username}>
                      <Link href={`/app/profile/${username}`} className={styles.usernameLink} onClick={onClose}>
                        {username}
                      </Link>
                      {i < notif.usernames!.length - 1 && ', '}
                    </span>
                  ))}
                  {notif.othersCount && (
                    <>
                      <span className={styles.action}> and </span>
                      <span className={styles.bold}>{notif.othersCount} others</span>
                    </>
                  )}
                  <span className={styles.action}> liked your reel. </span>
                  <span className={styles.time}>{notif.time}</span>
                </div>
                {notif.postImage && (
                  <Image
                    src={notif.postImage}
                    alt="Post"
                    width={44}
                    height={44}
                    className={styles.postThumbnail}
                    unoptimized
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
