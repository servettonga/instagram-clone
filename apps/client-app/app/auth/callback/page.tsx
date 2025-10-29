// /auth/callback - OAuth callback handler

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';
import styles from './callback.module.scss';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from URL parameters
        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const errorParam = searchParams.get('error');

        // Check for error from OAuth provider
        if (errorParam) {
          setError(`OAuth error: ${errorParam}`);
          setIsProcessing(false);
          return;
        }

        if (!accessToken || !refreshToken) {
          setError('Missing authentication tokens. Please try logging in again.');
          setIsProcessing(false);
          return;
        }

        // Validate token format (JWT should have 3 parts separated by dots)
        if (accessToken.split('.').length !== 3 || refreshToken.split('.').length !== 3) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Invalid token format:', {
              accessToken: accessToken.substring(0, 20) + '...',
              refreshToken: refreshToken.substring(0, 20) + '...',
            });
          }
          setError('Invalid authentication tokens received. Please try again.');
          setIsProcessing(false);
          return;
        }

        // Store tokens in cookies
        const cookieOptions = {
          expires: 7,
          sameSite: 'lax' as const,
          secure: false,
          path: '/',
        };

        Cookies.set('accessToken', accessToken, { ...cookieOptions, expires: 7 });
        Cookies.set('refreshToken', refreshToken, { ...cookieOptions, expires: 30 });

        // Add a small delay to ensure cookies are set before redirect
        await new Promise(resolve => setTimeout(resolve, 100));

        // Redirect to feed - the AuthProvider will fetch user data automatically
        router.push('/app/feed');
      } catch (err: any) {
        // Extract error message
        let errorMessage = 'Authentication failed. Please try logging in again.';

        if (err?.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err?.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.error('OAuth callback failed:', errorMessage);
        }

        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {isProcessing ? (
          <>
            <div className={styles.spinner}></div>
            <h2 className={styles.title}>Completing sign in...</h2>
            <p className={styles.subtitle}>Please wait while we authenticate your account.</p>
          </>
        ) : error ? (
          <>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.title}>Authentication Failed</h2>
            <p className={styles.errorText}>{error}</p>
            <button
              onClick={() => router.push('/auth/login')}
              className={styles.button}
            >
              Back to Login
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
