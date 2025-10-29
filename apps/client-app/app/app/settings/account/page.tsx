// /settings/account

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/store/authStore';
import { usersApi } from '@/lib/api/users';
import styles from './account.module.scss';

export default function AccountSettingsPage() {
  const { user, setUser } = useAuthStore();
  const profile = user?.profile;
  const userEmail = user?.accounts?.[0]?.email || '';
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    email: userEmail,
    birthday: profile?.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '',
    isPublic: profile?.isPublic ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');
  const [usernameMessage, setUsernameMessage] = useState<string>('');

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Update form when user data changes
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        username: profile.username || '',
        bio: profile.bio || '',
        email: userEmail,
        birthday: profile.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : '',
        isPublic: profile.isPublic ?? true,
      });
      // Reset username validation when profile loads
      setUsernameStatus('idle');
      setUsernameMessage('');
    }
  }, [profile, userEmail]);

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

      if (formData.isPublic !== profile?.isPublic) {
        updateData.isPublic = formData.isPublic;
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
    <form onSubmit={handleSubmit} className={styles.editProfileForm}>
              {/* Profile Photo Section */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Profile Photo</label>
                <div className={styles.formInputWrapper}>
                  <div className={styles.profilePhotoSection}>
                    <div className={styles.avatarWrapper}>
                      {avatarPreview || profile?.avatarUrl ? (
                        <Image
                          src={avatarPreview || profile?.avatarUrl || ''}
                          alt={profile?.username || 'User avatar'}
                          width={38}
                          height={38}
                          className={styles.avatar}
                          unoptimized
                        />
                      ) : (
                        <div className={styles.avatarPlaceholder}>
                          {profile?.displayName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div className={styles.profilePhotoInfo}>
                      <div className={styles.currentUsername}>{profile?.username}</div>
                      <label htmlFor="avatar-upload" className={styles.changePhotoButton}>
                        {isUploadingAvatar ? 'Uploading...' : 'Change profile photo'}
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
                </div>
              </div>

              {/* Form Fields */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Name</label>
                <div className={styles.formInputWrapper}>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className={styles.formInput}
                  />
                  <p className={styles.formHelp}>
                    Help people discover your account by using the name you&apos;re known by: either your full name, nickname, or business name.
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Username</label>
                <div className={styles.formInputWrapper}>
                  <div className={styles.inputWithValidation}>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className={`${styles.formInput} ${
                        usernameStatus === 'available' ? styles.inputValid :
                        usernameStatus === 'taken' || usernameStatus === 'error' ? styles.inputInvalid : ''
                      }`}
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
                    In most cases, you&apos;ll be able to change your username back to {profile?.username} for another 14 days.
                  </p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Bio</label>
                <div className={styles.formInputWrapper}>
                  <textarea
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
                <label className={styles.formLabel}>Birthday</label>
                <div className={styles.formInputWrapper}>
                  <input
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

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email</label>
                <div className={styles.formInputWrapper}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={styles.formInput}
                    disabled
                  />
                  <p className={styles.formHelp}>
                    Email is managed through your account settings and cannot be changed here.
                  </p>
                </div>
              </div>

              {/* Privacy Settings */}
              <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>Privacy</h3>
                <p className={styles.sectionDescription}>
                  Manage who can see your content and connect with you.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Account Privacy</label>
                <div className={styles.formInputWrapper}>
                  <div className={styles.checkboxWrapper}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={formData.isPublic}
                      onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    />
                    <div className={styles.checkboxLabel}>
                      <p className={styles.checkboxText}>
                        Public account - Anyone can see your profile and posts
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
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
  );
}
