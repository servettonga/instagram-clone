'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './SearchModal.module.css';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
}

const RECENT_SEARCHES = [
  { username: 'ted', displayName: 'TED Talks', avatarUrl: 'https://i.pravatar.cc/150?img=1', isVerified: true },
  { username: 'voxdotcom', displayName: 'Vox', avatarUrl: 'https://i.pravatar.cc/150?img=2', isVerified: true },
  { username: 'mkbhd', displayName: 'Marques Brownlee', avatarUrl: 'https://i.pravatar.cc/150?img=3', isVerified: true, following: true },
  { username: 'veritasium', displayName: 'Veritasium', avatarUrl: 'https://i.pravatar.cc/150?img=4', isVerified: true, following: true },
  { username: 'lewishamilton', displayName: 'Lewis Hamilton', avatarUrl: 'https://i.pravatar.cc/150?img=5', isVerified: true, following: true },
  { username: 'openaidalle', displayName: 'DALL·E by OpenAI', avatarUrl: 'https://i.pravatar.cc/150?img=6', isVerified: true, following: true },
];

export default function SearchModal({ isOpen, onClose, isCollapsed = false }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on click outside - including the button that opened it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is outside modal
      if (modalRef.current && !modalRef.current.contains(target)) {
        // Check if click is on the Search button (to allow toggle)
        const isSearchButton = target.closest('button[data-search-button]');
        if (!isSearchButton) {
          onClose();
        }
      }
    };

    if (isOpen) {
      // Add a small delay to prevent immediate closing when opening
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  // Close on Escape key
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
      <div className={styles.searchPanel} ref={modalRef}>
        <div className={styles.searchHeader}>
          <h2 className={styles.title}>Search</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.searchInputWrapper}>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
          {searchQuery && (
            <button className={styles.clearInputButton} onClick={() => setSearchQuery('')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6m0-6 6 6" />
              </svg>
            </button>
          )}
        </div>

        <div className={styles.searchContent}>
          <div className={styles.recentHeader}>
            <span className={styles.recentTitle}>Recent</span>
            <button className={styles.clearAll}>Clear all</button>
          </div>

          <div className={styles.recentList}>
            {RECENT_SEARCHES.map((user) => (
              <div key={user.username} className={styles.userItem}>
                <div className={styles.userAvatar}>
                  <Image
                    src={user.avatarUrl}
                    alt={user.username}
                    width={44}
                    height={44}
                    className={styles.avatar}
                    unoptimized
                  />
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.usernameRow}>
                    <span className={styles.username}>{user.username}</span>
                    {user.isVerified && (
                      <svg aria-label="Verified" className={styles.verifiedBadge} fill="rgb(0, 149, 246)" height="12" role="img" viewBox="0 0 40 40" width="12">
                        <title>Verified</title>
                        <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z" fillRule="evenodd"></path>
                      </svg>
                    )}
                  </div>
                  <span className={styles.displayName}>
                    {user.displayName}
                    {user.following && ' • Following'}
                  </span>
                </div>
                <button className={styles.removeButton}>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14.262 2.73804L8.50002 8.50004L2.73535 14.2647" stroke="#8E8E8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14.2661 14.266L2.73608 2.73596" stroke="#8E8E8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
