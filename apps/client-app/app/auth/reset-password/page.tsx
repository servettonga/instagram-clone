'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { ROUTES } from '@/lib/routes';
import styles from '../login/login.module.scss';

interface ResetPasswordForm {
  newPassword: string;
  confirmPassword: string;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>();

  const [serverError, setServerError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  // Watch password field for confirmation validation
  const newPassword = watch('newPassword');

  useEffect(() => {
    if (!token) {
      setServerError('Invalid or missing reset token');
    }
  }, [token]);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setServerError('Invalid or missing reset token');
      return;
    }

    try {
      setServerError('');

      await authApi.resetPassword(token, data.newPassword);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push(ROUTES.AUTH.LOGIN);
      }, 3000);
    } catch (error: unknown) {
      const errResponse = error as { response?: { data?: { message?: string; error?: string } } };

      let message = 'Failed to reset password. Please try again.';

      if (errResponse?.response?.data?.message) {
        message = errResponse.response.data.message;
      } else if (errResponse?.response?.data?.error) {
        message = errResponse.response.data.error;
      } else if (error instanceof Error) {
        message = error.message;
      }

      if (process.env.NODE_ENV === 'development') {
        console.error('Reset password failed:', message);
      }

      setServerError(message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Set New Password</h1>
        <p className={styles.subtitle}>
          Enter your new password below
        </p>

        {serverError && (
          <div className={styles.errorBanner}>
            {serverError}
          </div>
        )}

        {success ? (
          <div className={styles.successBanner}>
            <p>Password reset successful!</p>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              Redirecting to login page...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword" className={styles.label}>New Password</label>
              <input
                id="newPassword"
                type="password"
                className={`${styles.input} ${errors.newPassword ? styles.inputError : ''}`}
                placeholder="••••••••"
                {...register('newPassword', {
                  required: 'Password is required',
                  minLength: {
                    value: 6,
                    message: 'Password must be at least 6 characters',
                  },
                })}
              />
              {errors.newPassword && (
                <span className={styles.errorText}>{errors.newPassword.message}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
                placeholder="••••••••"
                {...register('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === newPassword || 'Passwords do not match',
                })}
              />
              {errors.confirmPassword && (
                <span className={styles.errorText}>{errors.confirmPassword.message}</span>
              )}
            </div>

            <button type='submit' className={styles.submitButton} disabled={isSubmitting || !token}>
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        <p className={styles.footer}>
          Remember your password?
          <Link href={ROUTES.AUTH.LOGIN} className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
