import type { Product } from '../../types/product';
import { formatForDisplayYYYYMMDD } from '../../utils/dateUtils';
import './ProductHeader.css';

/**
 * Product Header Component — LP-0.4.1.1
 * 
 * Persistent sticky header bar displaying read-only product metadata.
 * All fields in this component are read-only as they represent metadata
 * from external systems (ROPI, warehouse) or derived states.
 * 
 * LP-0.4.1.1: websites field displays values from Firestore document.
 * If a product shows unexpected website values (e.g., "shiekhshoes.com"),
 * this indicates the data exists in Firestore - check the product document.
 * Empty state ("No websites") displays when websites array is empty/undefined.
 * 
 * Tab 0 Fields (per LP-0.4.0):
 * - status: Current workflow state (Badge)
 * - mpn: Manufacturer Part Number (read-only text)
 * - product_is_active: Toggle state from ROPI (Badge)
 * - last_received: Latest warehouse scan (Date)
 * - total_inv: Sum of WHS + Store inventory
 * - warehouse_inv: Warehouse inventory count
 * - store_inv: Store inventory count
 * - media_status: Based on image count (Icon) - READ-ONLY from external workflow
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 */

interface ProductHeaderProps {
  product: Product;
  onSave: () => void;
  onPublish: () => void;
  onBack: () => void;
}

/**
 * Status badge color mapping
 */
const statusConfig: Record<string, { label: string; className: string }> = {
  'draft': { label: 'Draft', className: 'badge--draft' },
  'in-progress': { label: 'In Progress', className: 'badge--progress' },
  'export-ready': { label: 'Export Ready', className: 'badge--ready' },
};

/**
 * Media status icon mapping
 */
const mediaStatusConfig: Record<string, { icon: string; label: string; className: string }> = {
  'complete': { icon: '✓', label: 'Media Complete', className: 'media-status--complete' },
  'partial': { icon: '◐', label: 'Media Partial', className: 'media-status--partial' },
  'missing': { icon: '○', label: 'No Media', className: 'media-status--missing' },
};

/**
 * Format date for display
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format number with commas
 */
function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '—';
  return num.toLocaleString();
}

function ProductHeader({ product, onSave, onPublish, onBack }: ProductHeaderProps) {
  const status = statusConfig[product.status] || statusConfig['draft'];
  // LP-1.4.2: Defensive fallback for unknown media_status values
  const mediaStatusKey = product.media_status ?? 'missing';
  const mediaStatus = mediaStatusConfig[mediaStatusKey] || mediaStatusConfig['missing'];
  const isActive = product.product_is_active ?? false;

  // LP-1.4.6.7: Fallback to attributes.last_received when core field is absent
  const rawLastFromAttributes = product?.attributes?.last_received;
  const rawLastFromCore = product?.last_received;
  const rawLast = rawLastFromAttributes ?? rawLastFromCore;
  const lastDisplay = formatForDisplayYYYYMMDD(rawLast) ?? '—';

  return (
    <header className="product-header" role="banner" aria-label="Product Header">
      {/* Navigation Row */}
      <div className="product-header__nav">
        <button 
          onClick={onBack} 
          className="product-header__back-btn"
          aria-label="Back to Products List"
        >
          ← Back to Products
        </button>
        
        <div className="product-header__actions">
          <button 
            onClick={onSave}
            className="product-header__btn product-header__btn--secondary"
          >
            Save Draft
          </button>
          <button 
            onClick={onPublish}
            className="product-header__btn product-header__btn--primary"
            disabled={(product.exportReadiness?.overall ?? 0) < 80}
            title={(product.exportReadiness?.overall ?? 0) < 80 ? 'Export readiness must be at least 80%' : 'Publish product'}
          >
            Publish
          </button>
        </div>
      </div>

      {/* Tab 0: Persistent Metadata Bar (Read-Only) */}
      <div className="product-header__metadata-bar">
        {/* Status Badge */}
        <div className="product-header__field">
          <span className="product-header__label">Status</span>
          <span className={`product-header__badge ${status.className}`} role="status">
            {status.label}
          </span>
        </div>

        {/* MPN (Read-Only Text Reference) */}
        <div className="product-header__field">
          <span className="product-header__label">MPN</span>
          <span className="product-header__value product-header__value--mono">
            {product.mpn || product.sku || '—'}
          </span>
        </div>

        {/* Product Is Active Badge */}
        <div className="product-header__field">
          <span className="product-header__label">Active</span>
          <span 
            className={`product-header__badge ${isActive ? 'badge--active' : 'badge--inactive'}`}
            role="status"
            aria-label={isActive ? 'Product is active' : 'Product is inactive'}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Last Received Date */}
        <div className="product-header__field">
          <span className="product-header__label">Last Received</span>
          <span className="product-header__value" data-testid="header-last-received">
            {lastDisplay}
          </span>
        </div>

        {/* Inventory Section */}
        <div className="product-header__field product-header__field--inventory">
          <span className="product-header__label">Inventory</span>
          <div className="product-header__inventory-group">
            <span className="product-header__inv-item" title="Total Inventory">
              <span className="product-header__inv-label">Total:</span>
              <span className="product-header__inv-value">{formatNumber(product.total_inv)}</span>
            </span>
            <span className="product-header__inv-item" title="Warehouse Inventory">
              <span className="product-header__inv-label">WHS:</span>
              <span className="product-header__inv-value">{formatNumber(product.warehouse_inv)}</span>
            </span>
            <span className="product-header__inv-item" title="Store Inventory">
              <span className="product-header__inv-label">Store:</span>
              <span className="product-header__inv-value">{formatNumber(product.store_inv)}</span>
            </span>
          </div>
        </div>

        {/* Media Status Icon */}
        <div className="product-header__field">
          <span className="product-header__label">Media</span>
          <span 
            className={`product-header__media-status ${mediaStatus.className}`}
            title={mediaStatus.label}
            role="status"
            aria-label={mediaStatus.label}
          >
            <span className="product-header__media-icon">{mediaStatus.icon}</span>
          </span>
        </div>

        {/* Website Chips */}
        <div className="product-header__field product-header__field--websites">
          <span className="product-header__label">Websites</span>
          <div className="product-header__website-chips">
            {(product.websites ?? []).length > 0 ? (
              (product.websites ?? []).map(website => (
                <span key={website} className="product-header__website-chip">
                  {website}
                </span>
              ))
            ) : (
              <span className="product-header__no-websites">No websites</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default ProductHeader;
