'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import {
  HomeIcon,
  SearchIcon,
  ExploreIcon,
  MessagesIcon,
  NotificationsIcon,
  CreateIcon,
  CameraIcon,
  SettingsIcon,
  LogoutIcon,
  BookmarkSimpleIcon,
  MoreMenuIcon,
  ActivityIcon,
} from "@/components/ui/icons";
import { useAuthStore } from "@/lib/store/authStore";
import { ROUTES } from "@/lib/routes";
import SearchModal from "@/components/modal/SearchModal";
import NotificationsModal from "@/components/modal/NotificationsModal";
import CreatePostModal from "@/components/modal/CreatePostModal";
import styles from "./layout.module.scss";
import { initFollowCacheInvalidation } from '@/lib/utils/profileCacheListener';

export default function AppLayout({ children }: { children: React.ReactNode; }) {
  const { isAuthenticated, isLoading, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Check if sidebar should be collapsed
  const isNavbarCollapsed =
    showSearchModal ||
    showNotificationsModal ||
    pathname === "/app/messages";
  const isFeedCollapsed = pathname === "/app/messages";

  // Protect all /app routes - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(ROUTES.AUTH.LOGIN);
    }
  }, [isAuthenticated, isLoading, router]);

  // Initialize follow cache invalidation listener
  useEffect(() => {
    const cleanup = initFollowCacheInvalidation();
    return cleanup;
  }, []);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMoreMenu]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Don't render if not authenticated (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  const profile = user?.profile;

  const handleLogout = async () => {
    await logout();
    router.push(ROUTES.AUTH.LOGIN);
  };

  return (
    <div className={styles.appContainer}>
      {/* Left Sidebar Navigation */}
      <aside
        className={`${styles.sidebar} ${isNavbarCollapsed ? styles.sidebarCollapsed : ""}`}
      >
        {/* Logo */}
        <Link href={ROUTES.APP.FEED} className={styles.logo}>
          {isNavbarCollapsed ? (
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <CameraIcon
                  width={24}
                  height={24}
                  className={styles.logoIcon}
                />
              </div>
            </div>
          ) : (
            "Innogram"
          )}
        </Link>

        {/* Navigation Links */}
        <nav className={styles.navLinks}>
          {/* Home */}
          <Link
            href={ROUTES.APP.FEED}
            className={`${styles.navLink} ${pathname === "/app/feed" ? styles.navLinkActive : ""}`}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <HomeIcon
                  width={pathname === "/app/feed" ? 24 : 25}
                  height={pathname === "/app/feed" ? 24 : 25}
                  filled={pathname === "/app/feed"}
                />
              </div>
            </div>
            {!isNavbarCollapsed && <span>Home</span>}
          </Link>

          {/* Search */}
          <button
            data-search-button
            onClick={() => setShowSearchModal(!showSearchModal)}
            className={`${styles.navLink} ${showSearchModal ? styles.navLinkActive : ""}`}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <SearchIcon
                  width={25}
                  height={25}
                  color={
                    showSearchModal
                      ? "var(--color-text)"
                      : "currentColor"
                  }
                />
              </div>
            </div>
            {!isNavbarCollapsed && <span>Search</span>}
          </button>

          {/* Explore */}
          <Link
            href={ROUTES.APP.EXPLORE}
            className={`${styles.navLink} ${pathname === "/app/explore" ? styles.navLinkActive : ""}`}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <ExploreIcon
                  width={
                    pathname === "/app/explore" ? 24 : 25
                  }
                  height={
                    pathname === "/app/explore" ? 24 : 25
                  }
                  filled={pathname === "/app/explore"}
                />
              </div>
            </div>
            {!isNavbarCollapsed && <span>Explore</span>}
          </Link>

          {/* Messages */}
          <Link
            href={ROUTES.APP.MESSAGES}
            className={`${styles.navLink} ${pathname === "/app/messages" ? styles.navLinkActive : ""}`}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <MessagesIcon
                  width={25}
                  height={25}
                  filled={pathname === "/app/messages"}
                />
              </div>
            </div>
            {!isNavbarCollapsed && <span>Messages</span>}
          </Link>

          {/* Notifications */}
          <button
            data-notifications-button
            onClick={() =>
              setShowNotificationsModal(!showNotificationsModal)
            }
            className={`${styles.navLink} ${showNotificationsModal ? styles.navLinkActive : ""}`}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <NotificationsIcon
                  width={25}
                  height={25}
                  filled={showNotificationsModal}
                />
              </div>
            </div>
            {!isNavbarCollapsed && <span>Notifications</span>}
          </button>

          {/* Create */}
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className={styles.navLink}
          >
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <CreateIcon
                  width={showCreateModal ? 24 : 25}
                  height={showCreateModal ? 24 : 25}
                  filled={showCreateModal}
                />
              </div>
            </div>
            {!isNavbarCollapsed && <span>Create</span>}
          </button>

          {/* Profile */}
          <Link
            href={ROUTES.APP.PROFILE.ME}
            className={`${styles.navLink} ${pathname.startsWith("/app/profile") ? styles.navLinkActive : ""}`}
          >
            <div
              className={`${styles.profileIcon} ${pathname.startsWith("/app/profile") ? styles.profileIconActive : ""}`}
            >
              <Avatar avatarUrl={profile?.avatarUrl} username={profile?.username} size="sm" />
            </div>
            {!isNavbarCollapsed && <span>Profile</span>}
          </Link>
        </nav>

        <div className={styles.moreSection} ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={styles.navLink}
          >
            <MoreMenuIcon
              width={24}
              height={24}
              className={styles.moreIcon}
            />
            {!isNavbarCollapsed && <span>More</span>}
          </button>

          {showMoreMenu && (
            <div className={styles.moreMenu}>
              <Link
                href={ROUTES.APP.SETTINGS.ACCOUNT}
                className={styles.moreMenuItem}
              >
                <SettingsIcon width={20} height={20} />
                Settings
              </Link>
              <Link
                href={ROUTES.APP.SAVED}
                className={styles.moreMenuItem}
              >
                <BookmarkSimpleIcon width={20} height={20} />
                Saved
              </Link>
              <Link
                href={ROUTES.APP.ACTIVITY}
                className={styles.moreMenuItem}
              >
                <ActivityIcon width={20} height={20} />
                Your activity
              </Link>
              <div className={styles.menuDivider} />
              <button
                onClick={handleLogout}
                className={styles.moreMenuItem}
              >
                <LogoutIcon width={20} height={20} />
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main
        className={`${styles.mainContent} ${isFeedCollapsed ? styles.mainContentCollapsed : ""}`}
      >
        {children}
      </main>

      {/* Modals */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        isCollapsed={isNavbarCollapsed}
      />
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        isCollapsed={isNavbarCollapsed}
      />
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
