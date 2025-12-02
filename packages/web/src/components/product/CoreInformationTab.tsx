import type { Product } from '../../types/product';
import './CoreInformationTab.css';

/**
 * Core Information Tab
 * 
 * Product identification, classification, and lifecycle information
 * 
 * TODO: Wire form submissions to Firestore
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 */

interface CoreInformationTabProps {
  product: Product;
  onUpdate: (path: string, value: any) => void;
}

function CoreInformationTab({ product, onUpdate }: CoreInformationTabProps) {
  return (
    <div className="editor-tab-content">
      <div className="form-section">
        <h3 className="form-section-title">Identification</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              SKU <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.sku}
              onChange={(e) => onUpdate('sku', e.target.value)}
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Style ID <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.styleId}
              onChange={(e) => onUpdate('styleId', e.target.value)}
            />
          </div>
          
          <div className="form-field form-field-full">
            <label className="form-label">
              Product Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.name}
              onChange={(e) => onUpdate('name', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Classification</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              Brand <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.brand}
              onChange={(e) => onUpdate('brand', e.target.value)}
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Category <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.category}
              onChange={(e) => onUpdate('category', e.target.value)}
            />
          </div>
          
          <div className="form-field">
            <label className="form-label">
              Department <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={product.department}
              onChange={(e) => onUpdate('department', e.target.value)}
            >
              <option value="">Select...</option>
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Kids">Kids</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>
          
          <div className="form-field">
            <label className="form-label">Subcategory</label>
            <input
              type="text"
              className="form-input"
              value={product.subcategory}
              onChange={(e) => onUpdate('subcategory', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Lifecycle</h3>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">First Received</label>
            <input
              type="date"
              className="form-input"
              value={product.firstReceived}
              onChange={(e) => onUpdate('firstReceived', e.target.value)}
            />
          </div>
          
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
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Website Assignment</h3>
        <div className="form-field">
          <label className="form-label">
            Active Websites <span className="required">*</span>
          </label>
          <div className="checkbox-group">
            {['shiekh.com', 'shiekhshoes.com', 'example.com'].map(website => (
              <label key={website} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={product.websites.includes(website)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...product.websites, website]
                      : product.websites.filter(w => w !== website);
                    onUpdate('websites', updated);
                  }}
                />
                {website}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Note:</strong> Fields marked with <span className="required">*</span> are required 
          for export readiness. See Export Readiness panel for details.
        </p>
      </div>
    </div>
  );
}

export default CoreInformationTab;
