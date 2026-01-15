/**
 * ObservationImageUploader Component
 * 
 * LP-1.1.1: Image capture and upload for observations.
 * LP-obs-studio-cleanup-1.7.0: Resumable uploads with progress, telemetry, and robust error handling.
 * LP-observations-consolidation-1.1.0: Enhanced retry/backoff, CORS handling, and preflight error recovery.
 * Supports camera capture and file selection with preview.
 */

import { useState, useRef, useCallback } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, UploadTask, UploadMetadata } from 'firebase/storage';
import { storage, isStorageAvailable } from '../../firebaseConfig';
import './ObservationImageUploader.css';

// LP-obs-studio-cleanup-1.7.0: Telemetry
type TelemetryEvent = {
  name: string;
  data?: Record<string, unknown>;
};

let telemetryCallback: ((event: TelemetryEvent) => void) | null = null;

export function setUploadTelemetryCallback(
  callback: ((event: TelemetryEvent) => void) | null
): void {
  telemetryCallback = callback;
}

function emitTelemetry(name: string, data?: Record<string, unknown>): void {
  if (telemetryCallback) {
    telemetryCallback({ name, data });
  }
}

// LP-observations-consolidation-1.1.0: Retry configuration
const MAX_UPLOAD_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

/**
 * LP-observations-consolidation-1.1.0: Exponential backoff delay calculator
 */
function getRetryDelay(retryCount: number): number {
  return INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
}

