import type { Product } from '../../types/product';
import { useAttributeRegistry } from '../../hooks/useAttributeRegistry';
import './TechnicalTab.css';

/**
 * Technical Tab — LP-0.4.2
 * 
 * Tab 4: Foundational identifiers and shipping data
 * 
 * Fields (per LP-0.4.2):
 * - sku: Stock Keeping Unit
 * - styleId: Manufacturer style ID
 * - gtin: Global Trade Item Number (UPC/EAN)
 * - tax_class: Tax classification (dropdown from registry)
 * - height, length, width, weight: Package dimensions
 * - first_received: Read-only metadata field
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface TechnicalTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

function TechnicalTab({ product, onUpdate }: TechnicalTabProps) {
  const { getAttributeById } = useAttributeRegistry();
  
  // Get attribute definitions for field labels and dropdown options
  const skuAttr = getAttributeById('sku');
  const styleIdAttr = getAttributeById('style_id');
  const gtinAttr = getAttributeById('gtin');
  const taxClassAttr = getAttributeById('tax_class');
  const heightAttr = getAttributeById('height');
  const lengthAttr = getAttributeById('length');
  const widthAttr = getAttributeById('width');
  const weightAttr = getAttributeById('weight');
  const firstReceivedAttr = getAttributeById('first_received');
  
  // Tax class dropdown options from registry (default: ['Taxable Goods', 'None'])
  const taxClassOptions = taxClassAttr?.allowed_values ?? ['Taxable Goods', 'None'];
  
  // Get current values (supporting both snake_case and camelCase)
  const gtinValue = product.gtin ?? (product.attributes?.gtin as string) ?? '';
  const taxClassValue = product.tax_class ?? (product.attributes?.tax_class as string) ?? 'Taxable Goods';
  const heightValue = product.height ?? (product.attributes?.height as string) ?? '';
  const lengthValue = product.length ?? (product.attributes?.length as string) ?? '';
  const widthValue = product.width ?? (product.attributes?.width as string) ?? '';
  const weightValue = product.weight ?? (product.attributes?.weight as string) ?? '';
  const firstReceivedValue = product.firstReceived ?? product.first_received ?? '';

  return (
    <div className="editor-tab-content">
      <div className="form-section">
        <h3 className="form-section-title">Product Identifiers</h3>
        <p className="form-section-description">
          Foundational identifiers used for catalog integration and external systems.
        </p>
        
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              {skuAttr?.label ?? 'SKU'} <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.sku || ''}
              onChange={(e) => onUpdate('sku', e.target.value)}
              data-field="product.sku"
              name="product.sku"
              placeholder="Enter SKU..."
            />
            <span className="form-hint">Stock Keeping Unit - unique product identifier</span>
          </div>

          <div className="form-field">
            <label className="form-label">
              {styleIdAttr?.label ?? 'Style ID'} <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={product.styleId || ''}
              onChange={(e) => onUpdate('styleId', e.target.value)}
              data-field="product.styleId"
              name="product.styleId"
              placeholder="Enter Style ID..."
            />
            <span className="form-hint">Manufacturer style/model identifier</span>
          </div>

          <div className="form-field">
            <label className="form-label">
              {gtinAttr?.label ?? 'GTIN/UPC'}
            </label>
            <input
              type="text"
              className="form-input"
              value={gtinValue}
              onChange={(e) => onUpdate('gtin', e.target.value)}
              data-field="product.gtin"
              name="product.gtin"
              placeholder="Enter GTIN/UPC..."
              maxLength={14}
            />
            <span className="form-hint">Global Trade Item Number (UPC/EAN barcode)</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Tax & Classification</h3>
        
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              {taxClassAttr?.label ?? 'Tax Class'} <span className="required">*</span>
            </label>
            <select
              className="form-input"
              value={taxClassValue}
              onChange={(e) => onUpdate('tax_class', e.target.value)}
              data-field="product.tax_class"
              name="product.tax_class"
            >
              {taxClassOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <span className="form-hint">Tax classification for export (required)</span>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Package Dimensions</h3>
        <p className="form-section-description">
          Shipping dimensions for fulfillment and logistics integrations.
        </p>
        
        <div className="form-grid form-grid-4col">
          <div className="form-field">
            <label className="form-label">
              {heightAttr?.label ?? 'Height'}
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input"
                value={heightValue}
                onChange={(e) => onUpdate('height', e.target.value)}
                data-field="product.height"
                name="product.height"
                placeholder="0"
                min="0"
                step="0.1"
              />
              <span className="input-unit">in</span>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">
              {lengthAttr?.label ?? 'Length'}
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input"
                value={lengthValue}
                onChange={(e) => onUpdate('length', e.target.value)}
                data-field="product.length"
                name="product.length"
                placeholder="0"
                min="0"
                step="0.1"
              />
              <span className="input-unit">in</span>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">
              {widthAttr?.label ?? 'Width'}
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input"
                value={widthValue}
                onChange={(e) => onUpdate('width', e.target.value)}
                data-field="product.width"
                name="product.width"
                placeholder="0"
                min="0"
                step="0.1"
              />
              <span className="input-unit">in</span>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label">
              {weightAttr?.label ?? 'Weight'}
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                className="form-input"
                value={weightValue}
                onChange={(e) => onUpdate('weight', e.target.value)}
                data-field="product.weight"
                name="product.weight"
                placeholder="0"
                min="0"
                step="0.01"
              />
              <span className="input-unit">oz</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3 className="form-section-title">Metadata</h3>
        
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              {firstReceivedAttr?.label ?? 'First Received'}
            </label>
            <input
              type="text"
              className="form-input form-input-readonly"
              value={firstReceivedValue ? new Date(firstReceivedValue).toLocaleDateString() : 'N/A'}
              readOnly
              disabled
              data-field="product.first_received"
              name="product.first_received"
            />
            <span className="form-hint">Date product was first scanned into warehouse (read-only)</span>
          </div>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Note:</strong> Technical identifiers are critical for system integrations. 
          SKU and Style ID are required for export. GTIN is recommended for marketplace listings.
        </p>
      </div>
    </div>
  );
}

export default TechnicalTab;
