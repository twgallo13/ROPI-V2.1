/**
 * UsageSamplePanel Component
 * PVS-0.3.3 - Audit UI
 * 
 * Shows attribute usage statistics:
 * - Product count using this attribute
 * - Sample products with their values
 * - Links to product editor
 */


import type { AttributeUsage } from '../hooks/useAudit';
import styles from './AuditTab.module.css';

export interface UsageSamplePanelProps {
  usage: AttributeUsage | null;
  attributeId: string;
  loading?: boolean;
  onRefresh?: () => void;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  if (typeof value === 'string') return value || '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty array)';
    return value.map(v => String(v)).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * UsageSamplePanel component
 */
export function UsageSamplePanel({
  usage,
  attributeId,
  loading = false,
  onRefresh,
}: UsageSamplePanelProps) {
  if (loading) {
    return (
      <div className={styles.usagePanel}>
        <div className={styles.usageLoading}>
          <div className={styles.spinner} />
          <p>Loading usage data...</p>
        </div>
      </div>
    );
  }

  if (!usage) {
    return (
      <div className={styles.usagePanel}>
        <div className={styles.usageEmpty}>
          <div className={styles.usageEmptyIcon}>📊</div>
          <p>Usage data unavailable</p>
          {onRefresh && (
            <button
              type="button"
              className={styles.usageRefreshBtn}
              onClick={onRefresh}
            >
              Refresh
            </button>
          )}
        </div>
      </div>
    );
  }

  const { count, samples } = usage;

  return (
    <div className={styles.usagePanel}>
      <div className={styles.usageHeader}>
        <h3 className={styles.usageTitle}>Attribute Usage</h3>
        {onRefresh && (
          <button
            type="button"
            className={styles.usageRefreshBtn}
            onClick={onRefresh}
            title="Refresh usage data"
          >
            🔄 Refresh
          </button>
        )}
      </div>

      {/* Count summary */}
      <div className={styles.usageCount}>
        <div className={styles.usageCountNumber}>
          {count.toLocaleString()}
        </div>
        <div className={styles.usageCountLabel}>
          product{count !== 1 ? 's' : ''} using this attribute
        </div>
      </div>

      {/* Sample products */}
      {samples.length > 0 ? (
        <div className={styles.usageSamples}>
          <h4 className={styles.usageSamplesTitle}>
            Sample Products ({samples.length})
          </h4>
          <div className={styles.usageSamplesTable}>
            <table>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>SKU</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {samples.map((sample, idx) => (
                  <tr key={sample.id || idx}>
                    <td className={styles.usageSampleId}>
                      <code>{sample.id}</code>
                    </td>
                    <td className={styles.usageSampleSku}>
                      {sample.sku || '—'}
                    </td>
                    <td className={styles.usageSampleValue}>
                      <span title={formatValue(sample.value)}>
                        {formatValue(sample.value)}
                      </span>
                    </td>
                    <td className={styles.usageSampleActions}>
                      <a
                        href={`/products/${sample.id}`}
                        className={styles.usageSampleLink}
                        title="Open in Product Editor"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {count > samples.length && (
            <p className={styles.usageSamplesMore}>
              Showing {samples.length} of {count.toLocaleString()} products
            </p>
          )}
        </div>
      ) : count > 0 ? (
        <div className={styles.usageSamplesEmpty}>
          <p>No sample data available</p>
        </div>
      ) : (
        <div className={styles.usageSamplesEmpty}>
          <div className={styles.usageSamplesEmptyIcon}>📭</div>
          <p>No products are using this attribute yet</p>
          <p className={styles.usageSamplesEmptyHint}>
            Products will appear here once they have values for "{attributeId}"
          </p>
        </div>
      )}

      {/* Attribute ID reference */}
      <div className={styles.usageFooter}>
        <span className={styles.usageAttrId}>
          Attribute: <code>{attributeId}</code>
        </span>
      </div>
    </div>
  );
}

export default UsageSamplePanel;
