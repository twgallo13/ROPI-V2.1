import { useMemo } from 'react';
import type { Product, FieldProvenance } from '../../types/product';
import { useAttributeRegistry, type Attribute } from '../../hooks/useAttributeRegistry';
import { formatForDateInput } from '../../utils/dateUtils';
import { FieldBadge } from './FieldBadge';
import { getProvenanceKey } from '../../services/productService';
import './ProductAttributesTab.css';

/**
 * Product Attributes Tab — LP-0.4.4
 * 
 * Tab 2: Physical product traits and characteristics
 * 
 * LP-0.4.4: Removed gender, age_group (moved to Tab 1), outsole_material (deprecated)
 * 
 * Displays ONLY these attributes:
 * - primary_color, descriptive_color, material
 * - fit, cut_type, closure_type
 * - league, sports_team, collection_name
 * 
 * LP-0.4.2.2: Fast Fashion Footwear Group
 * - fast_fashion toggle at top of new section
 * - When true: shows Fast Fashion Details sub-section with:
 *   heel_height, platform_height, heel_type, shoe_height_map
 * 
 * All attribute IDs use snake_case to match attribute-registry.json
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

// LP-0.4.4: Physical trait attribute IDs (Tab 2 only)
// Removed: gender, age_group (moved to Tab 1), outsole_material (deprecated)
const TAB2_ATTRIBUTE_IDS = [
  'primary_color',
  'descriptive_color',
  'material',
  'fit',
  'cut_type',
  'closure_type',
  'league',
  'sports_team',
  'collection_name',
];

// LP-0.4.2.2: Fast Fashion specific attributes
const FAST_FASHION_ATTRIBUTE_IDS = [
  'heel_height',
  'platform_height',
  'heel_type',
  'shoe_height_map',
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
 * LP-smart-rules-ui-provenance-1.0.0: Get provenance for an attribute field.
 * Uses the provenance key format with underscores (attributes_gender).
 * 
 * @param product - Product object
 * @param attributeKey - Attribute key (e.g., 'gender')
 * @returns FieldProvenance or undefined
 */
function getAttributeProvenance(product: Product, attributeKey: string): FieldProvenance | undefined {
  const fieldPath = `attributes.${attributeKey}`;
  const provenanceKey = getProvenanceKey(fieldPath);
  return product.provenance?.[provenanceKey];
}

/**
 * LP-1.4.0: Ensure a value is an array for multiSelect rendering
 * Coerces string values to single-element arrays defensively.
 */
