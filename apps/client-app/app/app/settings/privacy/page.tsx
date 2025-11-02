// /app/settings/privacy - Privacy and Security

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { usersApi } from '@/lib/api/users';
import styles from './privacy.module.scss';
import ConfirmModal from '@/components/modal/ConfirmModal';

export default function PrivacySettingsPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
      {/* Account Privacy Section */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Account Privacy</h3>
        <p className={styles.sectionDescription}>
          Your account is currently{' '}
          <strong>{user?.profile?.isPublic ? 'Public' : 'Private'}</strong>.
          Change this setting in your profile edit page.
        </p>
      </div>

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
