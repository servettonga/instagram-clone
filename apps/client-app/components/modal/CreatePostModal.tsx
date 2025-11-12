'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import UploadMediaIcon from '@/components/ui/icons/UploadMediaIcon';
import ChevronLeftIcon from '@/components/ui/icons/ChevronLeftIcon';
import ChevronRightIcon from '@/components/ui/icons/ChevronRightIcon';
import { postsAPI } from '@/lib/api/posts';
import ImageCropper from './ImageCropper';
import MentionInput from '@/components/ui/MentionInput';
import styles from './CreatePostModal.module.scss';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

type ModalStep = 'upload' | 'edit';

interface ImageData {
  originalFile: File;
  preview: string;
  croppedBlob: Blob | null;
}

export default function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<ModalStep>('upload');
  const [images, setImages] = useState<ImageData[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [content, setContent] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen && images.length > 0) {
      // Clean up when closing
      images.forEach(img => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });
      setImages([]);
      setCurrentImageIndex(0);
      setStep('upload');
      setContent('');
      setAspectRatio('1:1');
      setError('');
    }
  }, [isOpen, images]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isCreating) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isCreating, onClose]);

  const handleClose = () => {
    if (isCreating) return;
    onClose();
  };

  // Handle file selection - go directly to edit/crop step
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');

    // Create preview and add to images array
    const preview = URL.createObjectURL(file);
    const newImage: ImageData = {
      originalFile: file,
      preview,
      croppedBlob: null,
    };

    setImages(prev => {
      const newImages = [...prev, newImage];
      setCurrentImageIndex(newImages.length - 1); // Set to new image index
      return newImages;
    });
    setStep('edit');

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (additionalFileInputRef.current) {
      additionalFileInputRef.current.value = '';
    }
  }, []);

  // Handle crop complete - store the cropped blob for current image
  const handleCropComplete = useCallback((croppedBlob: Blob) => {
    setImages(prev => {
      const updated = [...prev];
      if (updated[currentImageIndex]) {
        updated[currentImageIndex] = {
          ...updated[currentImageIndex],
          croppedBlob,
        };
      }
      return updated;
    });
  }, [currentImageIndex]);

  // Handle remove image
  const handleRemoveImage = useCallback(() => {
    setImages(prev => {
      // Clean up the preview URL
      if (prev[currentImageIndex]?.preview) {
        URL.revokeObjectURL(prev[currentImageIndex].preview);
      }

      const updated = prev.filter((_, index) => index !== currentImageIndex);

      // If no images left, go back to upload step
      if (updated.length === 0) {
        setStep('upload');
        setCurrentImageIndex(0);
        return [];
      }

      // Adjust current index if needed
      if (currentImageIndex >= updated.length) {
        setCurrentImageIndex(updated.length - 1);
      }

      return updated;
    });
  }, [currentImageIndex]);

  // Create post - upload all cropped images and create post
  const handleCreatePost = async () => {
    // Check if all images have been cropped
    const allCropped = images.every(img => img.croppedBlob);
    if (!allCropped) {
      setError('Please wait for all images to be processed');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      // Upload all cropped images
      const uploadPromises = images.map(async (img) => {
        const croppedFile = new File(
          [img.croppedBlob!],
          img.originalFile.name,
          { type: 'image/jpeg' }
        );
        return postsAPI.uploadAsset(croppedFile, aspectRatio);
      });

      const assets = await Promise.all(uploadPromises);

      // Create post with all asset IDs
      await postsAPI.createPost({
        content: content.trim() || undefined,
        assetIds: assets.map(asset => asset.id),
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

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isCreating) return;

    handleFileSelect(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCreating]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  const currentImage = images[currentImageIndex];

  // Render edit/crop view
  if (step === 'edit' && currentImage) {
    const allCropped = images.every(img => img.croppedBlob);

    return (
      <div className={styles.modalBackdrop} onClick={handleClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <div className={styles.createPanel} ref={modalRef}>
            {/* Header */}
            <div className={styles.header}>
              <button
                className={styles.backButton}
                onClick={() => {
                  images.forEach(img => {
                    if (img.preview) {
                      URL.revokeObjectURL(img.preview);
                    }
                  });
                  setStep('upload');
                  setImages([]);
                  setCurrentImageIndex(0);
                  setContent('');
                }}
                disabled={isCreating}
                aria-label="Cancel"
              >
                Cancel
              </button>

              <h2 className={styles.title}>
                Edit post {images.length > 1 && `(${currentImageIndex + 1}/${images.length})`}
              </h2>

              <button
                className={styles.shareButton}
                onClick={handleCreatePost}
                disabled={isCreating || !allCropped}
              >
                {isCreating ? 'Sharing...' : 'Share'}
              </button>
            </div>

            {/* Main content area with cropper and caption */}
            <div className={styles.editContainer}>
              {/* Left: Image cropper */}
              <div className={styles.cropperSection}>
                <ImageCropper
                  imageSrc={currentImage.preview}
                  onCropComplete={handleCropComplete}
                  aspectRatio={aspectRatio}
                  imagesCount={images.length}
                  currentIndex={currentImageIndex}
                  onNavigate={(i) => setCurrentImageIndex(i)}
                />

                {/* Remove image button */}
                <button
                  className={styles.removeImageButton}
                  onClick={handleRemoveImage}
                  disabled={isCreating}
                  aria-label="Remove image"
                  title="Remove image"
                >
                  ×
                </button>
              </div>

              {/* Right: Caption and options */}
              <div className={styles.detailsSection}>
                <div className={styles.captionArea}>
                  <MentionInput
                    value={content}
                    onChange={setContent}
                    placeholder="Write a caption... Type @ to mention someone"
                    multiline={true}
                    rows={6}
                    className={styles.captionInput}
                    disabled={isCreating}
                  />
                  <div className={styles.characterCount}>
                    {content.length}/2200
                  </div>
                </div>

                {/* Aspect Ratio Selector - Tab style (no label) */}
                <div className={styles.aspectRatioTabs}>
                  <button
                    type="button"
                    className={`${styles.aspectRatioTab} ${aspectRatio === '1:1' ? styles.active : ''}`}
                    onClick={() => setAspectRatio('1:1')}
                  >
                    1:1
                  </button>
                  <button
                    type="button"
                    className={`${styles.aspectRatioTab} ${aspectRatio === '4:5' ? styles.active : ''}`}
                    onClick={() => setAspectRatio('4:5')}
                  >
                    4:5
                  </button>
                  <button
                    type="button"
                    className={`${styles.aspectRatioTab} ${aspectRatio === '16:9' ? styles.active : ''}`}
                    onClick={() => setAspectRatio('16:9')}
                  >
                    16:9
                  </button>
                </div>

                {/* Image navigation with icons */}
                <div className={styles.imageNav}>
                  {images.length > 1 && (
                    <button
                      className={`${styles.imageNavDot} ${styles.arrowButton} ${styles.arrowLeft}`}
                      onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                      disabled={currentImageIndex === 0}
                      aria-label="Previous image"
                    >
                      <ChevronLeftIcon />
                    </button>
                  )}
                  {/* Numbered buttons removed — navigation handled by dots over the image */}
                  {images.length < 10 && (
                    <>
                      <input
                        ref={additionalFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        style={{ display: 'none' }}
                      />
                      <button
                        className={`${styles.imageNavDot} ${styles.addImageButton}`}
                        onClick={() => additionalFileInputRef.current?.click()}
                        disabled={isCreating}
                        aria-label="Add more images"
                        title={`Add photo (${images.length}/10)`}
                      >
                        +
                      </button>
                    </>
                  )}
                  {images.length > 1 && (
                    <button
                      className={`${styles.imageNavDot} ${styles.arrowButton} ${styles.arrowRight}`}
                      onClick={() => setCurrentImageIndex(Math.min(images.length - 1, currentImageIndex + 1))}
                      disabled={currentImageIndex === images.length - 1}
                      aria-label="Next image"
                    >
                      <ChevronRightIcon />
                    </button>
                  )}
                </div>

                {error && <div className={styles.error}>{error}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Upload step - simple file selection
  return (
    <div className={styles.modalBackdrop} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.createPanel} ref={modalRef}>
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.title}>Create new post</h2>
          </div>

          {/* Upload area */}
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
              accept="image/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              style={{ display: 'none' }}
            />

            <button
              className={styles.selectButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isCreating}
            >
              Select from computer
            </button>

            {error && <div className={styles.error}>{error}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
