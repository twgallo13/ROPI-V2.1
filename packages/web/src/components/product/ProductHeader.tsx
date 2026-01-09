import type { Product } from '../../types/product';
import { formatForDisplayYYYYMMDD } from '../../utils/dateUtils';
import './ProductHeader.css';

/**
 * Product Header Component — LP-0.4.1.1, LP-export-unlock-1.0.0, LP-export-completion-fix-1.0.0
 * 
 * Persistent sticky header bar displaying read-only product metadata.
 * All fields in this component are read-only as they represent metadata
 * from external systems (ROPI, warehouse) or derived states.
 * 
 * LP-export-unlock-1.0.0: Publish button gating now uses completion.ready
 * passed via canPublish prop, replacing legacy product.exportReadiness?.overall.
 * 
 * LP-export-completion-fix-1.0.0: Added actionable guidance banner for
 * "No sites selected" blocking reason with link to edit sites in Core Information tab.
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

/**
 * LP-export-completion-fix-1.0.0: Blocking reason structure
 */
interface BlockingReason {
  type: string;
  severity: string;
  message: string;
  details?: Record<string, unknown>;
}

interface ProductHeaderProps {
  product: Product;
  onSave: () => void;
  onPublish: () => void;
  onBack: () => void;
  /** 
   * LP-export-unlock-1.0.0: Publish readiness from completion.ready.
   * When undefined, publish button shows loading state.
   * When true, publish is enabled.
   * When false, publish is disabled with tooltip.
   */
  canPublish?: boolean;
  /** Loading state for publish readiness check */
  publishReadinessLoading?: boolean;
  /**
   * LP-export-completion-fix-1.0.0: Optional blocking reasons for actionable guidance.
   * When the product is blocked due to "No sites selected", shows banner with link to edit.
   */
  blockingReasons?: BlockingReason[];
  /**
   * LP-export-completion-fix-1.0.0: Callback to navigate to site selection in editor.
   * Called when user clicks "Select Sites" action button.
   */
  onSelectSites?: () => void;
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
 * Media status icon mapping (active/dim states only)
 */
const mediaStatusConfig: Record<string, { icon: string; className: string }> = {
  'complete': { icon: '●', className: 'media-status--complete' },
  'partial': { icon: '●', className: 'media-status--complete' },
  'missing': { icon: '○', className: 'media-status--missing' },
};

/**
 * Format number with commas
 */
function formatNumber(num?: number): string {
  if (num === undefined || num === null) return '—';
  return num.toLocaleString();
}

/**
 * Get website badge text (first + last char before .com)
 * Example: shiekh.com → "SK", karmaloop.com → "KP"
 */
function getWebsiteBadgeText(website: string): string {
  const baseName = website.split('.')[0];
  if (baseName.length < 2) return baseName.substring(0, 2).toUpperCase();
  return `${baseName[0]}${baseName[baseName.length - 1]}`.toUpperCase();
}

function ProductHeader({ 
  product, 
  onSave, 
  onPublish, 
  onBack,
  canPublish,
  publishReadinessLoading,
  blockingReasons,
  onSelectSites,
}: ProductHeaderProps) {
  const status = statusConfig[product.status] || statusConfig['draft'];
  // LP-1.4.2: Defensive fallback for unknown media_status values
  const mediaStatusKey = product.media_status ?? 'missing';
  const mediaStatus = mediaStatusConfig[mediaStatusKey] || mediaStatusConfig['missing'];
  const isActive = product.product_is_active ?? false;

  // LP-1.4.6.7: Fallback to attributes.last_received when core field is absent
  // Handle potential string array from attributes (take first element if array)
  const attrLast = product?.attributes?.last_received;
  const attrLastStr = typeof attrLast === 'string' ? attrLast : Array.isArray(attrLast) ? attrLast[0] : undefined;
  const rawLastStr = attrLastStr || product?.last_received;
  const lastDisplay = formatForDisplayYYYYMMDD(rawLastStr) ?? '—';

  // LP-export-unlock-1.0.0: Publish button state from completion.ready
  const publishDisabled = publishReadinessLoading || canPublish === false || canPublish === undefined;
  const publishTitle = publishReadinessLoading
    ? 'Checking publish readiness...'
    : canPublish === true
      ? 'Publish product'
      : 'Publish blocked - completion requirements not met';
  const publishLabel = publishReadinessLoading ? 'Checking...' : 'Publish';

  // LP-export-completion-fix-1.0.0: Check for "No sites selected" blocking reason
  const noSitesBlocking = blockingReasons?.some(
    reason => reason.message?.toLowerCase().includes('no sites selected')
  );

  return (
    <header className="product-header" role="banner" aria-label="Product Header">
      {/* ===== ZONE 1: PAGE ACTIONS (Utility Bar) ===== */}
      <div className="product-header__utility-bar">
        {/* LP-export-completion-fix-1.0.0: Actionable guidance banner for missing sites */}
        {noSitesBlocking && (
          <div 
            className="product-header__guidance-banner product-header__guidance-banner--warning"
            role="alert"
            data-testid="sites-guidance-banner"
          >
            <span className="product-header__guidance-icon">⚠️</span>
            <span className="product-header__guidance-message">
              <strong>Export Blocked:</strong> No sites selected for this product. 
              Select at least one website to enable export.
            </span>
            {onSelectSites && (
              <button
                className="product-header__guidance-action"
                onClick={onSelectSites}
                data-testid="select-sites-button"
              >
                Select Sites
              </button>
            )}
          </div>
        )}
        
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
              disabled={publishDisabled}
              title={publishTitle}
              data-testid="publish-button"
            >
              {publishLabel}
            </button>
          </div>
        </div>
      </div>

      {/* ===== ZONE 2: PRODUCT CONTEXT (Metadata) ===== */}
      <div className="product-header__context">
        <div className="product-header__metadata-bar">
          {/* Group 1: Core Identity */}
          <div className="product-header__group product-header__group--identity">
            {/* MPN (Read-Only Text Reference) */}
            <div className="product-header__field">
              <span className="product-header__label">MPN</span>
              <span className="product-header__value product-header__value--mono">
                {product.mpn || product.sku || '—'}
              </span>
            </div>

            {/* RIC Category (Merchandising Context) */}
            <div className="product-header__field product-header__field--secondary">
              <span className="product-header__label">RIC Category</span>
              <span className="product-header__value product-header__value--muted">
                {product.category || '—'}
              </span>
            </div>

            {/* RIC Color (Merchandising Context) */}
            <div className="product-header__field product-header__field--secondary">
              <span className="product-header__label">RIC Color</span>
              <span className="product-header__value product-header__value--muted">
                {product.attributes?.color || product.color || '—'}
              </span>
            </div>

            {/* Status Badge */}
            <div className="product-header__field">
              <span className="product-header__label">Status</span>
              <span className={`product-header__badge ${status.className}`} role="status">
                {status.label}
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
          </div>

          {/* Group 2: Operational Health */}
          <div className="product-header__group product-header__group--operations">
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
          </div>

          {/* Group 3: Publishing Readiness */}
          <div className="product-header__group product-header__group--publishing">
            {/* Media Status Icon */}
            <div className="product-header__field">
              <span className="product-header__label">Media</span>
              <span 
                className={`product-header__media-status ${mediaStatus.className}`}
                title={mediaStatus.icon === '●' ? 'Media present' : 'No media uploaded'}
                role="status"
                aria-label={mediaStatus.icon === '●' ? 'Media present' : 'No media uploaded'}
              >
                {mediaStatus.icon}
              </span>
            </div>

            {/* Website Chips */}
            <div className="product-header__field product-header__field--websites">
              <span className="product-header__label">Websites</span>
              <div className="product-header__website-chips">
                {(product.websites ?? []).length > 0 ? (
                  (product.websites ?? []).map(website => (
                    <span 
                      key={website} 
                      className="product-header__website-chip"
                      title={website}
                    >
                      {getWebsiteBadgeText(website)}
                    </span>
                  ))
                ) : (
                  <span className="product-header__no-websites">No websites</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default ProductHeader;
