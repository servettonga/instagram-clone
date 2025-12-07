"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, SearchIcon, CreateIcon, MessagesIcon } from '@/components/ui/icons';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/lib/store/authStore';
import styles from './MobileNavbar.module.scss';

export default function MobileNavbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const NAV_ITEMS = [
    { href: '/app/feed', icon: <HomeIcon />, label: 'Home' },
    { href: '/app/search', icon: <SearchIcon />, label: 'Search' },
    { href: '/app/create', icon: <CreateIcon />, label: 'Create' },
    { href: '/app/messages', icon: <MessagesIcon />, label: 'Messages' },
    {
      href: user?.profile ? `/app/profile/${user.profile.username}` : '/app/profile',
      icon: user?.profile ? (
        <Avatar avatarUrl={user.profile.avatarUrl ?? undefined} username={user.profile.username} size="sm" unoptimized />
      ) : (
        // Fallback: small avatar placeholder (component shows initials)
        <Avatar username="?" size="sm" />
      ),
      label: 'Profile',
    },
  ];
  return (
    <nav className={styles.mobileNavbar}>
      {NAV_ITEMS.map(item => (
        <Link key={item.href} href={item.href} className={pathname === item.href ? styles.active : ''}>
          {item.icon}
          <span className={styles.label}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
