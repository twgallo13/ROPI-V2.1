import { useMemo } from 'react';
import type { Product } from '../../types/product';
import { useAttributeRegistry, type Attribute } from '../../hooks/useAttributeRegistry';
import './ProductAttributesTab.css';

/**
 * Product Attributes Tab — LP-0.4.1
 * 
 * Tab 2: Physical product traits and characteristics
 * 
 * Displays ONLY these attributes (per LP-0.4.1):
 * - gender, age_group, primary_color, descriptive_color
 * - material, outsole_material, fit, cut_type, closure_type
 * - heel_height, platform_height, league, sports_team, collection_name
 * 
 * All attribute IDs use snake_case to match attribute-registry.json
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

// LP-0.4.1: Physical trait attribute IDs (Tab 2 only)
const TAB2_ATTRIBUTE_IDS = [
  'gender',
  'age_group',
  'primary_color',
  'descriptive_color',
  'material',
  'outsole_material',
  'fit',
  'cut_type',
  'closure_type',
  'heel_height',
  'platform_height',
  'league',
  'sports_team',
  'collection_name',
];

interface ProductAttributesTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

/**
 * Compatibility helper to read attribute values from both new and legacy formats.
 * Tries new format (attributes.*) first, then falls back to top-level key.
 * 
 * @param product - Product object
 * @param attributeKey - Attribute key to read (e.g., 'department', 'category')
 * @returns Attribute value from either location, or undefined if not found
 */
function getAttributeValue(product: Product, attributeKey: string): unknown {
  // Try new format: attributes.*
  if (product.attributes?.[attributeKey] !== undefined) {
    return product.attributes[attributeKey];
  }
  // Fallback to legacy format: top-level key
  return (product as unknown as Record<string, unknown>)[attributeKey];
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
  // Canonical field key for scroll-to-field targeting (LP-1.0.2)
  const fieldKey = `attributes.${attr.attribute_id}`;

  switch (attr.data_type) {
    case 'enum':
      return (
        <select
          className="form-select"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          data-testid={`attr-input-${attr.attribute_id}`}
          data-field={fieldKey}
          name={fieldKey}
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
          data-field={fieldKey}
          name={fieldKey}
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
            data-field={fieldKey}
            name={fieldKey}
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
          data-field={fieldKey}
          name={fieldKey}
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
          data-field={fieldKey}
          name={fieldKey}
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
          data-field={fieldKey}
          name={fieldKey}
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
          data-field={fieldKey}
          name={fieldKey}
        />
      );
  }
}

function ProductAttributesTab({ product, onUpdate }: ProductAttributesTabProps) {
  const { loading, error, getAttributeById } = useAttributeRegistry();

  // LP-0.4.1: Filter to only Tab 2 physical trait attributes
  const tab2Attributes = useMemo(() => {
    return TAB2_ATTRIBUTE_IDS
      .map(id => getAttributeById(id))
      .filter((attr): attr is Attribute => attr !== undefined);
  }, [getAttributeById]);

  // Track any missing attributes from registry for PR comment
  const missingFromRegistry = useMemo(() => {
    return TAB2_ATTRIBUTE_IDS.filter(id => !getAttributeById(id));
  }, [getAttributeById]);

  // Use compatibility helper to gather attributes from both new (attributes.*) and legacy (top-level) formats
  const productAttrs: Record<string, unknown> = {};
  tab2Attributes.forEach((attr) => {
    const value = getAttributeValue(product, attr.attribute_id);
    if (value !== undefined) {
      productAttrs[attr.attribute_id] = value;
    }
  });

  const handleUpdateAttribute = (key: string, value: unknown) => {
    onUpdate(`attributes.${key}`, value);
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

      {/* LP-0.4.1: Flag missing attributes as placeholder */}
      {missingFromRegistry.length > 0 && (
        <div className="warning-banner">
          <strong>Missing from Registry:</strong> {missingFromRegistry.join(', ')}
          <br />
          <small>These attributes need to be added to attribute-registry.json</small>
        </div>
      )}

      <div className="form-section">
        <h3 className="form-section-title">Physical Traits</h3>
        <p className="form-section-description">
          Product characteristics used for filtering, search, and AI description generation.
        </p>

        <div className="attributes-grid">
          {/* Render only Tab 2 attributes from registry */}
          {tab2Attributes.map((attr) => {
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

          {/* Render placeholder cards for missing registry attributes */}
          {missingFromRegistry.map((key) => (
            <div key={key} className="attribute-card attribute-placeholder" data-testid={`attr-card-${key}`}>
              <div className="attribute-header">
                <span className="attribute-key">{key.replace(/_/g, ' ')}</span>
                <span className="attribute-badge attribute-badge-missing">Missing</span>
              </div>
              <div className="attribute-value">
                <input
                  type="text"
                  className="form-input form-input-placeholder"
                  placeholder="Attribute not in registry"
                  disabled
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Tip:</strong> These attributes are used for product filtering, search, and AI
          description generation. Values come from the attribute registry.
        </p>
      </div>
    </div>
  );
}

export default ProductAttributesTab;
