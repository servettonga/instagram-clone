'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { ROUTES } from '@/lib/routes';
import styles from '../login/login.module.scss';

interface ForgotPasswordForm {
  identifier: string;
}

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>();

  const [serverError, setServerError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (data: ForgotPasswordForm) => {
    try {
      setServerError('');
      setSuccess(false);

      await authApi.forgotPassword(data.identifier);
      setSuccess(true);
    } catch (error: unknown) {
      const errResponse = error as { response?: { data?: { message?: string; error?: string } } };

      let message = 'Failed to send reset email. Please try again.';

      if (errResponse?.response?.data?.message) {
        message = errResponse.response.data.message;
      } else if (errResponse?.response?.data?.error) {
        message = errResponse.response.data.error;
      } else if (error instanceof Error) {
        message = error.message;
      }

      setServerError(message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>
          Enter your email or username and we&apos;ll send you a link to reset your password.
        </p>

        {serverError && (
          <div className={styles.errorBanner}>
            {serverError}
          </div>
        )}

        {success ? (
          <div className={styles.successBanner}>
            <p>Password reset link has been sent!</p>
            <p style={{ marginTop: '8px', fontSize: '14px' }}>
              Check your email for the reset link.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="identifier" className={styles.label}>Email or Username</label>
              <input
                id="identifier"
                type="text"
                autoComplete="username"
                className={`${styles.input} ${errors.identifier ? styles.inputError : ''}`}
                placeholder="Type your email or username"
                {...register('identifier', {
                  required: 'Email or username is required',
                })}
              />
              {errors.identifier && (
                <span className={styles.errorText}>{errors.identifier.message}</span>
              )}
            </div>

            <button type='submit' className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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
