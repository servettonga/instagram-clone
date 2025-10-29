// Reusable Footer component for profile and other pages

import Link from 'next/link';
import { ChevronDownIcon } from '@/components/ui/icons';
import styles from './Footer.module.scss';

interface FooterProps {
  variant?: 'default' | 'sidebar';
}

export default function Footer({ variant = 'default' }: FooterProps) {
  if (variant === 'sidebar') {
    return (
      <footer className={styles.sidebarFooter}>
        <div className={styles.sidebarFooterLinks}>
          About · Help · Privacy · Terms · Zeta Verified
        </div>
        <div className={styles.copyright}>
          © 2025 INNOGRAM FROM ZETA
        </div>
      </footer>
    );
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.footerLinks}>
        <span>About</span>
        <span>Help</span>
        <span>Privacy</span>
        <span>Terms</span>
        <span>Top Accounts</span>
      </div>
      <div className={styles.copyright}>
        <div className={styles.languageSelect}>
          <span>English</span>
          <ChevronDownIcon />
        </div>
        <span className={styles.copyrightText}>© 2025 INNOGRAM FROM ZETA</span>
      </div>
    </footer>
  );
}
