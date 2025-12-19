/**
 * AttributeHeader Component
 * Sticky header for the attribute detail panel
 * 
 * Lisa PVS-0.2.3
 */
import type { Attribute } from '../hooks/useAttributes';
import styles from '../pages/Settings/AttributesConsole.module.css';

export interface AttributeHeaderProps {
  attribute: Attribute | null;
  isDirty?: boolean;
  saving?: boolean;
  onCancel?: () => void;
  onSync?: () => void;
  onSave?: () => void;
}

export default function AttributeHeader({
  attribute,
  isDirty = false,
  saving = false,
  onCancel,
  onSync,
  onSave,
}: AttributeHeaderProps) {
  if (!attribute) {
    return (
      <div className={styles.detailHeader} data-testid="attribute-header-empty">
        <div className={styles.headerInfo}>
          <h2 className={styles.headerTitle}>Select an attribute or create New Attribute</h2>
          <p className={styles.headerId}>Choose from the list on the left to view details</p>
        </div>
      </div>
    );
  }

  const statusClass = attribute.status === 'active'
    ? styles.statusPillActive
    : attribute.status === 'deprecated'
    ? styles.statusPillDeprecated
    : styles.statusPillHidden;

  return (
    <div className={styles.detailHeader} data-testid="attribute-header">
      <div className={styles.headerInfo}>
        <h2 className={styles.headerTitle} data-testid="header-label">
          {attribute.label || attribute.attribute_id}
        </h2>
        <p className={styles.headerId} data-testid="header-id">
          {attribute.attribute_id}
        </p>
        <div className={styles.headerMeta}>
          <span
            className={`${styles.statusPill} ${statusClass}`}
            data-testid="header-status"
            aria-label={`Status: ${attribute.status || 'active'}`}
          >
            {attribute.status || 'Active'}
          </span>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={onCancel}
          aria-label="Cancel changes"
          data-testid="btn-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={onSync}
          aria-label="Sync attribute from server"
          data-testid="btn-sync"
        >
          Sync
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={onSave}
          disabled={saving || !isDirty}
          aria-label="Save changes"
          data-testid="btn-save"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
