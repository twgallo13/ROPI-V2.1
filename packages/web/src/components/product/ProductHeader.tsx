import type { Product } from '../../types/product';
import './ProductHeader.css';

/**
 * Product Header Component
 * 
 * Displays product metadata in header bar: SKU, name, status, website chips
 * 
 * TODO: Wire Save/Publish actions to backend
 * References:
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface ProductHeaderProps {
  product: Product;
  onSave: () => void;
  onPublish: () => void;
  onBack: () => void;
}

function ProductHeader({ product, onSave, onPublish, onBack }: ProductHeaderProps) {
  const statusLabels = {
    'draft': 'Draft',
    'in-progress': 'In Progress',
    'export-ready': 'Export Ready',
  };

  const statusColors = {
    'draft': 'status-draft',
    'in-progress': 'status-progress',
    'export-ready': 'status-ready',
  };

  return (
    <div className="product-header">
      <div className="product-header-left">
        <button onClick={onBack} className="product-back-button">
          ← Back to Products
        </button>
      </div>
      
      <div className="product-header-center">
        <div className="product-header-field">
          <span className="product-header-label">SKU:</span>
          <span className="product-header-value">{product.sku}</span>
        </div>
        
        <div className="product-header-field">
          <span className="product-header-label">Name:</span>
          <span className="product-header-value">{product.name}</span>
        </div>
        
        <div className={`product-status-chip ${statusColors[product.status] || 'status-draft'}`}>
          {statusLabels[product.status] || 'Unknown'}
        </div>
        
        {/* LP-3.0.2: Defensive guard for websites array */}
        {(product.websites ?? []).map(website => (
          <div key={website} className="product-website-chip">
            {website}
          </div>
        ))}
        
        <div className="product-header-metadata">
          <span className="product-header-meta-item">
            Brand: <strong>{product.brand ?? 'N/A'}</strong>
          </span>
          <span className="product-header-meta-item">
            Category: <strong>{product.category ?? 'N/A'}</strong>
          </span>
        </div>
      </div>
      
      <div className="product-header-right">
        <button 
          onClick={onSave}
          className="product-action-button product-action-secondary"
        >
          Save Draft
        </button>
        <button 
          onClick={onPublish}
          className="product-action-button product-action-primary"
          disabled={(product.exportReadiness?.overall ?? 0) < 80}
        >
          Publish
        </button>
      </div>
    </div>
  );
}

export default ProductHeader;
