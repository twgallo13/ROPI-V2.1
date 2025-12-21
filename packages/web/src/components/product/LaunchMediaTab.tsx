import type { Product } from '../../types/product';
import './LaunchMediaTab.css';

/**
 * Launch & Media Tab
 * 
 * Launch configuration and media asset management
 * 
 * TODO: Integrate real file upload and CDN storage
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface LaunchMediaTabProps {
  product: Product;
  onUpdate: (path: string, value: any) => void;
}

function LaunchMediaTab({ product, onUpdate }: LaunchMediaTabProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onUpdate(field, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="editor-tab-content">
      <div className="form-section">
        <h3 className="form-section-title">Launch Configuration</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              Launch Date <span className="required">*</span>
            </label>
            <input
              type="date"
              className="form-input"
              value={product.launchDate}
              onChange={(e) => onUpdate('launchDate', e.target.value)}
            />
          </div>

          <div className="form-field">
            <label className="form-label">Launch Status</label>
            <select
              className="form-input"
              value={product.launchStatus}
              onChange={(e) => onUpdate('launchStatus', e.target.value)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="soft_launch">Soft Launch</option>
              <option value="full_launch">Full Launch</option>
              <option value="delayed">Delayed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Hero Image</h3>
        <div className="media-upload-area">
          {/* LP-3.0.2: Defensive guard for media object */}
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
        <div className="media-gallery">
          {/* LP-3.0.2: Defensive guard for gallery array */}
          {(product.media?.gallery ?? []).map((img, index) => (
            <div key={index} className="gallery-item">
              <img src={img} alt={`Gallery ${index + 1}`} className="gallery-image" />
              <button
                className="gallery-remove"
                onClick={() => {
                  const newGallery = (product.media?.gallery ?? []).filter((_, i) => i !== index);
                  onUpdate('media.gallery', newGallery);
                }}
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    const newGallery = [...(product.media?.gallery ?? []), dataUrl];
                    onUpdate('media.gallery', newGallery);
                  };
                  reader.readAsDataURL(file);
                }
              }}
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
