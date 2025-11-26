// Typing indicator component
'use client';

import styles from './TypingIndicator.module.scss';

interface TypingUser {
  userId: string;
  username: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0]?.username || 'Someone'} is typing...`;
    } else if (users.length === 2) {
      return `${users[0]?.username || 'Someone'} and ${users[1]?.username || 'someone'} are typing...`;
    } else if (users.length === 3) {
      return `${users[0]?.username || 'Someone'}, ${users[1]?.username || 'someone'}, and ${users[2]?.username || 'someone'} are typing...`;
    } else {
      return `${users[0]?.username || 'Someone'}, ${users[1]?.username || 'someone'}, and ${users.length - 2} others are typing...`;
    }
  };

  return (
    <div className={styles.typingIndicator}>
      <span className={styles.typingText}>{getTypingText()}</span>
      <span className={styles.dots}>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
      </span>
    </div>
  );
}