/**
 * LP-observations-consolidation-1.1.0: Check if error is retryable
 * CORS/preflight errors and network errors are retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Network errors, CORS, and storage quota errors
    return (
      message.includes('network') ||
      message.includes('cors') ||
      message.includes('preflight') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('storage/retry-limit-exceeded') ||
      message.includes('storage/server-file-wrong-size')
    );
  }
  return false;
}

export interface ImageFile {
  id: string;
  file?: File;
  url: string;
  thumbnail: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress?: number;
  error?: string;
}

interface ObservationImageUploaderProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  productMpn?: string;
  disabled?: boolean;
}

// Generate unique ID
const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Create thumbnail from image file
const createThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function ObservationImageUploader({
  images,
  onImagesChange,
  maxImages = 5,
  productMpn = 'unknown',
  disabled = false,
}: ObservationImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  // LP-obs-studio-cleanup-1.7.0: Track active uploads for cancellation
  const activeUploadsRef = useRef<Map<string, UploadTask>>(new Map());

  /**
   * LP-observations-consolidation-1.1.0: Upload single image with resumable upload, progress, and retry/backoff
   * Handles CORS/preflight errors gracefully with exponential backoff
   */
  const uploadImage = useCallback(async (
    imageFile: ImageFile,
    onProgress?: (progress: number) => void,
    retryCount: number = 0
  ): Promise<ImageFile> => {
    if (!imageFile.file) {
      return { ...imageFile, status: 'error', error: 'No file to upload' };
    }

    // Check if storage is available
    if (!isStorageAvailable() || !storage) {
      emitTelemetry('upload.error', { 
        imageId: imageFile.id, 
        error: 'storage_unavailable',
        productMpn 
      });
      return { ...imageFile, status: 'error', error: 'Firebase Storage not available' };
    }

    const fileSize = imageFile.file.size;
    emitTelemetry('upload.start', { 
      imageId: imageFile.id, 
      productMpn, 
      fileSize,
      fileName: imageFile.file.name,
      retryCount,
    });

    return new Promise((resolve) => {
      try {
        // Create storage path
        const timestamp = Date.now();
        const sanitizedMpn = productMpn.replace(/[^a-zA-Z0-9-_]/g, '_');
        const storagePath = `observations/${sanitizedMpn}/${timestamp}_${imageFile.file!.name}`;
        const storageRef = ref(storage!, storagePath);
        
        // LP-observations-consolidation-1.1.0: Set explicit metadata with Content-Type for CORS
        const metadata: UploadMetadata = {
          contentType: imageFile.file!.type || 'image/jpeg',
          customMetadata: {
            productMpn: sanitizedMpn,
            uploadedAt: new Date().toISOString(),
            originalFileName: imageFile.file!.name,
          },
        };
        
        // LP-obs-studio-cleanup-1.7.0: Use resumable upload with progress tracking
        const uploadTask = uploadBytesResumable(storageRef, imageFile.file!, metadata);
        
        // Store reference for potential cancellation
        activeUploadsRef.current.set(imageFile.id, uploadTask);
        
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress callback
            const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            emitTelemetry('upload.progress', { 
              imageId: imageFile.id, 
              productMpn, 
              percent,
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
            });
            if (onProgress) {
              onProgress(percent);
            }
          },
          async (error) => {
            // Error callback - LP-observations-consolidation-1.1.0: Handle with retry
            console.error('Upload error:', error);
            activeUploadsRef.current.delete(imageFile.id);
            
            const errorCode = (error as { code?: string }).code || error.message;
            
            emitTelemetry('upload.error', { 
              imageId: imageFile.id, 
              productMpn,
              error: errorCode,
              retryCount,
            });
            
            // LP-observations-consolidation-1.1.0: Retry with exponential backoff for retryable errors
            if (isRetryableError(error) && retryCount < MAX_UPLOAD_RETRIES) {
              const delay = getRetryDelay(retryCount);
              emitTelemetry('upload.retry_scheduled', { 
                imageId: imageFile.id, 
                productMpn,
                retryCount: retryCount + 1,
                delayMs: delay,
              });
              
              await new Promise(r => setTimeout(r, delay));
              const retryResult = await uploadImage(imageFile, onProgress, retryCount + 1);
              resolve(retryResult);
              return;
            }
            
            resolve({
              ...imageFile,
              status: 'error',
              error: error.message || 'Upload failed',
            });
          },
          async () => {
            // Success callback
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              activeUploadsRef.current.delete(imageFile.id);
              
              emitTelemetry('upload.complete', { 
                imageId: imageFile.id, 
                productMpn,
                url: downloadUrl,
                fileSize,
                retryCount,
              });
              
              resolve({
                ...imageFile,
                url: downloadUrl,
                status: 'uploaded',
                progress: 100,
              });
            } catch (urlError) {
              console.error('Get download URL error:', urlError);
              activeUploadsRef.current.delete(imageFile.id);
              
              emitTelemetry('upload.error', { 
                imageId: imageFile.id, 
                productMpn,
                error: 'get_url_failed',
              });
              
              resolve({
                ...imageFile,
                status: 'error',
                error: 'Failed to get download URL',
              });
            }
          }
        );
      } catch (err) {
        console.error('Upload setup error:', err);
        emitTelemetry('upload.error', { 
          imageId: imageFile.id, 
          productMpn,
          error: err instanceof Error ? err.message : 'setup_failed',
        });
        resolve({
          ...imageFile,
          status: 'error',
          error: err instanceof Error ? err.message : 'Upload failed',
        });
      }
    });
  }, [productMpn]);

  // Handle file selection
  // LP-obs-studio-cleanup-1.7.0: Enhanced with progress tracking per image
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }
    
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsUploading(true);
    
    try {
      // Create image entries with thumbnails
      const newImages: ImageFile[] = await Promise.all(
        filesToProcess.map(async (file) => {
          const thumbnail = await createThumbnail(file);
          return {
            id: generateId(),
            file,
            url: '',
            thumbnail,
            status: 'uploading' as const, // LP-1.7.0: Start as uploading for progress display
            progress: 0,
          };
        })
      );
      
      // Add uploading images to state
      let currentImages = [...images, ...newImages];
      onImagesChange(currentImages);
      
      // LP-obs-studio-cleanup-1.7.0: Upload images with progress callbacks
      const uploadPromises = newImages.map(img => 
        uploadImage(img, (progress) => {
          // Update progress in state
          currentImages = currentImages.map(existingImg => 
            existingImg.id === img.id 
              ? { ...existingImg, progress } 
              : existingImg
          );
          onImagesChange([...currentImages]);
        })
      );
      
      const uploadedImages = await Promise.all(uploadPromises);
      
      // Update with final upload results
      const finalImages = currentImages.map(img => {
        const uploaded = uploadedImages.find(u => u.id === img.id);
        return uploaded || img;
      });
      
      onImagesChange(finalImages);
    } catch (err) {
      console.error('File processing error:', err);
      emitTelemetry('upload.batch_error', { 
        productMpn, 
        error: err instanceof Error ? err.message : 'unknown',
        fileCount: filesToProcess.length,
      });
    } finally {
      setIsUploading(false);
    }
  }, [images, maxImages, onImagesChange, uploadImage]);

  // Remove image
  // LP-obs-studio-cleanup-1.7.0: Also cancel active uploads when removing
  const handleRemoveImage = useCallback((imageId: string) => {
    // Cancel any active upload
    const activeUpload = activeUploadsRef.current.get(imageId);
    if (activeUpload) {
      activeUpload.cancel();
      activeUploadsRef.current.delete(imageId);
    }
    
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  // Retry failed upload
  const handleRetryUpload = useCallback(async (imageId: string) => {
    const imageToRetry = images.find(img => img.id === imageId);
    if (!imageToRetry || !imageToRetry.file) return;
    
    // Mark as uploading with 0 progress
    const updatedImages = images.map(img =>
      img.id === imageId ? { ...img, status: 'uploading' as const, progress: 0, error: undefined } : img
    );
    onImagesChange(updatedImages);
    
    setIsUploading(true);
    try {
      const uploaded = await uploadImage(imageToRetry, (progress) => {
        // Update progress during retry
        const progressImages = images.map(img =>
          img.id === imageId ? { ...img, progress } : img
        );
        onImagesChange(progressImages);
      });
      const finalImages = images.map(img =>
        img.id === imageId ? uploaded : img
      );
      onImagesChange(finalImages);
    } finally {
      setIsUploading(false);
    }
  }, [images, onImagesChange, uploadImage]);

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className="observation-image-uploader">
      {/* Image grid */}
      <div className="image-grid">
        {/* Existing images */}
        {images.map((image) => (
          <div key={image.id} className={`image-item ${image.status}`}>
            <img src={image.thumbnail} alt="Observation" className="image-preview" />
            
            {/* Status overlay - LP-obs-studio-cleanup-1.7.0: Show progress percentage */}
            {image.status === 'uploading' && (
              <div className="image-overlay uploading">
                <div className="upload-spinner" />
                {typeof image.progress === 'number' && image.progress < 100 && (
                  <span className="upload-progress-text">{image.progress}%</span>
                )}
              </div>
            )}
            
            {image.status === 'error' && (
              <div className="image-overlay error">
                <span className="error-icon">⚠️</span>
                <button
                  className="retry-btn"
                  onClick={() => handleRetryUpload(image.id)}
                  disabled={isUploading}
                >
                  Retry
                </button>
              </div>
            )}
            
            {image.status === 'uploaded' && (
              <div className="image-badge success">✓</div>
            )}
            
            {/* Remove button */}
            <button
              className="remove-btn"
              onClick={() => handleRemoveImage(image.id)}
              disabled={isUploading || disabled}
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}
        
        {/* Add image buttons */}
        {canAddMore && (
          <>
            {/* Camera capture */}
            <button
              className="add-image-btn camera"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploading}
            >
              <span className="btn-icon">📷</span>
              <span className="btn-text">Camera</span>
            </button>
            
            {/* File picker */}
            <button
              className="add-image-btn gallery"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <span className="btn-icon">🖼️</span>
              <span className="btn-text">Gallery</span>
            </button>
          </>
        )}
      </div>
      
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />
      
      {/* Image count */}
      <div className="image-count">
        {images.length} / {maxImages} images
        {isUploading && <span className="uploading-text"> (uploading...)</span>}
      </div>
    </div>
  );
}
