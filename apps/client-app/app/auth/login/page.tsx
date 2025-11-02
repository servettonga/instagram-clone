// /auth/login

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/routes';
import type { LoginCredentials, AuthResponse } from '@repo/shared-types';
import styles from './login.module.scss';
import { GoogleIcon } from '@/components/ui/icons';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  // Form state management with react-hook-form
  // Automatic validation, error handling
  const {
    register, // Connects input to form state
    handleSubmit, // Wraps onSubmit with validation
    formState: { errors, isSubmitting }, // Form status
  } = useForm<LoginCredentials>();

  // Error message from server (not validation errors)
  const [serverError, setServerError] = useState<string>('');

  // Handle form submission
  const onSubmit = async (data: LoginCredentials) => {
    try {
      setServerError(''); // Clear previous errors

      // Call API and get user data + tokens
      const response: AuthResponse = await authApi.login(data);

      // Update global auth state
      setUser(response.user);

      // Redirect to feed
      router.push(ROUTES.APP.FEED);
    } catch (error: unknown) {
      // Narrow the catch value to the expected axios-like shape without using `any`.
      const errResponse = error as { response?: { data?: { message?: string; error?: string } } };

      // Extract error message from axios error response
      let message = 'Login failed. Please try again.';

      // NestJS returns { statusCode, message, error }
      // - message: Descriptive error (e.g., "Invalid email or password")
      // - error: HTTP status text (e.g., "Unauthorized")
      if (errResponse?.response?.data?.message) {
        message = errResponse.response.data.message;
      } else if (errResponse?.response?.data?.error) {
        message = errResponse.response.data.error;
      } else if (error instanceof Error) {
        message = error.message;
      }

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Login failed:', message);
      }

      setServerError(message);
    }
  };

  // OAuth login handler
  const handleOAuthLogin = () => {
    // Full page redirect to backend OAuth endpoint
    // Backend handles OAuth flow and redirects back with tokens
    window.location.href = authApi.getGoogleAuthUrl();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Innogram</h1>
        <p className={styles.subtitle}>Sign in to continue to Innogram</p>

        {/* Server error banner */}
        {serverError && (
          <div className={styles.errorBanner}>
            {serverError}
          </div>
        )}

        {/* Login form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Email or Username input */}
          <div className={styles.formGroup}>
            <label htmlFor="identifier" className={styles.label}>Email or Username</label>
            <input id="identifier"
              type="text"
              className={`${styles.input} ${errors.identifier ? styles.inputError : ''}`}
              placeholder='Type your email or username'
              {...register('identifier', {
                required: 'Email or username is required',
              })}
            />
            {errors.identifier && (
              <span className={styles.errorText}>{errors.identifier.message}</span>
            )}
          </div>

          {/* Password input */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input id="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="••••••••"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters'
                },
              })}
            />
            {errors.password && (
              <span className={styles.errorText}>{errors.password.message}</span>
            )}
          </div>

          {/* Submit button */}
          <button type='submit' className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className={styles.divider}><span>or</span></div>

        {/* OAuth buttons */}
        <div className={styles.oauthButtons}>
          <button type='button' onClick={handleOAuthLogin} className={styles.oauthButton}>
            <GoogleIcon className={styles.oauthIcon} />
            Continue with Google
          </button>
        </div>

        {/* Sign up link */}
        <p className={styles.footer}>
          Don&apos;t have an account?
          <Link href={ROUTES.AUTH.SIGNUP} className={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
