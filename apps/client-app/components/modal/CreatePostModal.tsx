'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BackArrowIcon, UploadMediaIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/icons';
import { postsAPI } from '@/lib/api/posts';
import type { UploadAssetResponseDto } from '@repo/shared-types';
import styles from './CreatePostModal.module.scss';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

type ModalStep = 'upload' | 'details';

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<ModalStep>('upload');
  const [uploadedAssets, setUploadedAssets] = useState<UploadAssetResponseDto[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [content, setContent] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setUploadedAssets([]);
      setCurrentImageIndex(0);
      setContent('');
      setAspectRatio('1:1');
      setError('');
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isUploading && !isCreating) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isUploading, isCreating, onClose]);

  const handleClose = () => {
    if (isUploading || isCreating) return;
    onClose();
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError('');
    setIsUploading(true);

    try {
      const newAssets: UploadAssetResponseDto[] = [];

      for (let i = 0; i < Math.min(files.length, 10 - uploadedAssets.length); i++) {
        const file = files[i];

        if (!file) continue;

        // Validate file
        if (!file.type.startsWith('image/')) {
          setError('Only image files are allowed');
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          setError('File size must be less than 10MB');
          continue;
        }

        // Upload file
        const asset = await postsAPI.uploadAsset(file);
        newAssets.push(asset);
      }

      if (newAssets.length > 0) {
        setUploadedAssets(prev => {
          const updated = [...prev, ...newAssets];

          // If this is the first upload, go to details step
          if (prev.length === 0) {
            setStep('details');
          }

          return updated;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload images');
    } finally {
      setIsUploading(false);
      // Reset file input to allow selecting the same files again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [uploadedAssets.length]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUploading || uploadedAssets.length >= 10) return;

    handleFileSelect(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUploading, uploadedAssets.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Remove image
  const handleRemoveImage = (index: number) => {
    const newAssets = uploadedAssets.filter((_, i) => i !== index);
    setUploadedAssets(newAssets);

    // If no images left, go back to upload step
    if (newAssets.length === 0) {
      setStep('upload');
    } else if (currentImageIndex >= newAssets.length) {
      setCurrentImageIndex(newAssets.length - 1);
    }
  };

  // Navigate images
  const handlePrevImage = () => {
    setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : uploadedAssets.length - 1));
  };

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev < uploadedAssets.length - 1 ? prev + 1 : 0));
  };

  // Create post
  const handleCreatePost = async () => {
    if (uploadedAssets.length === 0) {
      setError('Please upload at least one image');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await postsAPI.createPost({
        content: content.trim() || undefined,
        assetIds: uploadedAssets.map(asset => asset.id),
        aspectRatio,
      });

      // Dispatch event to refresh feed
      window.dispatchEvent(new CustomEvent('postCreated'));

      onPostCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.createPanel} ref={modalRef}>
          {/* Header */}
          <div className={styles.header}>
            {step === 'details' && (
              <button
                className={styles.backButton}
                onClick={() => setStep('upload')}
                disabled={isCreating}
              >
                <BackArrowIcon />
              </button>
            )}

            <h2 className={styles.title}>
              {step === 'upload' ? 'Create new post' : 'Create new post'}
            </h2>

            {step === 'details' && (
              <button
                className={styles.shareButton}
                onClick={handleCreatePost}
                disabled={isCreating || uploadedAssets.length === 0}
              >
                {isCreating ? 'Sharing...' : 'Share'}
              </button>
            )}
          </div>

          {/* Content */}
          {step === 'upload' && (
            <div
              className={styles.uploadArea}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <UploadMediaIcon />

              <p className={styles.uploadText}>Drag photos and videos here</p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: 'none' }}
              />

              <button
                className={styles.selectButton}
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : 'Select from computer'}
              </button>

              {error && <p className={styles.error}>{error}</p>}
            </div>
          )}

          {step === 'details' && uploadedAssets.length > 0 && uploadedAssets[currentImageIndex] && (
            <div className={styles.detailsContainer}>
              {/* Image Preview */}
              <div
                key={`preview-${aspectRatio}`}
                className={styles.imagePreview}
                style={{ aspectRatio: aspectRatio.replace(':', '/') }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={uploadedAssets[currentImageIndex].url}
                  alt={`Upload ${currentImageIndex + 1}`}
                  className={styles.previewImage}
                />

                {/* Navigation arrows */}
                {uploadedAssets.length > 1 && (
                  <>
                    <button className={styles.navButton} style={{ left: 12 }} onClick={handlePrevImage}>
                      <ChevronLeftIcon />
                    </button>
                    <button className={styles.navButton} style={{ right: 12 }} onClick={handleNextImage}>
                      <ChevronRightIcon />
                    </button>
                  </>
                )}

                {/* Image indicators */}
                {uploadedAssets.length > 1 && (
                  <div className={styles.imageIndicators}>
                    {uploadedAssets.map((_, index) => (
                      <div
                        key={index}
                        className={`${styles.indicator} ${index === currentImageIndex ? styles.active : ''}`}
                      />
                    ))}
                  </div>
                )}

                {/* Remove button */}
                <button
                  className={styles.removeImageButton}
                  onClick={() => handleRemoveImage(currentImageIndex)}
                >
                  ✕
                </button>

                {/* Add more button */}
                {uploadedAssets.length < 10 && (
                  <button
                    className={styles.addMoreButton}
                    onClick={() => fileInputRef2.current?.click()}
                    disabled={isUploading}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Caption Form */}
              <div className={styles.captionForm}>
                <textarea
                  className={styles.captionInput}
                  placeholder="Write a caption..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  maxLength={5000}
                />
                <div className={styles.characterCount}>
                  {content.length}/5000
                </div>

                {/* Aspect Ratio Selector */}
                <div className={styles.aspectRatioSection}>
                  <label className={styles.aspectRatioLabel}>Aspect Ratio</label>
                  <div className={styles.aspectRatioButtons}>
                    {['1:1', '4:5', '16:9'].map((ratio) => (
                      <button
                        key={ratio}
                        className={`${styles.aspectRatioButton} ${aspectRatio === ratio ? styles.active : ''}`}
                        onClick={() => setAspectRatio(ratio)}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}

                {/* Hidden file input for adding more images in details step */}
                <input
                  ref={fileInputRef2}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