function ensureArrayForMultiSelect(value: unknown): unknown[] {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    // Split if contains delimiters, otherwise wrap as single item
    if (value.includes('|') || value.includes(',') || value.includes(';')) {
      return value.split(/[|,;]/).map(s => s.trim()).filter(s => s.length > 0);
    }
    return [value];
  }
  return [value];
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
  // LP-1.4.0: Use defensive array conversion for multiSelect fields
  const arrayValue = attr.data_type === 'multiSelect' 
    ? ensureArrayForMultiSelect(value) as string[]
    : (Array.isArray(value) ? value : []);
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
        <div className="multi-select-wrapper">
          <select
            multiple
            className="form-select form-select-mult"
            value={arrayValue}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              onChange(selected);
            }}
            data-testid={`attr-input-${attr.attribute_id}`}
            data-field={fieldKey}
            name={fieldKey}
          >
            {(attr.allowed_values || []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {attr.allow_custom_values && (
            <div className="multi-select-custom">
              <input
                type="text"
                className="form-input"
                placeholder="Add custom value and press Enter"
                data-testid={`attr-custom-input-${attr.attribute_id}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (!v) return;
                    const next = Array.from(new Set([...arrayValue, v]));
                    onChange(next);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
            </div>
          )}
        </div>
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
      // LP-1.4.6.4: Use formatForDateInput to ensure YYYY-MM-DD format for <input type="date">
      const formattedDateValue = formatForDateInput(stringValue) ?? '';
      console.debug('LP-1.4.6.4 bind date', { key: attr.attribute_id, raw: stringValue, inputValue: formattedDateValue });
      return (
        <input
          type="date"
          className="form-input"
          value={formattedDateValue}
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

  // LP-0.4.2.2: Get fast_fashion value (supports both attribute and top-level)
  const fastFashionValue = Boolean(
    (product as unknown as Record<string, unknown>).fast_fashion ?? 
    product.attributes?.fast_fashion ?? 
    false
  );

  // LP-0.4.1: Filter to only Tab 2 physical trait attributes
  const tab2Attributes = useMemo(() => {
    return TAB2_ATTRIBUTE_IDS
      .map(id => getAttributeById(id))
      .filter((attr): attr is Attribute => attr !== undefined);
  }, [getAttributeById]);

  // LP-0.4.2.2: Fast Fashion specific attributes
  const fastFashionAttributes = useMemo(() => {
    return FAST_FASHION_ATTRIBUTE_IDS
      .map(id => getAttributeById(id))
      .filter((attr): attr is Attribute => attr !== undefined);
  }, [getAttributeById]);

  // LP-0.4.2.2: Get fast_fashion attribute definition for toggle
  const fastFashionAttr = useMemo(() => getAttributeById('fast_fashion'), [getAttributeById]);

  // Track any missing attributes from registry for PR comment
  const missingFromRegistry = useMemo(() => {
    const allIds = [...TAB2_ATTRIBUTE_IDS, ...FAST_FASHION_ATTRIBUTE_IDS, 'fast_fashion'];
    return allIds.filter(id => !getAttributeById(id));
  }, [getAttributeById]);

  // Use compatibility helper to gather attributes from both new (attributes.*) and legacy (top-level) formats
  const productAttrs: Record<string, unknown> = {};
  [...tab2Attributes, ...fastFashionAttributes].forEach((attr) => {
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
            const provenance = getAttributeProvenance(product, key);
            const fieldPath = `attributes.${key}`;

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
                  {/* LP-smart-rules-ui-provenance-1.0.0: Smart Rule badge */}
                  <FieldBadge provenance={provenance} fieldPath={fieldPath} />
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
        </div>
      </div>

      {/* LP-0.4.2.2: Fast Fashion Section */}
      <div className="form-section">
        <h3 className="form-section-title">Fast Fashion</h3>
        <p className="form-section-description">
          Enable for footwear with detailed heel and height specifications.
        </p>

        {/* Fast Fashion Toggle */}
        {fastFashionAttr && (
          <div className="fast-fashion-toggle" data-testid="fast-fashion-toggle">
            <label className="checkbox-label checkbox-label-prominent">
              <input
                type="checkbox"
                checked={fastFashionValue}
                onChange={(e) => handleUpdateAttribute('fast_fashion', e.target.checked)}
                data-testid="attr-input-fast_fashion"
                data-field="attributes.fast_fashion"
                name="attributes.fast_fashion"
              />
              <span className="toggle-label">
                <strong>{fastFashionAttr.label}</strong>
                {fastFashionAttr.ai_usage_notes && (
                  <span className="toggle-hint"> — {fastFashionAttr.ai_usage_notes}</span>
                )}
              </span>
            </label>
          </div>
        )}

        {/* LP-0.4.2.2: Conditional Fast Fashion Details */}
        {fastFashionValue && fastFashionAttributes.length > 0 && (
          <div className="fast-fashion-details" data-testid="fast-fashion-details">
            <h4 className="form-subsection-title">Fast Fashion Details</h4>
            <div className="attributes-grid attributes-grid-highlighted">
              {fastFashionAttributes.map((attr) => {
                const key = attr.attribute_id;
                const value = productAttrs[key] ?? '';
                const isRequired = Boolean(attr.required_for_completion);
                const provenance = getAttributeProvenance(product, key);
                const fieldPath = `attributes.${key}`;

                return (
                  <div
                    key={key}
                    className={`attribute-card attribute-card-highlighted ${isRequired && !value ? 'attribute-required-missing' : ''}`}
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
                      {/* LP-smart-rules-ui-provenance-1.0.0: Smart Rule badge */}
                      <FieldBadge provenance={provenance} fieldPath={fieldPath} />
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
            </div>
          </div>
        )}

        {/* Collapsed hint when Fast Fashion is off */}
        {!fastFashionValue && (
          <div className="fast-fashion-hint" data-testid="fast-fashion-hint">
            <p className="text-muted">
              Enable Fast Fashion to show heel height, platform height, heel type, and shoe height fields.
            </p>
          </div>
        )}
      </div>

      {/* Render placeholder cards for missing registry attributes */}
      {missingFromRegistry.length > 0 && (
        <div className="form-section">
          <h3 className="form-section-title">Missing Attributes</h3>
          <div className="attributes-grid">
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
      )}

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
