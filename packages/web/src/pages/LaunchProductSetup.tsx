/**
 * Launch Product Setup Page
 * 
 * Step 3 of launch product creation: Launch date, comments, and image upload
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../services/authFetch';
import PageLayout from '@/components/common/PageLayout';
import { usePageTitle } from '@/hooks/usePageTitle';
import './LaunchProductSetup.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface LaunchData {
  launchDate: string;
  comments: string;
  images: UploadedImage[];
}

interface UploadedImage {
  id: string;
  filename: string;
  gsPath: string;
  contentType: string;
  uploadedAt: string;
  thumbnailUrl?: string;
}

interface UploadProgress {
  id: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  error?: string;
}

function LaunchProductSetup() {
  const { mpn } = useParams<{ mpn: string }>();
  const navigate = useNavigate();
  
  usePageTitle(`Launch Setup - ${mpn}`);
  
  const [launchData, setLaunchData] = useState<LaunchData>({
    launchDate: '',
    comments: '',
    images: [],
  });
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mpn) {
    return (
      <PageLayout title="Error">
        <div className="launch-setup__error">
          <h2>Invalid Product</h2>
          <p>No MPN provided</p>
        </div>
      </PageLayout>
    );
  }

  // Check if launch can be completed (date + at least one image)
  const canComplete = launchData.launchDate.trim() !== '' && launchData.images.length > 0;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLaunchData(prev => ({
      ...prev,
      launchDate: e.target.value,
    }));
  };

  const handleCommentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLaunchData(prev => ({
      ...prev,
      comments: e.target.value,
    }));
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      const uploadId = crypto.randomUUID();
      
      // Add to upload progress
      setUploads(prev => [...prev, {
        id: uploadId,
        filename: file.name,
        progress: 0,
        status: 'uploading',
      }]);

      try {
        await uploadImage(file, uploadId);
      } catch (error) {
        console.error('Upload failed:', error);
        setUploads(prev => prev.map(upload => 
          upload.id === uploadId 
            ? { ...upload, status: 'error', error: 'Upload failed' }
            : upload
        ));
      }
    }
  };

  const uploadImage = async (file: File, uploadId: string) => {
    try {
      // Step 1: Get signed upload URL
      const signResponse = await authFetch(`${API_BASE}/api/products/${mpn}/images/sign`, {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!signResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, gsPath, imageId } = await signResponse.json();

      // Step 2: Upload file to GCS
      const uploadRequest = new XMLHttpRequest();
      uploadRequest.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads(prev => prev.map(upload => 
            upload.id === uploadId 
              ? { ...upload, progress }
              : upload
          ));
        }
      });

      await new Promise((resolve, reject) => {
        uploadRequest.onload = () => {
          if (uploadRequest.status === 200) {
            resolve(uploadRequest.response);
          } else {
            reject(new Error(`Upload failed: ${uploadRequest.status}`));
          }
        };
        uploadRequest.onerror = () => reject(new Error('Upload failed'));
        
        uploadRequest.open('PUT', uploadUrl);
        uploadRequest.setRequestHeader('Content-Type', file.type);
        uploadRequest.send(file);
      });

      // Step 3: Register image metadata
      const registerResponse = await authFetch(`${API_BASE}/api/products/${mpn}/images`, {
        method: 'POST',
        body: JSON.stringify({
          gsPath,
          filename: file.name,
          contentType: file.type,
          imageId,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Failed to register image');
      }

      const { image } = await registerResponse.json();
      
      // Add to images list
      setLaunchData(prev => ({
        ...prev,
        images: [...prev.images, image],
      }));

      // Update upload status
      setUploads(prev => prev.map(upload => 
        upload.id === uploadId 
          ? { ...upload, status: 'completed', progress: 100 }
          : upload
      ));
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canComplete) {
      setError('Please provide a launch date and upload at least one image');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(`${API_BASE}/api/products/${mpn}/launch`, {
        method: 'POST',
        body: JSON.stringify({
          isLaunch: true,
          launchDate: launchData.launchDate,
          comments: launchData.comments || null,
          images: launchData.images,
          metadata: {},
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create launch product');
      }

      // Navigate to product detail page
      navigate(`/products/${mpn}`);
    } catch (err) {
      console.error('Error creating launch product:', err);
      setError(err instanceof Error ? err.message : 'Failed to create launch product');
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (imageId: string) => {
    setLaunchData(prev => ({
      ...prev,
      images: prev.images.filter(img => img.id !== imageId),
    }));
  };

  return (
    <PageLayout title={`Launch Setup - ${mpn}`}>
      <div className="launch-setup">
        <div className="launch-setup__header">
          <h1 className="launch-setup__title">Launch Product Setup</h1>
          <p className="launch-setup__subtitle">
            Configure launch settings for <strong>{mpn}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="launch-setup__form">
          {/* Launch Date */}
          <div className="launch-setup__section">
            <h2 className="launch-setup__section-title">Launch Date *</h2>
            <div className="launch-setup__field">
              <label htmlFor="launch-date" className="launch-setup__label">
                Select launch date
              </label>
              <input
                id="launch-date"
                type="date"
                className="launch-setup__input"
                value={launchData.launchDate}
                onChange={handleDateChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Comments */}
          <div className="launch-setup__section">
            <h2 className="launch-setup__section-title">Comments</h2>
            <div className="launch-setup__field">
              <label htmlFor="comments" className="launch-setup__label">
                Launch notes (optional)
              </label>
              <textarea
                id="comments"
                className="launch-setup__textarea"
                value={launchData.comments}
                onChange={handleCommentsChange}
                placeholder="Add any notes about this launch..."
                rows={4}
                disabled={loading}
              />
            </div>
          </div>

          {/* Images */}
          <div className="launch-setup__section">
            <h2 className="launch-setup__section-title">Images *</h2>
            <p className="launch-setup__requirement">At least one image is required</p>
            
            <div className="launch-setup__field">
              <label htmlFor="image-upload" className="launch-setup__upload-label">
                Upload Images
              </label>
              <input
                id="image-upload"
                type="file"
                className="launch-setup__upload-input"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={loading}
              />
              <div className="launch-setup__upload-help">
                Select one or more images (JPG, PNG, GIF, WebP)
              </div>
            </div>

            {/* Upload Progress */}
            {uploads.length > 0 && (
              <div className="launch-setup__uploads">
                <h3 className="launch-setup__uploads-title">Uploads</h3>
                {uploads.map(upload => (
                  <div key={upload.id} className="launch-setup__upload-item">
                    <span className="launch-setup__upload-filename">{upload.filename}</span>
                    <div className="launch-setup__upload-progress">
                      <div 
                        className="launch-setup__upload-progress-bar"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                    <span className={`launch-setup__upload-status launch-setup__upload-status--${upload.status}`}>
                      {upload.status === 'completed' ? '✓' : upload.status === 'error' ? '✗' : `${upload.progress}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Uploaded Images */}
            {launchData.images.length > 0 && (
              <div className="launch-setup__images">
                <h3 className="launch-setup__images-title">Uploaded Images</h3>
                <div className="launch-setup__images-grid">
                  {launchData.images.map(image => (
                    <div key={image.id} className="launch-setup__image-item">
                      <div className="launch-setup__image-placeholder">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                      <span className="launch-setup__image-filename">{image.filename}</span>
                      <button
                        type="button"
                        className="launch-setup__image-remove"
                        onClick={() => removeImage(image.id)}
                        disabled={loading}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="launch-setup__error" role="alert">
              {error}
            </div>
          )}

          <div className="launch-setup__actions">
            <button
              type="button"
              className="launch-setup__button launch-setup__button--secondary"
              onClick={() => navigate(`/products/${mpn}`)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="launch-setup__button launch-setup__button--primary"
              disabled={!canComplete || loading}
            >
              {loading ? (
                <>
                  <svg className="launch-setup__spinner" width="16" height="16" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor"/>
                  </svg>
                  Creating Launch...
                </>
              ) : (
                'Complete Launch Setup'
              )}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}

export default LaunchProductSetup;