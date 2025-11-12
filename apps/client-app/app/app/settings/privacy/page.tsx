// /app/settings/privacy - Account & Privacy

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { usersApi } from '@/lib/api/users';
import styles from './privacy.module.scss';
import ConfirmModal from '@/components/modal/ConfirmModal';

export default function PrivacySettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const router = useRouter();
  const profile = user?.profile;
  const userEmail = user?.accounts?.[0]?.email || '';

  // Email and privacy form state
  const [formData, setFormData] = useState({
    email: userEmail,
    isPublic: profile?.isPublic ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Update form when user data changes
  useEffect(() => {
    setFormData({
      email: userEmail,
      isPublic: profile?.isPublic ?? true,
    });
  }, [userEmail, profile?.isPublic]);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setSubmitMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      const updateData: { email?: string; isPublic?: boolean } = {};
      const changedFields: string[] = [];

      // Check if email changed
      if (formData.email !== userEmail && formData.email.trim() !== '') {
        updateData.email = formData.email.trim();
        changedFields.push('Email');
      }

      // Check if privacy setting changed
      if (formData.isPublic !== profile?.isPublic) {
        updateData.isPublic = formData.isPublic;
        changedFields.push('Account privacy');
      }

      // Only send request if there are changes
      if (changedFields.length === 0) {
        setSubmitMessage({ type: 'success', text: 'No changes to save' });
        return;
      }

      // Update via API
      const updatedUser = await usersApi.updateProfile(user.id, updateData);
      setUser(updatedUser);

      const successMessage =
        changedFields.length > 1
          ? 'Email and account privacy updated successfully!'
          : `${changedFields[0]} updated successfully!`;

      setSubmitMessage({ type: 'success', text: successMessage });
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update settings. Please try again.';
      setSubmitMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    // Verify confirmation text
    if (deleteConfirmation !== user.profile?.username) {
      setDeleteError(
        `Please type "${user.profile?.username}" to confirm deletion`
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Delete user account
      await usersApi.deleteUser(user.id);

      // Logout and clear auth state
      await logout();

      // Redirect to home page
      router.push('/');
    } catch (error) {
      const errorMessage =
        (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message || 'Failed to delete account. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.privacyContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Account &amp; Privacy</h1>
        <p className={styles.pageDescription}>
          Configure your contact email and who can see your posts.
        </p>
      </div>

  {/* Email and Privacy Form */}
  <form onSubmit={handleSubmit} className={styles.privacyForm}>
        {/* Email Field */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Email Address</h3>
          <div className={styles.formGroup}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={styles.input}
              required
            />
            <p className={styles.helpText}>
              This email is used for login and notifications.
            </p>
          </div>
        </div>

  {/* Account Privacy */}
  <div className={`${styles.section} ${styles.sectionNoBorder}`}>
          <h3 className={styles.sectionTitle}>Account Privacy</h3>
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.isPublic}
                onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                className={styles.checkbox}
              />
              <div className={styles.checkboxContent}>
                <span className={styles.checkboxText}>Public account</span>
                <span className={styles.checkboxDescription}>
                  {formData.isPublic
                    ? 'Anyone can see your profile and posts'
                    : 'Only your followers can see your posts'}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          {submitMessage && (
            <div className={`${styles.message} ${styles[submitMessage.type]}`}>
              {submitMessage.text}
            </div>
          )}
        </div>
      </form>

      {/* Data & History Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Data & History</h3>
        <p className={styles.sectionDescription}>
          Download your data, view your activity history, and manage your
          content.
        </p>
        <div className={styles.actionButtons}>
          <button className={styles.secondaryButton} disabled>
            Download Your Data
          </button>
          <button className={styles.secondaryButton} disabled>
            View Activity History
          </button>
        </div>
        <p className={styles.comingSoon}>Coming soon...</p>
      </div>

      {/* Delete Account Section */}
      <div className={`${styles.section} ${styles.dangerSection}`}>
        <h3 className={`${styles.sectionTitle} ${styles.dangerTitle}`}>
          Delete Account
        </h3>
        <p className={styles.sectionDescription}>
          Once you delete your account, there is no going back. All your posts,
          comments, likes, and profile information will be permanently removed.
        </p>
        <button
          className={styles.dangerButton}
          onClick={() => setShowDeleteModal(true)}
        >
          Delete My Account
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Account"
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Account'}
        cancelLabel="Cancel"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
        danger={true}
        confirmDisabled={isDeleting || deleteConfirmation !== user?.profile?.username}
      >
        <div className={styles.modalWarning}>
          <strong>⚠️ Warning:</strong> All your content will be permanently
          deleted and cannot be recovered.
        </div>

        <div className={styles.modalForm}>
          <label className={styles.modalLabel}>
            Type <strong>{user?.profile?.username}</strong> to confirm:
          </label>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => {
              setDeleteConfirmation(e.target.value);
              setDeleteError(null);
            }}
            className={styles.modalInput}
            placeholder={user?.profile?.username}
            disabled={isDeleting}
            autoFocus
          />
          {deleteError && (
            <p className={styles.modalError}>{deleteError}</p>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}
