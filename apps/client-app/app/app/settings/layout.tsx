// /app/settings/layout

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './settings.module.scss';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/app/settings/account', label: 'Edit profile' },
    { href: '/app/settings/password', label: 'Change password' },
    { href: '/app/settings/privacy', label: 'Account & Privacy' },
    { href: '/app/settings/notifications', label: 'Notifications' },
  ];

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsLayout}>
        {/* Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            <h2 className={styles.settingsTitle}>Settings</h2>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${
                  pathname === item.href ? styles.navItemActive : ''
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={styles.mainContent}>
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}
