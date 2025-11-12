'use client';

import { useEffect, useState, useRef } from 'react';
import { usersApi } from '@/lib/api/users';
import type { UserWithProfileAndAccount } from '@/types/auth';
import Avatar from './Avatar';
import styles from './MentionPicker.module.scss';

interface MentionPickerProps {
  searchQuery: string;
  position: { top: number; left: number };
  onSelect: (username: string) => void;
  onClose: () => void;
}

export default function MentionPicker({ searchQuery, position, onSelect, onClose }: MentionPickerProps) {
  const [users, setUsers] = useState<UserWithProfileAndAccount[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await usersApi.searchUsers(searchQuery, { limit: 5 });
        setUsers(response.data || []);
        setSelectedIndex(0);
      } catch (error) {
        console.error('Failed to search users:', error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchUsers, 200);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % users.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + users.length) % users.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (users[selectedIndex]?.profile) {
          onSelect(users[selectedIndex].profile.username);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [users, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (isLoading) {
    return (
      <div ref={pickerRef} className={styles.mentionPicker} style={{ top: position.top, left: position.left }}>
        <div className={styles.loading}>Searching...</div>
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div ref={pickerRef} className={styles.mentionPicker} style={{ top: position.top, left: position.left }}>
      {users.map((user, index) => {
        if (!user.profile) return null;

        return (
          <div
            key={user.id}
            className={`${styles.mentionItem} ${index === selectedIndex ? styles.selected : ''}`}
            onClick={() => onSelect(user.profile.username)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Avatar avatarUrl={user.profile.avatarUrl || undefined} username={user.profile.username} size="sm" unoptimized />
            <div className={styles.userInfo}>
              <span className={styles.username}>{user.profile.username}</span>
              <span className={styles.displayName}>· {user.profile.displayName}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
