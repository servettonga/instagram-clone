'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/authStore';
import SearchModal from '@/components/modal/SearchModal';
import NotificationsModal from '@/components/modal/NotificationsModal';
import CreatePostModal from '@/components/modal/CreatePostModal';
import styles from './layout.module.scss';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Check if sidebar should be collapsed
  const isNavbarCollapsed = showSearchModal || showNotificationsModal || pathname === '/app/messages';
  const isFeedCollapsed = pathname === '/app/messages';

  // Protect all /app routes - redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
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
    router.push('/auth/login');
  };

  return (
    <div className={styles.appContainer}>
      {/* Left Sidebar Navigation */}
      <aside className={`${styles.sidebar} ${isNavbarCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Logo */}
        <Link href="/app/feed" className={styles.logo}>
          {isNavbarCollapsed ? (
            <div className={styles.svgWrapper}>
              <div className={styles.svgWrapperInner}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#000000"><g fill="none" stroke="#000000" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></g></svg>
              </div>
            </div>
          ) : (
            'Innogram'
          )}
        </Link>

        {/* Navigation Links */}
        <nav className={styles.navLinks}>
          {/* Home */}
          <Link
            href="/app/feed"
            className={`${styles.navLink} ${pathname === '/app/feed' ? styles.navLinkActive : ''}`}
          >
            {pathname === '/app/feed' ? (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 23.0001H15.999C15.7338 23.0001 15.4794 22.8947 15.2919 22.7072C15.1044 22.5196 14.999 22.2653 14.999 22.0001V16.5451C15.0063 16.1469 14.9341 15.7514 14.7868 15.3814C14.6395 15.0115 14.4199 14.6747 14.141 14.3906C13.862 14.1064 13.5292 13.8808 13.162 13.7267C12.7949 13.5727 12.4007 13.4933 12.0025 13.4933C11.6043 13.4933 11.2101 13.5727 10.843 13.7267C10.4758 13.8808 10.143 14.1064 9.86403 14.3906C9.58506 14.6747 9.3655 15.0115 9.21818 15.3814C9.07086 15.7514 8.99873 16.1469 9.006 16.5451V22.0001C9.006 22.2653 8.90064 22.5196 8.71311 22.7072C8.52557 22.8947 8.27122 23.0001 8.006 23.0001H2C1.73478 23.0001 1.48043 22.8947 1.29289 22.7072C1.10536 22.5196 1 22.2653 1 22.0001V11.5431C1.00009 11.4077 1.02761 11.2738 1.08088 11.1493C1.13416 11.0249 1.2121 10.9125 1.31 10.8191L11.31 1.27605C11.4961 1.09899 11.7431 1.00024 12 1.00024C12.2569 1.00024 12.5039 1.09899 12.69 1.27605L22.69 10.8191C22.7879 10.9125 22.8658 11.0249 22.9191 11.1493C22.9724 11.2738 22.9999 11.4077 23 11.5431V22.0001C23 22.2653 22.8946 22.5196 22.7071 22.7072C22.5196 22.8947 22.2652 23.0001 22 23.0001Z" fill="#262626"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.505 17.045C9.505 16.2501 9.82075 15.4878 10.3828 14.9258C10.9448 14.3638 11.7071 14.048 12.502 14.048C12.8957 14.0479 13.2855 14.1253 13.6492 14.2758C14.0129 14.4264 14.3434 14.6471 14.6218 14.9254C14.9002 15.2038 15.1211 15.5342 15.2718 15.8979C15.4224 16.2615 15.5 16.6513 15.5 17.045V22.5H22.5V12.043L12.5 2.5L2.5 12.043V22.5H9.505V17.045Z" stroke="#262626" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            {!isNavbarCollapsed && <span>Home</span>}
          </Link>

          {/* Search */}
          <button
            data-search-button
            onClick={() => setShowSearchModal(!showSearchModal)}
            className={`${styles.navLink} ${showSearchModal ? styles.navLinkActive : ''}`}
          >
            {showSearchModal ? (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 11C19 12.5823 18.5308 14.129 17.6518 15.4446C16.7727 16.7602 15.5233 17.7855 14.0615 18.391C12.5997 18.9965 10.9911 19.155 9.43928 18.8463C7.88743 18.5376 6.46197 17.7757 5.34315 16.6569C4.22433 15.538 3.4624 14.1126 3.15372 12.5607C2.84504 11.0089 3.00347 9.40034 3.60897 7.93853C4.21447 6.47672 5.23985 5.22729 6.55544 4.34824C7.87103 3.46919 9.41775 3 11 3C13.1217 3 15.1566 3.84285 16.6569 5.34315C18.1571 6.84344 19 8.87827 19 11Z" stroke="#262626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.0112 17.011L22.1432 22.143" stroke="#262626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19.5 11C19.5 12.6811 19.0015 14.3245 18.0675 15.7223C17.1335 17.1202 15.806 18.2096 14.2528 18.853C12.6996 19.4963 10.9906 19.6647 9.34174 19.3367C7.6929 19.0087 6.17834 18.1992 4.9896 17.0104C3.80085 15.8217 2.9913 14.3071 2.66333 12.6583C2.33535 11.0094 2.50368 9.30036 3.14703 7.74719C3.79037 6.19402 4.87984 4.8665 6.27766 3.93251C7.67547 2.99852 9.31886 2.5 11 2.5C13.2543 2.5 15.4164 3.39553 17.0104 4.98959C18.6045 6.58365 19.5 8.74566 19.5 11Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17.011 17.011L22.5 22.5" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            {!isNavbarCollapsed && <span>Search</span>}
          </button>

          {/* Explore */}
          <Link
            href="/app/explore"
            className={`${styles.navLink} ${pathname === '/app/explore' ? styles.navLinkActive : ''}`}
          >
            {pathname === '/app/explore' ? (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#262626" xmlns="http://www.w3.org/2000/svg">
                    <path d="m13.173 13.164 1.491-3.829-3.83 1.49ZM12.001.5a11.5 11.5 0 1 0 11.5 11.5A11.513 11.513 0 0 0 12.001.5Zm5.35 7.443-2.478 6.369a1 1 0 0 1-.57.569l-6.36 2.47a1 1 0 0 1-1.294-1.294l2.48-6.369a1 1 0 0 1 .57-.569l6.359-2.47a1 1 0 0 1 1.294 1.294Z"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.4411 14.453L8.08105 16.924L10.5601 10.556L16.9201 8.08496L14.4411 14.453Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M10.5601 10.556L14.4491 14.445L8.08105 16.924L10.5601 10.556Z" fill="#262626"/>
                    <path d="M12.501 23.005C18.3 23.005 23.001 18.304 23.001 12.505C23.001 6.70602 18.3 2.005 12.501 2.005C6.70199 2.005 2.00098 6.70602 2.00098 12.505C2.00098 18.304 6.70199 23.005 12.501 23.005Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            {!isNavbarCollapsed && <span>Explore</span>}
          </Link>

          {/* Messages */}
          <Link
            href="/app/messages"
            className={`${styles.navLink} ${pathname === '/app/messages' ? styles.navLinkActive : ''}`}
          >
            {pathname === '/app/messages' ? (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5031 1.63103C11.087 1.57923 9.67512 1.81495 8.35267 2.32396C7.03022 2.83296 5.82465 3.6047 4.80874 4.59257C3.79283 5.58044 2.98767 6.76395 2.44186 8.07164C1.89605 9.37932 1.62092 10.7841 1.63308 12.201C1.6102 13.6654 1.90313 15.1175 2.49191 16.4585C3.0807 17.7995 3.95151 18.9979 5.04508 19.972L5.09908 21.752C5.10767 22.0252 5.18316 22.2921 5.31894 22.5293C5.45472 22.7664 5.64664 22.9667 5.87785 23.1124C6.10906 23.2581 6.3725 23.3449 6.64505 23.365C6.91761 23.3852 7.19094 23.3381 7.44108 23.228L9.37608 22.356C10.395 22.6344 11.4468 22.7743 12.5031 22.772C13.9191 22.8237 15.3309 22.5879 16.6533 22.0788C17.9757 21.5698 19.1812 20.798 20.1971 19.8102C21.213 18.8223 22.0182 17.6389 22.564 16.3313C23.1099 15.0236 23.3851 13.619 23.3731 12.202C23.3852 10.7851 23.1101 9.38032 22.5643 8.07264C22.0185 6.76495 21.2133 5.58144 20.1974 4.59357C19.1815 3.6057 17.9759 2.83396 16.6535 2.32496C15.331 1.81595 13.9192 1.57923 12.5031 1.63103ZM18.2891 10.632L15.7231 14.615C15.6068 14.7989 15.4538 14.9568 15.2736 15.0787C15.0934 15.2006 14.8899 15.2839 14.676 15.3234C14.462 15.3628 14.2422 15.3575 14.0304 15.3079C13.8185 15.2583 13.6193 15.1654 13.4451 15.035L10.9931 13.195C10.8835 13.1128 10.7502 13.0685 10.6132 13.0689C10.4763 13.0693 10.3432 13.1142 10.2341 13.197L7.67808 15.246C7.55547 15.341 7.40331 15.3897 7.24836 15.3835C7.09341 15.3773 6.9456 15.3167 6.83093 15.2123C6.71626 15.1079 6.64208 14.9664 6.62144 14.8127C6.6008 14.659 6.63502 14.503 6.71808 14.372L9.28308 10.39C9.39922 10.2062 9.55216 10.0483 9.73228 9.92641C9.9124 9.80452 10.1158 9.72123 10.3297 9.68178C10.5436 9.64233 10.7633 9.64758 10.975 9.69718C11.1868 9.74679 11.386 9.83969 11.5601 9.97003L14.0131 11.81C14.1226 11.8919 14.2558 11.9358 14.3926 11.9353C14.5293 11.9347 14.6622 11.8897 14.7711 11.807L17.3271 9.75703C17.4496 9.66139 17.602 9.61214 17.7574 9.61799C17.9127 9.62383 18.061 9.6844 18.176 9.78899C18.291 9.89358 18.3653 10.0355 18.3858 10.1895C18.4063 10.3436 18.3717 10.5 18.2881 10.631L18.2891 10.632Z" fill="#262626"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.5032 2.50098C13.8032 2.45924 15.0984 2.67924 16.3117 3.14792C17.525 3.61661 18.6318 4.3244 19.5661 5.22925C20.5005 6.13411 21.2435 7.21755 21.7508 8.41521C22.2582 9.61286 22.5197 10.9003 22.5197 12.201C22.5197 13.5017 22.2582 14.7891 21.7508 15.9868C21.2435 17.1844 20.5005 18.2679 19.5661 19.1727C18.6318 20.0776 17.525 20.7854 16.3117 21.254C15.0984 21.7227 13.8032 21.9427 12.5032 21.901C11.5253 21.9037 10.5515 21.7745 9.6082 21.517C9.43122 21.4687 9.24299 21.4828 9.0752 21.557L7.0912 22.433C6.97124 22.4857 6.84016 22.5082 6.70947 22.4985C6.57878 22.4888 6.45247 22.4472 6.34162 22.3773C6.23076 22.3074 6.13875 22.2114 6.07364 22.0977C6.00854 21.9839 5.97233 21.856 5.9682 21.725L5.9142 19.945C5.90969 19.8369 5.88346 19.7308 5.83708 19.633C5.79069 19.5353 5.72509 19.4478 5.6442 19.376C4.64037 18.4723 3.841 17.3649 3.2995 16.1275C2.75801 14.8902 2.48686 13.5515 2.5042 12.201C2.4966 10.8995 2.75234 9.60999 3.25603 8.40993C3.75972 7.20987 4.50096 6.1241 5.43515 5.21794C6.36934 4.31178 7.47717 3.60395 8.69201 3.13703C9.90685 2.67011 11.2026 2.45376 12.5032 2.50098Z" stroke="#262626" strokeWidth="1.739" strokeMiterlimit="10"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M18.2901 10.632C18.3736 10.5008 18.4081 10.3444 18.3875 10.1903C18.3668 10.0362 18.2923 9.89437 18.1772 9.78989C18.062 9.6854 17.9137 9.62499 17.7583 9.61933C17.6029 9.61368 17.4505 9.66314 17.3281 9.75897L14.7721 11.809C14.6631 11.8915 14.5302 11.9364 14.3934 11.9367C14.2567 11.9371 14.1235 11.8929 14.0141 11.811L11.5601 9.96998C11.386 9.83963 11.1868 9.74673 10.9751 9.69712C10.7633 9.64752 10.5436 9.64227 10.3297 9.68172C10.1158 9.72117 9.91242 9.80446 9.7323 9.92635C9.55218 10.0482 9.39924 10.2061 9.2831 10.39L6.7161 14.37C6.63181 14.501 6.59667 14.6576 6.61691 14.8121C6.63716 14.9666 6.71147 15.1089 6.82666 15.2138C6.94185 15.3187 7.09048 15.3793 7.24617 15.3851C7.40185 15.3908 7.55453 15.3411 7.6771 15.245L10.2331 13.196C10.3422 13.1132 10.4753 13.0682 10.6123 13.0678C10.7492 13.0675 10.8826 13.1118 10.9921 13.194L13.4441 15.034C13.6182 15.1645 13.8175 15.2575 14.0293 15.3072C14.2412 15.3569 14.4611 15.3622 14.6751 15.3228C14.8891 15.2833 15.0926 15.2 15.2728 15.078C15.453 14.956 15.606 14.798 15.7221 14.614L18.2901 10.632Z" fill="#262626"/>
                  </svg>
                </div>
              </div>
            )}
            {!isNavbarCollapsed && <span>Messages</span>}
          </Link>

          {/* Notifications */}
          <button
            data-notifications-button
            onClick={() => setShowNotificationsModal(!showNotificationsModal)}
            className={`${styles.navLink} ${showNotificationsModal ? styles.navLinkActive : ''}`}
          >
            {showNotificationsModal ? (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.8 2.05005C15.55 2.05005 13.85 2.95005 12.5 4.85005C11.15 3.00005 9.45 2.10005 7.2 2.10005C3.5 2.05005 0.5 5.30005 0.5 9.30005C0.5 12.95 3.2 15.3 5.8 17.55C6.1 17.8 6.45 18.1 6.75 18.4L7.9 19.4C10.1 21.35 11.2 22.35 11.7 22.65C11.95 22.8 12.25 22.9 12.5 22.9C12.75 22.9 13.05 22.8 13.3 22.65C13.8 22.35 14.7 21.55 17.2 19.25L18.2 18.35C18.55 18.0501 18.85 17.75 19.2 17.5C21.85 15.3 24.5 13 24.5 9.30005C24.5 5.30005 21.5 2.05005 17.8 2.05005Z" fill="#262626"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.4014 4.38835C18.7158 4.46101 19.9482 5.05025 20.8301 6.02765C21.712 7.00505 22.1718 8.29139 22.1094 9.60635C22.1094 12.6783 19.4574 14.5653 16.9124 16.8283C14.4004 19.0713 13.0474 20.2973 12.6094 20.5803C12.1324 20.2713 10.4664 18.7573 8.30636 16.8283C5.75036 14.5563 3.10936 12.6513 3.10936 9.60635C3.04692 8.29139 3.50675 7.00505 4.38862 6.02765C5.27049 5.05025 6.50293 4.46101 7.81736 4.38835C8.5455 4.36628 9.26692 4.53353 9.91107 4.87375C10.5552 5.21397 11.1001 5.71551 11.4924 6.32935C12.3324 7.50435 12.4724 8.09235 12.6124 8.09235C12.7524 8.09235 12.8904 7.50435 13.7224 6.32635C14.1124 5.70967 14.6575 5.20614 15.3031 4.86606C15.9487 4.52598 16.6722 4.36126 17.4014 4.38835ZM17.4014 2.38835C16.4933 2.35927 15.5904 2.53543 14.7598 2.9037C13.9293 3.27197 13.1925 3.82286 12.6044 4.51535C12.0167 3.82487 11.2815 3.27526 10.4529 2.9071C9.62434 2.53894 8.72364 2.36166 7.81736 2.38835C5.97223 2.4605 4.23074 3.26033 2.9737 4.61294C1.71666 5.96555 1.04635 7.76088 1.10936 9.60635C1.10936 13.2163 3.65936 15.4333 6.12436 17.5763C6.40736 17.8223 6.69336 18.0703 6.97736 18.3233L8.00436 19.2413C9.1244 20.3071 10.2986 21.3145 11.5224 22.2593C11.8461 22.469 12.2236 22.5805 12.6094 22.5805C12.9951 22.5805 13.3726 22.469 13.6964 22.2593C14.959 21.2856 16.1694 20.2458 17.3224 19.1443L18.2444 18.3203C18.5374 18.0603 18.8344 17.8013 19.1294 17.5463C21.4634 15.5213 24.1094 13.2263 24.1094 9.60635C24.1724 7.76088 23.5021 5.96555 22.245 4.61294C20.988 3.26033 19.2465 2.4605 17.4014 2.38835Z" fill="#262626"/>
                  </svg>
                </div>
              </div>
            )}
            {!isNavbarCollapsed && <span>Notifications</span>}
          </button>

          {/* Create */}
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className={styles.navLink}
          >
            {showCreateModal ? (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.003 5.54502L11.886 5.55102L11.774 5.57102C11.5741 5.61811 11.3935 5.72562 11.2568 5.87896C11.1201 6.03229 11.0339 6.224 11.01 6.42802L11.003 6.54502V11H6.544L6.428 11.007C6.2046 11.0331 5.99653 11.1338 5.8374 11.2928C5.67827 11.4517 5.57737 11.6597 5.551 11.883L5.545 12L5.552 12.117C5.57837 12.3404 5.67927 12.5483 5.8384 12.7073C5.99753 12.8662 6.2056 12.9669 6.429 12.993L6.545 13H11.002L11.003 17.454L11.01 17.57C11.0361 17.7934 11.1368 18.0015 11.2957 18.1606C11.4547 18.3198 11.6626 18.4207 11.886 18.447L12.003 18.454L12.12 18.447C12.3434 18.4207 12.5513 18.3198 12.7103 18.1606C12.8692 18.0015 12.9699 17.7934 12.996 17.57L13.003 17.454V13H17.455L17.571 12.993C17.7944 12.9669 18.0025 12.8662 18.1616 12.7073C18.3207 12.5483 18.4216 12.3404 18.448 12.117L18.455 12L18.448 11.883C18.4216 11.6597 18.3207 11.4517 18.1616 11.2928C18.0025 11.1338 17.7944 11.0331 17.571 11.007L17.455 11H13.002L13.003 6.54502L12.996 6.42802C12.9699 6.20463 12.8692 5.99656 12.7103 5.83742C12.5513 5.67829 12.3434 5.57739 12.12 5.55102L12.003 5.54502ZM8.552 0.999023H15.448C18.202 0.999023 19.733 1.57802 21.112 2.91102C22.367 4.20802 22.95 5.66902 22.997 8.21302L23 8.55002V15.448C23 18.203 22.422 19.734 21.088 21.112C19.79 22.367 18.329 22.95 15.786 22.997L15.448 23H8.552C5.798 23 4.267 22.421 2.888 21.088C1.633 19.791 1.049 18.33 1.003 15.786L1 15.45V8.55102C1 5.79702 1.579 4.26502 2.912 2.88702C4.21 1.63302 5.67 1.05002 8.214 1.00202L8.552 0.999023Z" fill="#262626"/>
                  </svg>
                </div>
              </div>
            ) : (
              <div className={styles.svgWrapper}>
                <div className={styles.svgWrapperInner}>
                  <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 12.5V15.95C2.5 18.799 3.198 19.955 4.106 20.894C5.046 21.803 6.204 22.502 9.052 22.502H15.948C18.796 22.502 19.954 21.802 20.894 20.894C21.802 19.955 22.5 18.8 22.5 15.95V9.052C22.5 6.203 21.802 5.046 20.894 4.107C19.954 3.2 18.796 2.5 15.948 2.5H9.052C6.204 2.5 5.046 3.199 4.106 4.107C3.198 5.047 2.5 6.203 2.5 9.052V12.5Z" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7.04492 12.501H17.9549" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12.5029 7.04504V17.955" stroke="#262626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )}
            {!isNavbarCollapsed && <span>Create</span>}
          </button>

          {/* Profile */}
          <Link
            href="/app/profile/me"
            className={`${styles.navLink} ${pathname.startsWith('/app/profile') ? styles.navLinkActive : ''}`}
          >
            {profile?.avatarUrl ? (
              <div className={`${styles.profileIcon} ${pathname.startsWith('/app/profile') ? styles.profileIconActive : ''}`}>
                <Image
                  src={profile.avatarUrl}
                  alt={profile.username}
                  width={24}
                  height={24}
                  className={styles.profileImage}
                />
              </div>
            ) : (
              <div className={`${styles.profileIcon} ${pathname.startsWith('/app/profile') ? styles.profileIconActive : ''}`}>
                {profile?.displayName?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            {!isNavbarCollapsed && <span>Profile</span>}
          </Link>
        </nav>

        <div className={styles.moreSection} ref={moreMenuRef}>
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={styles.navLink}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            {!isNavbarCollapsed && <span>More</span>}
          </button>

          {showMoreMenu && (
            <div className={styles.moreMenu}>
              <Link href="/app/settings/account" className={styles.moreMenuItem}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v6m0 6v6" />
                </svg>
                Settings
              </Link>
              <Link href="/app/saved" className={styles.moreMenuItem}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Saved
              </Link>
              <Link href="/app/activity" className={styles.moreMenuItem}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Your activity
              </Link>
              <div className={styles.menuDivider} />
              <button onClick={handleLogout} className={styles.moreMenuItem}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`${styles.mainContent} ${isFeedCollapsed ? styles.mainContentCollapsed : ''}`}>
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
      <CreatePostModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}
