import { useState } from 'react';
import type { Product } from '../../types/product';
import './ProductAttributesTab.css';

/**
 * Product Attributes Tab
 * 
 * Grid/list of product attributes with inline editing
 * 
 * TODO: Wire to attribute registry and validation rules
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Admin UI Build Spec — Settings CRUD: https://www.notion.so/2b845ee1ec5a81e58df8f9633b2e0e2b
 */

interface ProductAttributesTabProps {
  product: Product;
  onUpdate: (path: string, value: any) => void;
}

function ProductAttributesTab({ product, onUpdate }: ProductAttributesTabProps) {
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const handleAddAttribute = () => {
    if (newAttrKey && newAttrValue) {
      onUpdate(`attributes.${newAttrKey}`, newAttrValue);
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const handleUpdateAttribute = (key: string, value: string | string[]) => {
    onUpdate(`attributes.${key}`, value);
  };

  const handleDeleteAttribute = (key: string) => {
    const newAttrs = { ...product.attributes };
    delete newAttrs[key];
    onUpdate('attributes', newAttrs);
  };

  return (
    <div className="editor-tab-content">
      <div className="form-section">
        <h3 className="form-section-title">Product Attributes</h3>
        
        <div className="attributes-grid">
          {Object.entries(product.attributes).map(([key, value]) => (
            <div key={key} className="attribute-card">
              <div className="attribute-header">
                <span className="attribute-key">{key.replace(/_/g, ' ')}</span>
                <button
                  className="attribute-delete"
                  onClick={() => handleDeleteAttribute(key)}
                  title="Remove attribute"
                >
                  ×
                </button>
              </div>
              
              <div className="attribute-value">
                {Array.isArray(value) ? (
                  <div className="attribute-chips">
                    {value.map((v, i) => (
                      <span key={i} className="attribute-chip">{v}</span>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    className="form-input"
                    value={value}
                    onChange={(e) => handleUpdateAttribute(key, e.target.value)}
                  />
                )}
              </div>
              
              {isRequiredAttribute(key) && (
                <div className="attribute-badge">Required</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Add New Attribute</h3>
        <div className="add-attribute-form">
          <input
            type="text"
            className="form-input"
            placeholder="Attribute name (e.g., heel_type)"
            value={newAttrKey}
            onChange={(e) => setNewAttrKey(e.target.value)}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Attribute value"
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
          />
          <button
            className="add-attribute-button"
            onClick={handleAddAttribute}
            disabled={!newAttrKey || !newAttrValue}
          >
            Add Attribute
          </button>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Tip:</strong> Attributes are used for product filtering, search, and AI description generation.
          Use consistent naming (lowercase with underscores).
        </p>
      </div>
    </div>
  );
}

function isRequiredAttribute(key: string): boolean {
  const requiredAttrs = ['color', 'material', 'brand'];
  return requiredAttrs.includes(key);
}

export default ProductAttributesTab;
