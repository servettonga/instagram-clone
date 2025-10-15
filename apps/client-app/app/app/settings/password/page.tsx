// /app/settings/password - Change Password

'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
import { authApi } from '@/lib/api/auth';
import styles from './password.module.css';

export default function PasswordSettingsPage() {
  const { user, setUser } = useAuthStore();
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  // Check if user has a local account (can change password)
  const hasLocalAccount = user?.accounts?.some(
    (account) => account.provider === 'LOCAL'
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (submitMessage) setSubmitMessage(null);

    // Validate password on change
    if (name === 'newPassword') {
      validatePassword(value);
    }
  };

  const validatePassword = (password: string) => {
    const errors: string[] = [];
    if (password.length > 0 && password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password.length > 0 && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (password.length > 0 && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (password.length > 0 && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    setPasswordErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate passwords match
    if (formData.newPassword !== formData.confirmPassword) {
      setSubmitMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    // Validate password strength
    if (!validatePassword(formData.newPassword)) {
      setSubmitMessage({
        type: 'error',
        text: 'Password does not meet requirements',
      });
      return;
    }

    // For LOCAL accounts: check if new password is same as old
    if (hasLocalAccount && formData.oldPassword === formData.newPassword) {
      setSubmitMessage({
        type: 'error',
        text: 'New password must be different from current password',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      if (hasLocalAccount) {
        // Change existing password
        await authApi.changePassword(formData.oldPassword, formData.newPassword);
        setSubmitMessage({
          type: 'success',
          text: 'Password changed successfully!',
        });
      } else {
        // Set new password for OAuth user
        await authApi.setPassword(formData.newPassword);
        
        // Refresh user data to update accounts
        const updatedUser = await authApi.getCurrentUser();
        setUser(updatedUser);
        
        setSubmitMessage({
          type: 'success',
          text: 'Password set successfully! You can now login with email and password.',
        });
      }

      // Clear form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors([]);
    } catch (error) {
      // Error is displayed to user, no need to log
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message ||
        (hasLocalAccount
          ? 'Failed to change password. Please try again.'
          : 'Failed to set password. Please try again.');
      setSubmitMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.passwordForm}>
      {!hasLocalAccount && (
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            You signed in with OAuth (Google/GitHub). Set a password to enable email/password login.
          </p>
        </div>
      )}

      {hasLocalAccount && (
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Current Password</label>
          <div className={styles.formInputWrapper}>
            <input
              type="password"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleInputChange}
              className={styles.formInput}
              required
              autoComplete="current-password"
            />
          </div>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>New Password</label>
        <div className={styles.formInputWrapper}>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleInputChange}
            className={styles.formInput}
            required
            autoComplete="new-password"
          />
          {passwordErrors.length > 0 && (
            <div className={styles.passwordRequirements}>
              {passwordErrors.map((error, index) => (
                <p key={index} className={styles.validationError}>
                  {error}
                </p>
              ))}
            </div>
          )}
          <p className={styles.formHelp}>
            Password must be at least 6 characters and include uppercase,
            lowercase, and numbers.
          </p>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Confirm New Password</label>
        <div className={styles.formInputWrapper}>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={styles.formInput}
            required
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={
            isSubmitting ||
            passwordErrors.length > 0 ||
            (hasLocalAccount && !formData.oldPassword) ||
            !formData.newPassword ||
            !formData.confirmPassword
          }
        >
          {isSubmitting
            ? (hasLocalAccount ? 'Changing Password...' : 'Setting Password...')
            : (hasLocalAccount ? 'Change Password' : 'Set Password')
          }
        </button>
        {submitMessage && (
          <div
            className={`${styles.submitMessage} ${styles[submitMessage.type]}`}
          >
            {submitMessage.text}
          </div>
        )}
      </div>
    </form>
  );
}
