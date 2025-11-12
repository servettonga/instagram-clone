// /settings/account

'use client';

import { useState, useEffect } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/lib/store/authStore';
import { usersApi } from '@/lib/api/users';
import styles from './account.module.scss';

export default function AccountSettingsPage() {
  const { user, setUser } = useAuthStore();
  const profile = user?.profile;
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    birthday: profile?.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const defaultHandle =
    profile?.username ||
    user?.profile?.username ||
    user?.accounts?.[0]?.email ||
    '';

  const formattedHandle = defaultHandle
    ? defaultHandle.includes('@') && !defaultHandle.startsWith('@')
      ? defaultHandle
      : `@${defaultHandle.replace(/^@/, '')}`
    : '';

  const displayName = profile?.displayName || user?.profile?.displayName || '';
  const originalUsername = profile?.username || '';
  const revertUsernameCopy = originalUsername
    ? `@${originalUsername.replace(/^@/, '')}`
    : 'your previous username';

  // Update form when user data changes
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        birthday: profile.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '',
      });
      // Reset username validation when profile loads
      setUsernameStatus('idle');
      setUsernameMessage('');
    }
  }, [profile]);

  // Debounced username availability check
  useEffect(() => {
    // Don't check if username hasn't changed or is empty
    if (!formData.username || formData.username === profile?.username) {
      setUsernameStatus('idle');
      setUsernameMessage('');
      return;
    }

    // Basic validation
    if (formData.username.length < 3) {
      setUsernameStatus('error');
      setUsernameMessage('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9._]+$/.test(formData.username)) {
      setUsernameStatus('error');
      setUsernameMessage('Username can only contain letters, numbers, dots, and underscores');
      return;
    }

    // Set checking status
    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    // Debounce the API call
    const timeoutId = setTimeout(async () => {
      try {
        const result = await usersApi.checkUsernameAvailability(formData.username);
        if (result.available) {
          setUsernameStatus('available');
          setUsernameMessage(`@${formData.username} is available`);
        } else {
          setUsernameStatus('taken');
          setUsernameMessage('This username is already taken');
        }
      } catch {
        // Error is displayed to user via validation message
        setUsernameStatus('error');
        setUsernameMessage('Error checking username availability');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [formData.username, profile?.username]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear message when user starts typing
    if (submitMessage) setSubmitMessage(null);
    // Reset username status when user types
    if (name === 'username') {
      setUsernameStatus('idle');
      setUsernameMessage('');
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSubmitMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setSubmitMessage({ type: 'error', text: 'File size must be less than 10MB' });
      return;
    }

    setIsUploadingAvatar(true);
    setSubmitMessage(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      // Upload avatar
      const { avatarUrl } = await usersApi.uploadAvatar(user.id, file);

      // Update user in store with new avatar
      const updatedUser = { ...user };
      if (updatedUser.profile) {
        updatedUser.profile.avatarUrl = avatarUrl;
      }
      setUser(updatedUser);

      setSubmitMessage({ type: 'success', text: 'Avatar updated successfully!' });
    } catch (error) {
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to upload avatar. Please try again.';
      setSubmitMessage({ type: 'error', text: errorMessage });
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      setSubmitMessage({ type: 'error', text: 'User not authenticated' });
      return;
    }

    // Prevent submission if username is taken or being checked
    if (usernameStatus === 'taken' || usernameStatus === 'checking') {
      setSubmitMessage({ type: 'error', text: 'Please wait for username validation or choose a different username' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage(null);

    try {
      // Prepare update data - only include changed fields
      const updateData: Record<string, string | boolean> = {};

      if (formData.displayName !== profile?.displayName) {
        updateData.displayName = formData.displayName;
      }
      if (formData.username !== profile?.username) {
        updateData.username = formData.username;
      }
      if (formData.bio !== profile?.bio) {
        updateData.bio = formData.bio;
      }

      // Compare birthday (convert profile birthday to YYYY-MM-DD format)
      const profileBirthday = profile?.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '';
      if (formData.birthday !== profileBirthday) {
        updateData.birthday = formData.birthday ? new Date(formData.birthday).toISOString() : '';
      }

      // Only send request if there are changes
      if (Object.keys(updateData).length === 0) {
        setSubmitMessage({ type: 'success', text: 'No changes to save' });
        setIsSubmitting(false);
        return;
      }

      // Update profile via API
      const updatedUser = await usersApi.updateProfile(user.id, updateData);

      // Update auth store with new user data
      setUser(updatedUser);

      setSubmitMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      // Error is displayed to user, no need to log
      const errorMessage = (error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Failed to update profile. Please try again.';
      setSubmitMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Edit Profile</h1>
        <p className={styles.pageDescription}>
          Update your basic profile details and how others see you across the app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.editProfileForm}>
        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper}>
            <Avatar
              avatarUrl={avatarPreview ?? profile?.avatarUrl ?? undefined}
              username={
                profile?.displayName ||
                profile?.username ||
                user?.profile?.displayName ||
                user?.profile?.username ||
                user?.accounts?.[0]?.email
              }
              size="lg"
              unoptimized
            />
          </div>
          <div className={styles.profilePhotoInfo}>
            {formattedHandle && (
              <span className={styles.avatarUsername}>{formattedHandle}</span>
            )}
            {displayName && displayName !== formattedHandle && (
              <span className={styles.avatarDisplayName}>{displayName}</span>
            )}
            <label htmlFor="avatar-upload" className={styles.changePhotoButton}>
              {isUploadingAvatar ? 'Uploading...' : 'Change photo'}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className={styles.fileInput}
              disabled={isUploadingAvatar}
            />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="displayName" className={styles.formLabel}>Name</label>
          <div className={styles.formInputWrapper}>
            <input
              id="displayName"
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className={styles.formInput}
              autoComplete="name"
            />
            <p className={styles.formHelp}>
              Help people discover your account by using the name you&apos;re known by: either your full name, nickname, or business name.
            </p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.formLabel}>Username</label>
          <div className={styles.formInputWrapper}>
            <div className={styles.inputWithValidation}>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className={`${styles.formInput} ${
                  usernameStatus === 'available' ? styles.inputValid :
                  usernameStatus === 'taken' || usernameStatus === 'error' ? styles.inputInvalid : ''
                }`}
                autoComplete="username"
              />
              {usernameStatus === 'checking' && (
                <span className={styles.validationIcon}>⏳</span>
              )}
              {usernameStatus === 'available' && (
                <span className={styles.validationIcon}>✓</span>
              )}
              {(usernameStatus === 'taken' || usernameStatus === 'error') && (
                <span className={styles.validationIcon}>✗</span>
              )}
            </div>
            {usernameMessage && (
              <p className={`${styles.validationMessage} ${
                usernameStatus === 'available' ? styles.validationSuccess :
                usernameStatus === 'checking' ? styles.validationInfo :
                styles.validationError
              }`}>
                {usernameMessage}
              </p>
            )}
            <p className={styles.formHelp}>
              In most cases, you&apos;ll be able to change your username back to {revertUsernameCopy} for another 14 days.
            </p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="bio" className={styles.formLabel}>Bio</label>
          <div className={styles.formInputWrapper}>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className={styles.formTextarea}
              maxLength={150}
            />
            <p className={styles.charCount}>{formData.bio.length} / 150</p>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="birthday" className={styles.formLabel}>Birthday</label>
          <div className={styles.formInputWrapper}>
            <input
              id="birthday"
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleInputChange}
              className={styles.formInput}
            />
            <p className={styles.formHelp}>
              Your birthday helps personalize your experience.
            </p>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking' || usernameStatus === 'error'}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
          {submitMessage && (
            <div className={`${styles.submitMessage} ${styles[submitMessage.type]}`}>
              {submitMessage.text}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
