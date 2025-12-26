import { useMemo } from 'react';
import type { Product } from '../../types/product';
import { useAttributeRegistry } from '../../hooks/useAttributeRegistry';
import './LaunchMediaTab.css';

/**
 * Launch & Media Tab — LP-0.4.1
 * 
 * Tab 3: Launch configuration and media asset management
 * 
 * Fields (per LP-0.4.1):
 * - hype: Boolean flag for HYPE products
 * - family_sizing: Family sizing info
 * - launch_date: Product launch date
 * - kl_post_date: KL post date
 * - Media gallery with media_status indicator
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface LaunchMediaTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * Calculate media status based on image presence
 */
function calculateMediaStatus(product: Product): 'complete' | 'partial' | 'missing' {
  const hasHero = Boolean(product.media?.heroImage);
  const galleryCount = product.media?.gallery?.length ?? 0;
  
  if (hasHero && galleryCount >= 3) {
    return 'complete';
  } else if (hasHero || galleryCount > 0) {
    return 'partial';
  }
  return 'missing';
}

/**
 * Media status display configuration
 */
const mediaStatusConfig = {
  complete: { icon: '✓', label: 'Complete', className: 'media-status--complete' },
  partial: { icon: '◐', label: 'Partial', className: 'media-status--partial' },
  missing: { icon: '○', label: 'Missing', className: 'media-status--missing' },
};

function LaunchMediaTab({ product, onUpdate }: LaunchMediaTabProps) {
  const { getAttributeById } = useAttributeRegistry();
  
  // Get attribute definitions for field rendering
  const hypeAttr = getAttributeById('hype');
  const familySizingAttr = getAttributeById('family_sizing');
  const launchDateAttr = getAttributeById('launch_date');
  const klPostDateAttr = getAttributeById('kl_post_date');
  
  // Calculate media status based on current images
  const mediaStatus = useMemo(() => calculateMediaStatus(product), [product]);
  const statusDisplay = mediaStatusConfig[mediaStatus];

  // Update parent media_status when images change
  const updateMediaStatus = (newStatus: 'complete' | 'partial' | 'missing') => {
    onUpdate('media_status', newStatus);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onUpdate(field, dataUrl);
        // Update media_status after image change
        setTimeout(() => {
          const newStatus = calculateMediaStatus({
            ...product,
            media: {
              ...product.media,
              [field === 'media.heroImage' ? 'heroImage' : 'gallery']: 
                field === 'media.heroImage' ? dataUrl : [...(product.media?.gallery ?? []), dataUrl]
            }
          } as Product);
          updateMediaStatus(newStatus);
        }, 0);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const newGallery = [...(product.media?.gallery ?? []), dataUrl];
        onUpdate('media.gallery', newGallery);
        // Update media_status after gallery change
        const newStatus = calculateMediaStatus({
          ...product,
          media: { ...product.media, gallery: newGallery }
        } as Product);
        updateMediaStatus(newStatus);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    const newGallery = (product.media?.gallery ?? []).filter((_, i) => i !== index);
    onUpdate('media.gallery', newGallery);
    // Update media_status after removal
    const newStatus = calculateMediaStatus({
      ...product,
      media: { ...product.media, gallery: newGallery }
    } as Product);
    updateMediaStatus(newStatus);
  };

  // Get values using snake_case attribute IDs (now typed on Product)
  const hypeValue = product.hype ?? 
                    (product.attributes?.hype as unknown as boolean) ?? false;
  const familySizingValue = product.family_sizing ?? 
                            (product.attributes?.family_sizing as string) ?? '';
  const launchDateValue = product.launch_date ?? 
                          product.launchDate ?? '';
  const klPostDateValue = product.kl_post_date ?? 
                          (product.attributes?.kl_post_date as string) ?? '';

  return (
    <div className="editor-tab-content">
      {/* Media Status Indicator */}
      <div className="media-status-banner">
        <span className={`media-status-indicator ${statusDisplay.className}`}>
          <span className="media-status-icon">{statusDisplay.icon}</span>
          <span className="media-status-label">Media Status: {statusDisplay.label}</span>
        </span>
        <span className="media-status-detail">
          {product.media?.heroImage ? '✓ Hero' : '○ No Hero'} • 
          {(product.media?.gallery?.length ?? 0)} gallery images
        </span>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Launch Configuration</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              {launchDateAttr?.label ?? 'Launch Date'}
            </label>
            <input
              type="date"
              className="form-input"
              value={launchDateValue}
              onChange={(e) => onUpdate('launch_date', e.target.value)}
              data-field="product.launch_date"
              name="product.launch_date"
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              {klPostDateAttr?.label ?? 'KL Post Date'}
            </label>
            <input
              type="date"
              className="form-input"
              value={klPostDateValue}
              onChange={(e) => onUpdate('kl_post_date', e.target.value)}
              data-field="product.kl_post_date"
              name="product.kl_post_date"
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              {familySizingAttr?.label ?? 'Family Sizing'}
            </label>
            <input
              type="text"
              className="form-input"
              value={familySizingValue}
              onChange={(e) => onUpdate('family_sizing', e.target.value)}
              data-field="product.family_sizing"
              name="product.family_sizing"
              placeholder="e.g., Runs small, True to size"
            />
          </div>

          <div className="form-field">
            <label className="form-label checkbox-field-label">
              <input
                type="checkbox"
                checked={hypeValue}
                onChange={(e) => onUpdate('hype', e.target.checked)}
                data-field="product.hype"
                name="product.hype"
              />
              <span>{hypeAttr?.label ?? 'HYPE'}</span>
            </label>
            <span className="form-hint">Mark as high-demand/limited release product</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Hero Image</h3>
        <div className="media-upload-area">
          {product.media?.heroImage ? (
            <div className="media-preview">
              <img src={product.media.heroImage} alt="Hero" className="media-preview-image" />
              <div className="media-preview-overlay">
                <label className="media-upload-button">
                  Change Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'media.heroImage')}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <label className="media-upload-placeholder">
              <div className="upload-icon">📷</div>
              <p>Click to upload hero image</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'media.heroImage')}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Gallery Images</h3>
        <p className="form-section-description">
          Add at least 3 gallery images for "Complete" media status.
        </p>
        <div className="media-gallery">
          {(product.media?.gallery ?? []).map((img, index) => (
            <div key={index} className="gallery-item">
              <img src={img} alt={`Gallery ${index + 1}`} className="gallery-image" />
              <button
                className="gallery-remove"
                onClick={() => handleRemoveGalleryImage(index)}
              >
                Remove
              </button>
            </div>
          ))}
          
          <label className="gallery-add">
            <div className="gallery-add-icon">+</div>
            <p>Add Image</p>
            <input
              type="file"
              accept="image/*"
              onChange={handleGalleryImageUpload}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Note:</strong> Images are stored as data URLs for demo purposes. 
          Production version will upload to CDN.
        </p>
      </div>
    </div>
  );
}

export default LaunchMediaTab;
