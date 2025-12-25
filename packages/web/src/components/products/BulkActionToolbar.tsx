/**
 * Bulk Action Toolbar Component
 * 
 * Appears when products are selected, showing count and available actions.
 * 
 * LP-1.3.5: Products filters & pagination
 */

import { useState } from 'react';
import './BulkActionToolbar.css';

export interface BulkActionToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkAction: (action: string) => Promise<void>;
}

export function BulkActionToolbar({
  selectedCount,
  onClearSelection,
  onBulkAction,
}: BulkActionToolbarProps) {
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setLoading(true);
    setActionInProgress(action);
    try {
      await onBulkAction(action);
    } finally {
      setLoading(false);
      setActionInProgress(null);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulk-action-toolbar" role="toolbar" aria-label="Bulk actions">
      <div className="bulk-action-toolbar__info">
        <span className="bulk-action-toolbar__count">
          {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
        </span>
        <button
          type="button"
          className="bulk-action-toolbar__clear"
          onClick={onClearSelection}
          disabled={loading}
        >
          Clear selection
        </button>
      </div>

      <div className="bulk-action-toolbar__actions">
        <button
          type="button"
          className="bulk-action-toolbar__btn bulk-action-toolbar__btn--secondary"
          onClick={() => handleAction('export')}
          disabled={loading}
          title="Export selected products"
        >
          {actionInProgress === 'export' ? (
            <>
              <span className="bulk-action-toolbar__spinner" />
              Exporting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </>
          )}
        </button>

        <button
          type="button"
          className="bulk-action-toolbar__btn bulk-action-toolbar__btn--secondary"
          onClick={() => handleAction('setStatus')}
          disabled={loading}
          title="Change status of selected products"
        >
          {actionInProgress === 'setStatus' ? (
            <>
              <span className="bulk-action-toolbar__spinner" />
              Updating...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Set Status
            </>
          )}
        </button>

        <button
          type="button"
          className="bulk-action-toolbar__btn bulk-action-toolbar__btn--danger"
          onClick={() => handleAction('delete')}
          disabled={loading}
          title="Delete selected products"
        >
          {actionInProgress === 'delete' ? (
            <>
              <span className="bulk-action-toolbar__spinner" />
              Deleting...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default BulkActionToolbar;
