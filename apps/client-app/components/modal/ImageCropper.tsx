'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Area, Point } from 'react-easy-crop';
import styles from './ImageCropper.module.scss';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: Blob) => void;
  aspectRatio: string;
  imagesCount?: number;
  currentIndex?: number;
  onNavigate?: (index: number) => void;
}

export default function ImageCropper({
  imageSrc,
  onCropComplete,
  aspectRatio,
  imagesCount,
  currentIndex,
  onNavigate,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isMountedRef = useRef(true);

  // Track component mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset crop position when aspect ratio changes
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [aspectRatio]);

  // Convert aspect ratio string to number
  const getAspectRatioValue = (ratio: string): number => {
    switch (ratio) {
      case '1:1':
        return 1;
      case '4:5':
        return 4 / 5;
      case '16:9':
        return 16 / 9;
      default:
        return 1;
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = useCallback(async (
    imgSrc: string,
    pixelCrop: Area,
  ): Promise<Blob | null> => {
    try {
      const image = await createImage(imgSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return null;
      }

      // Validate crop dimensions (should be caught earlier, but double-check)
      if (pixelCrop.width <= 0 || pixelCrop.height <= 0) {
        return null;
      }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(blob);
        }, 'image/jpeg', 0.95);
      });
    } catch (error) {
      console.error('Error creating cropped image:', error);
      return null;
    }
  }, []);

  const onCropCompleteHandler = useCallback(
    async (croppedArea: Area, croppedAreaPixels: Area) => {
      // Don't process if component is unmounted
      if (!isMountedRef.current) {
        return;
      }

      // Validate crop dimensions before processing
      if (croppedAreaPixels.width <= 0 || croppedAreaPixels.height <= 0) {
        // Invalid crop dimensions, skip processing silently
        return;
      }

      // Auto-generate cropped blob immediately
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);

        // Check again if still mounted and blob is valid
        if (!isMountedRef.current || !croppedImage) {
          return;
        }

        onCropComplete(croppedImage);
      } catch (error) {
        console.error('Error auto-cropping image:', error);
      }
    },
    [imageSrc, onCropComplete, getCroppedImg],
  );

  return (
    <div className={styles.cropperWrapper}>

      <div className={styles.cropperArea}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={getAspectRatioValue(aspectRatio)}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
        />
        {/* If multiple images, show clickable dot indicators over the image, above the controls */}
        {imagesCount && imagesCount > 1 && (
          <div className={styles.imageIndicators}>
            {Array.from({ length: imagesCount }).map((_, idx) => (
              <button
                key={idx}
                className={`${styles.indicator} ${idx === currentIndex ? styles.active : ''}`}
                onClick={() => onNavigate?.(idx)}
                aria-label={`Go to image ${idx + 1}`}
                title={`Image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.zoomControl}>
          <label>Zoom</label>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <span className={styles.zoomValue}>{zoom.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
}
