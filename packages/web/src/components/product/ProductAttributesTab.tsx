import { useState } from 'react';
import type { Product } from '../../types/product';
import { useAttributeRegistry, type Attribute } from '../../hooks/useAttributeRegistry';
import './ProductAttributesTab.css';

/**
 * Product Attributes Tab
 * 
 * Grid/list of product attributes with inline editing.
 * Renders form controls based on attribute data_type from the registry.
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */

interface ProductAttributesTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * Renders the appropriate input control based on attribute data_type
 */
function AttributeInput({
  attr,
  value,
  onChange,
}: {
  attr: Attribute;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const stringValue = typeof value === 'string' ? value : '';
  const arrayValue = Array.isArray(value) ? value : [];

  switch (attr.data_type) {
    case 'enum':
      return (
        <select
          className="form-select"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`attr-input-${attr.attribute_id}`}
        >
          <option value="">— Select —</option>
          {(attr.allowed_values || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    case 'multiSelect':
      return (
        <input
          type="text"
          className="form-input"
          value={arrayValue.join(', ')}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            )
          }
          placeholder="Enter values separated by commas"
          data-testid={`attr-input-${attr.attribute_id}`}
        />
      );

    case 'boolean':
      return (
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            data-testid={`attr-input-${attr.attribute_id}`}
          />
          <span>{value ? 'Yes' : 'No'}</span>
        </label>
      );

    case 'number':
    case 'currency':
      return (
        <input
          type="number"
          className="form-input"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
          step={attr.data_type === 'currency' ? '0.01' : 'any'}
          data-testid={`attr-input-${attr.attribute_id}`}
        />
      );

    case 'date':
      return (
        <input
          type="date"
          className="form-input"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`attr-input-${attr.attribute_id}`}
        />
      );

    case 'json':
      return (
        <textarea
          className="form-input form-textarea"
          value={typeof value === 'string' ? value : JSON.stringify(value || '', null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              onChange(e.target.value);
            }
          }}
          rows={3}
          data-testid={`attr-input-${attr.attribute_id}`}
        />
      );

    case 'string':
    default:
      return (
        <input
          type="text"
          className="form-input"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`attr-input-${attr.attribute_id}`}
        />
      );
  }
}

function ProductAttributesTab({ product, onUpdate }: ProductAttributesTabProps) {
  const { activeAttributes, loading, error } = useAttributeRegistry();
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const productAttrs = product.attributes || {};

  // Get attribute IDs that are in registry
  const registryIds = new Set(activeAttributes.map((a) => a.attribute_id));

  // Get product attributes not in the registry (derived/custom)
  const derivedAttrKeys = Object.keys(productAttrs).filter((k) => !registryIds.has(k));

  const handleAddAttribute = () => {
    if (newAttrKey && newAttrValue) {
      onUpdate(`attributes.${newAttrKey}`, newAttrValue);
      setNewAttrKey('');
      setNewAttrValue('');
    }
  };

  const handleUpdateAttribute = (key: string, value: unknown) => {
    onUpdate(`attributes.${key}`, value);
  };

  const handleDeleteAttribute = (key: string) => {
    const newAttrs = { ...productAttrs };
    delete newAttrs[key];
    onUpdate('attributes', newAttrs);
  };

  if (loading) {
    return (
      <div className="editor-tab-content">
        <div className="loading">Loading attribute registry...</div>
      </div>
    );
  }

  return (
    <div className="editor-tab-content">
      {error && (
        <div className="error-banner">
          Unable to load attribute registry: {error}
        </div>
      )}

      <div className="form-section">
        <h3 className="form-section-title">Product Attributes</h3>

        <div className="attributes-grid">
          {/* Render attributes from registry */}
          {activeAttributes.map((attr) => {
            const key = attr.attribute_id;
            const value = productAttrs[key] ?? '';
            const isRequired = Boolean(attr.required_for_completion);

            return (
              <div
                key={key}
                className={`attribute-card ${isRequired && !value ? 'attribute-required-missing' : ''}`}
                data-testid={`attr-card-${key}`}
              >
                <div className="attribute-header">
                  <span className="attribute-key" title={attr.ai_usage_notes || ''}>
                    {attr.label}
                  </span>
                  {isRequired && <span className="attribute-badge">Required</span>}
                  {attr.category && (
                    <span className="attribute-category">{attr.category}</span>
                  )}
                </div>

                <div className="attribute-value">
                  <AttributeInput
                    attr={attr}
                    value={value}
                    onChange={(val) => handleUpdateAttribute(key, val)}
                  />
                </div>

                {attr.ai_usage_notes && (
                  <div className="attribute-note" title={attr.ai_usage_notes}>
                    💡 {attr.ai_usage_notes}
                  </div>
                )}
              </div>
            );
          })}

          {/* Render derived/custom attributes not in registry */}
          {derivedAttrKeys.map((key) => {
            const value = productAttrs[key];
            return (
              <div key={key} className="attribute-card attribute-derived" data-testid={`attr-card-${key}`}>
                <div className="attribute-header">
                  <span className="attribute-key">{key.replace(/_/g, ' ')}</span>
                  <span className="attribute-badge attribute-badge-derived">Custom</span>
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
                        <span key={i} className="attribute-chip">
                          {v}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={typeof value === 'string' ? value : String(value)}
                      onChange={(e) => handleUpdateAttribute(key, e.target.value)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Add Custom Attribute</h3>
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
          <strong>Tip:</strong> Attributes are used for product filtering, search, and AI
          description generation. Use consistent naming (lowercase with underscores).
        </p>
      </div>
    </div>
  );
}

export default ProductAttributesTab;
