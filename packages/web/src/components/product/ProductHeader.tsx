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

      <div className="product-header__container">
        <div className="product-header__rows">
          {/* LINE 1 — Identity + Actions (Single Baseline) */}
          <div className="product-header__row product-header__row--identity">
            <div className="product-header__identity-left">
              <span className="product-header__label product-header__label--inline">MPN</span>
              <span className="product-header__value product-header__value--mono product-header__value--mpn">
                {product.mpn || product.sku || '—'}
              </span>
              <span className="product-header__product-name">
                {product.name || '—'}
              </span>
              <span className={`product-header__badge ${status.className}`} role="status">
                {status.label}
              </span>
            </div>

            <div className="product-header__spacer" />

            <div className="product-header__actions">
              <button 
                onClick={onBack} 
                className="product-header__back-btn"
                aria-label="Back to Products List"
              >
                ← Back to Products
              </button>
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

          {/* LINE 2 — Merchandising Context */}
          <div className="product-header__row product-header__row--merch">
            <div className="product-header__merch-stack">
              <div className="product-header__merch-line">
                <span className="product-header__label">RIC Color</span>
                <span className="product-header__value product-header__value--muted">
                  {product.attributes?.rics_color || '—'}
                </span>
              </div>
              <div className="product-header__merch-line">
                <span className="product-header__label">RIC Category</span>
                <span className="product-header__value product-header__value--muted">
                  {product.attributes?.rics_category || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* LINE 3 — Operational Health (Two Columns) */}
          <div className="product-header__row product-header__row--operations">
            <div className="product-header__ops-left">
              <div className="product-header__last">
                <span className="product-header__label">Last Received</span>
                <span className="product-header__value product-header__value--last" data-testid="header-last-received">
                  {lastDisplay}
                </span>
              </div>

              <div className="product-header__inventory-grid">
                <span className="product-header__inv-label">Total Inventory</span>
                <span className="product-header__inv-label">WHS</span>
                <span className="product-header__inv-label">Store</span>
                <span className="product-header__inv-value">{formatNumber(product.total_inv)}</span>
                <span className="product-header__inv-value">{formatNumber(product.warehouse_inv)}</span>
                <span className="product-header__inv-value">{formatNumber(product.store_inv)}</span>
              </div>
            </div>

            <div className="product-header__ops-right">
              <div className="product-header__icon-row">
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

                <span 
                  className={`product-header__active-dot ${isActive ? 'active' : 'inactive'}`}
                  title={`Status: ${isActive ? 'Active' : 'Inactive'}`}
                  aria-label={`Status: ${isActive ? 'Active' : 'Inactive'}`}
                  role="status"
                />

                <span 
                  className={`product-header__media-status ${mediaStatus.className}`}
                  title={mediaStatus.icon === '●' ? 'Media present' : 'No media uploaded'}
                  role="status"
                  aria-label={mediaStatus.icon === '●' ? 'Media present' : 'No media uploaded'}
                >
                  {mediaStatus.icon}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default ProductHeader;
