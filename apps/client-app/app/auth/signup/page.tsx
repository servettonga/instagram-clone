// /auth/signup

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/routes';
import type { SignupData } from '@repo/shared-types';
import styles from './signup.module.scss';
import { GoogleIcon } from '@/components/ui/icons';

export default function SignupPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);

  // Reach Hook Form for form validation
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupData & { confirmPassword: string; }>();

  const [serverError, setServerError] = useState<string>('');

  // Watch password field to compare with confirmPassword
  const password = watch('password');

  const onSubmit = async (data: SignupData & { confirmPassword: string; }) => {
    try {
      setServerError('');

  // Create a shallow copy and remove confirmPassword before sending to API
  const signupData = { ...(data as SignupData) } as SignupData;
  // delete the confirmPassword property safely
  // (use a typed assertion to satisfy TypeScript and avoid creating an unused binding)
  delete (signupData as unknown as Record<string, unknown>).confirmPassword;

      const response = await authApi.signup(signupData);
      setUser(response.user);

      // Redirect to settings to complete profile setup
      router.push(ROUTES.APP.SETTINGS.ACCOUNT);
    } catch (error: unknown) {
      // Narrow the catch value to the expected axios-like shape without using `any`.
      const errResponse = error as { response?: { data?: { message?: string; error?: string } } };

      // Extract error message (same logic as login page)
      let message = 'Signup failed. Please try again.';

      // NestJS returns { statusCode, message, error }
      if (errResponse?.response?.data?.message) {
        message = errResponse.response.data.message;
      } else if (errResponse?.response?.data?.error) {
        message = errResponse.response.data.error;
      } else if (error instanceof Error) {
        message = error.message;
      }

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Signup failed:', message);
      }

      setServerError(message);
    }
  };

  const handleOAuthSignup = () => {
    window.location.href = authApi.getGoogleAuthUrl();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Innogram</h1>
        <p className={styles.subtitle}>Sign up to see photos and videos from your friends.</p>

        {serverError && (
          <div className={styles.errorBanner}>
            {serverError}
          </div>
        )}

        {/* OAuth signup button */}
        <button
          type="button"
          onClick={handleOAuthSignup}
          className={styles.oauthButton}
        >
          <GoogleIcon className={styles.oauthIcon} />
          Continue with Google
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <span>OR</span>
        </div>

        {/* Signup form */}
        <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
          {/* Email */}
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
              placeholder="Email"
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
            />
            {errors.email && (
              <span className={styles.errorText}>{errors.email.message}</span>
            )}
          </div>

          {/* Username */}
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.label}>Username</label>
            <input
              id="username"
              type="text"
              className={`${styles.input} ${errors.username ? styles.inputError : ''}`}
              placeholder="Username"
              {...register('username', {
                required: 'Username is required',
                minLength: {
                  value: 3,
                  message: 'Username must be at least 3 characters',
                },
                maxLength: {
                  value: 30,
                  message: 'Username must be less than 30 characters',
                },
                pattern: {
                  value: /^[a-zA-Z0-9_.]+$/,
                  message: 'Username can only contain letters, numbers, dots, and underscores',
                },
              })}
            />
            {errors.username && (
              <span className={styles.errorText}>{errors.username.message}</span>
            )}
          </div>

          {/* Password */}
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
              placeholder="Password"
              {...register('password', {
                required: 'Password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
            />
            {errors.password && (
              <span className={styles.errorText}>{errors.password.message}</span>
            )}
          </div>

          {/* Confirm Password */}
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ''}`}
              placeholder="Confirm Password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
            />
            {errors.confirmPassword && (
              <span className={styles.errorText}>{errors.confirmPassword.message}</span>
            )}
          </div>

          {/* Terms notice */}
          <p className={styles.termsText}>
            By signing up, you agree to our Terms, Data Policy and Cookies Policy.
          </p>

          {/* Submit button */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing up...' : 'Sign up'}
          </button>
        </form>

        {/* Login link */}
        <p className={styles.footer}>
          Have an account?
          <Link href={ROUTES.AUTH.LOGIN} className={styles.link}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
