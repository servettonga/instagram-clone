// /auth/login

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import type { LoginCredentials, AuthResponse } from '@repo/shared-types';
import styles from './login.module.scss';

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
      router.push('/app/feed');
    } catch (error: any) {
      // Extract error message from axios error response
      let message = 'Login failed. Please try again.';
      
      // NestJS returns { statusCode, message, error }
      // - message: Descriptive error (e.g., "Invalid email or password")
      // - error: HTTP status text (e.g., "Unauthorized")
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.response?.data?.error) {
        message = error.response.data.error;
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
            <svg className={styles.oauthIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Sign up link */}
        <p className={styles.footer}>
          Don&apos;t have an account?
          <Link href="/auth/signup" className={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
