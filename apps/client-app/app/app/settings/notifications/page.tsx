// /settings/notifications

'use client';

import { useState, useEffect } from 'react';
import { notificationsApi, NotificationPreferences } from '@/lib/api/notifications';
import styles from './notifications.module.scss';

export default function NotificationsSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const data = await notificationsApi.getPreferences();
      setPreferences(data);
    } catch (error) {
      console.error('Failed to load preferences:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load notification preferences' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (field: keyof Omit<NotificationPreferences, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [field]: !preferences[field],
    });
    // Clear message when user makes changes
    if (saveMessage) setSaveMessage(null);
  };

  const handleSave = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const updated = await notificationsApi.updatePreferences({
        followWeb: preferences.followWeb,
        likeWeb: preferences.likeWeb,
        commentWeb: preferences.commentWeb,
        replyWeb: preferences.replyWeb,
        mentionWeb: preferences.mentionWeb,
        followEmail: preferences.followEmail,
        likeEmail: preferences.likeEmail,
        commentEmail: preferences.commentEmail,
        replyEmail: preferences.replyEmail,
        mentionEmail: preferences.mentionEmail,
      });
      setPreferences(updated);
      setSaveMessage({ type: 'success', text: 'Notification preferences updated successfully!' });
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update preferences. Please try again.';
      setSaveMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Loading notification preferences...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className={styles.errorContainer}>
        <p>Failed to load notification preferences</p>
      </div>
    );
  }

  const notificationTypes = [
    {
      id: 'follow',
      title: 'Follows',
      description: 'Someone follows you or accepts your follow request',
      webKey: 'followWeb' as const,
      emailKey: 'followEmail' as const,
    },
    {
      id: 'like',
      title: 'Likes',
      description: 'Someone likes your post or comment',
      webKey: 'likeWeb' as const,
      emailKey: 'likeEmail' as const,
    },
    {
      id: 'comment',
      title: 'Comments',
      description: 'Someone comments on your post',
      webKey: 'commentWeb' as const,
      emailKey: 'commentEmail' as const,
    },
    {
      id: 'reply',
      title: 'Replies',
      description: 'Someone replies to your comment',
      webKey: 'replyWeb' as const,
      emailKey: 'replyEmail' as const,
    },
    {
      id: 'mention',
      title: 'Mentions',
      description: 'Someone mentions you in a post or comment',
      webKey: 'mentionWeb' as const,
      emailKey: 'mentionEmail' as const,
    },
  ];

  return (
    <div className={styles.notificationsPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Notification Settings</h1>
        <p className={styles.pageDescription}>
          Choose how you want to be notified about activity on your account.
        </p>
      </div>

      {/* Notifications Table */}
      <div className={styles.notificationsTable}>
        {/* Table Header */}
        <div className={styles.tableHeader}>
          <div className={styles.typeColumn}>Type</div>
          <div className={styles.channelColumn}>In-app</div>
          <div className={styles.channelColumn}>Email</div>
        </div>

        {/* Table Rows */}
        <div className={styles.tableBody}>
          {notificationTypes.map((type) => (
            <div key={type.id} className={styles.tableRow}>
              <div className={styles.typeColumn}>
                <div className={styles.typeTitle}>{type.title}</div>
                <div className={styles.typeDescription}>{type.description}</div>
              </div>
              <div className={styles.channelColumn}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences[type.webKey]}
                    onChange={() => handleToggle(type.webKey)}
                    className={styles.switchInput}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              <div className={styles.channelColumn}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={preferences[type.emailKey]}
                    onChange={() => handleToggle(type.emailKey)}
                    className={styles.switchInput}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.formActions}>
        <button
          onClick={handleSave}
          className={styles.saveButton}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
        {saveMessage && (
          <div className={`${styles.saveMessage} ${styles[saveMessage.type]}`}>
            {saveMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
