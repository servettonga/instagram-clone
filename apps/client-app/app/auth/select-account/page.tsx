'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AccountSelectorModal } from '@/components/auth/AccountSelectorModal';
import type { AccountOption } from '@repo/shared-types';
import { ROUTES } from '@/lib/routes';
import { authApi } from '@/lib/api/auth';
import { AUTH_MESSAGES } from '@/lib/constants/messages';
import styles from '../login/login.module.scss';

/**
 * OAuth Account Selection Page
 *
 * When a user logs in with OAuth (Google, GitHub, etc.) and multiple accounts
 * exist with the same email, they need to select which account to link the OAuth
 * provider to.
 */
function SelectAccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  const [accounts, setAccounts] = useState<AccountOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!sessionId) {
      setError(AUTH_MESSAGES.OAUTH.INVALID_SESSION);
      setIsLoading(false);
      return;
    }

    // Fetch account options from backend
    const fetchAccounts = async () => {
      try {
        const data = await authApi.getOAuthSession(sessionId);
        setAccounts(data.multipleAccounts);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching accounts:', err);
        setError(AUTH_MESSAGES.OAUTH.FETCH_ACCOUNTS_ERROR);
        setIsLoading(false);
      }
    };

    void fetchAccounts();
  }, [sessionId]);

  const handleSelect = async (userId: string) => {
    if (!sessionId) return;

    try {
      setIsLoading(true);

      // Link OAuth account to selected user
      const data = await authApi.linkOAuthAccount(sessionId, userId);

      // Redirect to callback with tokens
      router.push(
        `${ROUTES.AUTH.CALLBACK}?accessToken=${data.tokens.accessToken}&refreshToken=${data.tokens.refreshToken}`,
      );
    } catch (err) {
      console.error('Error linking account:', err);
      setError(AUTH_MESSAGES.OAUTH.LINK_ACCOUNT_ERROR);
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Redirect back to login
    router.push(ROUTES.AUTH.LOGIN);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.subtitle}>{AUTH_MESSAGES.OAUTH.LOADING}</p>
        </div>
      </div>
    );
  }

  if (error || !accounts) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>{AUTH_MESSAGES.GENERAL.ERROR_TITLE}</h1>
          <p className={styles.subtitle}>{error || AUTH_MESSAGES.OAUTH.FETCH_ACCOUNTS_ERROR}</p>
          <button
            onClick={handleCancel}
            className={styles.button}
          >
            {AUTH_MESSAGES.OAUTH.BACK_TO_LOGIN}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AccountSelectorModal
      accounts={accounts}
      onSelect={handleSelect}
      onCancel={handleCancel}
    />
  );
}

function SuspenseFallback() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <p className={styles.subtitle}>{AUTH_MESSAGES.OAUTH.LOADING}</p>
      </div>
    </div>
  );
}

export default function SelectAccountPage() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <SelectAccountContent />
    </Suspense>
  );
}
