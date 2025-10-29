// Feed tabs component (For you / Following)

import styles from './FeedTabs.module.scss';

interface FeedTabsProps {
  activeTab: 'for-you' | 'following';
  onTabChange: (tab: 'for-you' | 'following') => void;
}

export default function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div className={styles.feedTabs}>
      <button
        className={`${styles.feedTab} ${activeTab === 'for-you' ? styles.feedTabActive : ''}`}
        onClick={() => onTabChange('for-you')}
      >
        For you
      </button>
      <button
        className={`${styles.feedTab} ${activeTab === 'following' ? styles.feedTabActive : ''}`}
        onClick={() => onTabChange('following')}
      >
        Following
      </button>
    </div>
  );
}
