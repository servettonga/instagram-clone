"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { NotificationsIcon, MoreMenuIcon, SettingsIcon, BookmarkSimpleIcon, ActivityIcon, LogoutIcon, InnogramLogoIcon } from '@/components/ui/icons';
import { useAuthStore } from '@/lib/store/authStore';
import { notificationsApi } from '@/lib/api/notifications';
import NotificationsModal from '@/components/modal/NotificationsModal';
import styles from './MobileHeader.module.scss';

interface MobileHeaderProps {
  variant: 'feed' | 'profile';
  title?: string;
}

export default function MobileHeader({ variant, title }: MobileHeaderProps) {
  const router = useRouter();
  const { logout, isAuthenticated } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Check for unread notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkUnread = async () => {
      try {
        const status = await notificationsApi.getUnreadStatus();
        setHasUnread(status.hasUnread);
      } catch (err) {
        console.error('Failed to check unread:', err);
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 30000);

    const handleChange = () => checkUnread();
    window.addEventListener('notifications:changed', handleChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications:changed', handleChange);
    };
  }, [isAuthenticated]);

  // Close more menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);

  const handleLogout = async () => {
    setShowMoreMenu(false);
    await logout();
    router.push('/');
  };

  if (variant === 'feed') {
    return (
      <>
        <header className={styles.mobileHeader}>
          <div className={styles.logoSection}>
            <InnogramLogoIcon />
          </div>
          <button
            className={styles.iconButton}
            onClick={() => setShowNotifications(true)}
            aria-label="Notifications"
          >
            <NotificationsIcon />
            {hasUnread && <span className={styles.unreadDot} />}
          </button>
        </header>

        <NotificationsModal
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
        />
      </>
    );
  }

  if (variant === 'profile') {
    return (
      <>
        <header className={styles.mobileHeader}>
          <div className={styles.titleSection}>
            <h1 className={styles.pageTitle}>{title || 'Profile'}</h1>
          </div>
          <div className={styles.moreSection} ref={moreMenuRef}>
            <button
              className={styles.iconButton}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              aria-label="More options"
            >
              <MoreMenuIcon />
            </button>

            {showMoreMenu && (
              <div className={styles.moreMenu}>
                <Link href="/app/settings/account" className={styles.menuItem} onClick={() => setShowMoreMenu(false)}>
                  <SettingsIcon />
                  <span>Settings</span>
                </Link>
                <Link href="/app/activity" className={styles.menuItem} onClick={() => setShowMoreMenu(false)}>
                  <ActivityIcon />
                  <span>Your activity</span>
                </Link>
                <Link href="/app/saved" className={styles.menuItem} onClick={() => setShowMoreMenu(false)}>
                  <BookmarkSimpleIcon />
                  <span>Saved</span>
                </Link>
                <button className={styles.menuItem} onClick={handleLogout}>
                  <LogoutIcon />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </header>
      </>
    );
  }

  return null;
}
