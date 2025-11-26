'use client';

import { useState } from 'react';
import type { AccountOption } from '@repo/shared-types';
import styles from './AccountSelectorModal.module.scss';
import Avatar from '../ui/Avatar';

interface AccountSelectorModalProps {
  accounts: AccountOption[];
  onSelect: (userId: string) => void;
  onCancel: () => void;
}

export function AccountSelectorModal({
  accounts,
  onSelect,
  onCancel,
}: AccountSelectorModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>(
    accounts[0]?.userId || '',
  );

  const handleContinue = () => {
    if (selectedUserId) {
      onSelect(selectedUserId);
    }
  };

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Choose an account</h2>
          <p className={styles.subtitle}>
            Multiple accounts found with this email
          </p>
        </div>

        <div className={styles.accountList}>
          {accounts.map((account) => (
            <button
              key={account.userId}
              type="button"
              className={`${styles.accountItem} ${
                selectedUserId === account.userId ? styles.selected : ''
              }`}
              onClick={() => setSelectedUserId(account.userId)}
            >
              <div className={styles.accountAvatar}>
                <Avatar
                  avatarUrl={account.avatarUrl}
                  username={account.username}
                  size="lg"
                />
              </div>
              <div className={styles.accountInfo}>
                <div className={styles.displayName}>{account.displayName}</div>
                <div className={styles.username}>@{account.username}</div>
              </div>
              {selectedUserId === account.userId && (
                <div className={styles.checkmark}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.continueButton}
            onClick={handleContinue}
            disabled={!selectedUserId}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
