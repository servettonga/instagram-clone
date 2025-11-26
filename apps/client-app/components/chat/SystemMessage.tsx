// System message component for chat events
'use client';

import styles from './SystemMessage.module.scss';

interface SystemMessageProps {
  message: string;
  timestamp?: string;
}

export default function SystemMessage({ message, timestamp }: SystemMessageProps) {
  return (
    <div className={styles.systemMessage}>
      <div className={styles.messageContent}>
        <span className={styles.messageText}>{message}</span>
        {timestamp && (
          <span className={styles.timestamp}>
            {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  );
}
