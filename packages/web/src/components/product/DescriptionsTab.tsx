import type { Product } from '../../types/product';
import './DescriptionsTab.css';

/**
 * Descriptions & SEO Tab
 * 
 * Per-website product descriptions and SEO metadata
 * 
 * TODO: Integrate rich text editor and AI description generation
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface DescriptionsTabProps {
  product: Product;
  onUpdate: (path: string, value: any) => void;
}

function DescriptionsTab({ product, onUpdate }: DescriptionsTabProps) {
  return (
    <div className="editor-tab-content">
      {product.websites.map(website => (
        <div key={website} className="form-section">
          <h3 className="form-section-title">{website}</h3>
          
          <div className="form-field">
            <label className="form-label">
              Product Description <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={6}
              value={product.descriptions[website]?.main || ''}
              onChange={(e) => onUpdate(`descriptions.${website}.main`, e.target.value)}
              placeholder="Enter compelling product description..."
            />
            <div className="character-count">
              {(product.descriptions[website]?.main || '').length} characters
              {(product.descriptions[website]?.main || '').length < 100 && (
                <span className="count-warning"> (recommended: 100+ characters)</span>
              )}
            </div>
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">
                SEO Title <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                value={product.descriptions[website]?.seoTitle || ''}
                onChange={(e) => onUpdate(`descriptions.${website}.seoTitle`, e.target.value)}
                placeholder="SEO-optimized page title"
                maxLength={60}
              />
              <div className="character-count">
                {(product.descriptions[website]?.seoTitle || '').length}/60 characters
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">
                Meta Description <span className="required">*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={3}
                value={product.descriptions[website]?.metaDescription || ''}
                onChange={(e) => onUpdate(`descriptions.${website}.metaDescription`, e.target.value)}
                placeholder="Brief description for search engines"
                maxLength={160}
              />
              <div className="character-count">
                {(product.descriptions[website]?.metaDescription || '').length}/160 characters
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="form-section">
        <h3 className="form-section-title">AI Description Sample</h3>
        <div className="ai-sample-box">
          <div className="ai-sample-header">
            <span className="ai-sample-label">🤖 AI-Generated Sample</span>
            <button className="ai-sample-button">Regenerate</button>
          </div>
          <p className="ai-sample-text">
            Elevate your sneaker game with the Nike Air Max 270. This cutting-edge design features 
            Nike's largest heel Air unit yet, delivering unparalleled cushioning and all-day comfort. 
            The sleek black and white colorway offers versatile style, while the breathable mesh and 
            synthetic upper keeps your feet cool during any activity.
          </p>
          <div className="ai-sample-footer">
            <span className="ai-confidence">Confidence: 88%</span>
            <button className="ai-apply-button">Apply to Description</button>
          </div>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Tip:</strong> AI-generated descriptions are based on product attributes, images, 
          and brand guidelines. Review and edit before applying.
        </p>
      </div>
    </div>
  );
}

export default DescriptionsTab;
