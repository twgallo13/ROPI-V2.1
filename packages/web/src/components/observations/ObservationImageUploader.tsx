/**
 * ObservationImageUploader Component
 * 
 * LP-1.1.1: Image capture and upload for observations.
 * Supports camera capture and file selection with preview.
 */

import { useState, useRef, useCallback } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isStorageAvailable } from '../../firebaseConfig';
import './ObservationImageUploader.css';

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

  // Upload single image to Firebase Storage
  const uploadImage = useCallback(async (imageFile: ImageFile): Promise<ImageFile> => {
    if (!imageFile.file) {
      return { ...imageFile, status: 'error', error: 'No file to upload' };
    }

    // Check if storage is available
    if (!isStorageAvailable() || !storage) {
      return { ...imageFile, status: 'error', error: 'Firebase Storage not available' };
    }

    try {
      // Create storage path
      const timestamp = Date.now();
      const sanitizedMpn = productMpn.replace(/[^a-zA-Z0-9-_]/g, '_');
      const storagePath = `observations/${sanitizedMpn}/${timestamp}_${imageFile.file.name}`;
      const storageRef = ref(storage, storagePath);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, imageFile.file);
      
      // Get download URL
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      return {
        ...imageFile,
        url: downloadUrl,
        status: 'uploaded',
        progress: 100,
      };
    } catch (err) {
      console.error('Upload error:', err);
      return {
        ...imageFile,
        status: 'error',
        error: err instanceof Error ? err.message : 'Upload failed',
      };
    }
  }, [productMpn]);

  // Handle file selection
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
            status: 'pending' as const,
          };
        })
      );
      
      // Add pending images to state
      const updatedImages = [...images, ...newImages];
      onImagesChange(updatedImages);
      
      // Upload images
      const uploadedImages = await Promise.all(
        newImages.map(img => uploadImage(img))
      );
      
      // Update with uploaded URLs
      const finalImages = updatedImages.map(img => {
        const uploaded = uploadedImages.find(u => u.id === img.id);
        return uploaded || img;
      });
      
      onImagesChange(finalImages);
    } catch (err) {
      console.error('File processing error:', err);
    } finally {
      setIsUploading(false);
    }
  }, [images, maxImages, onImagesChange, uploadImage]);

  // Remove image
  const handleRemoveImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  // Retry failed upload
  const handleRetryUpload = useCallback(async (imageId: string) => {
    const imageToRetry = images.find(img => img.id === imageId);
    if (!imageToRetry || !imageToRetry.file) return;
    
    setIsUploading(true);
    try {
      const uploaded = await uploadImage(imageToRetry);
      const updatedImages = images.map(img =>
        img.id === imageId ? uploaded : img
      );
      onImagesChange(updatedImages);
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
            
            {/* Status overlay */}
            {image.status === 'uploading' && (
              <div className="image-overlay uploading">
                <div className="upload-spinner" />
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
