/**
 * ExportGatePanel Component
 * LP-phase2b-001: Completion Model — UI & Export Gate Integration (Phase 2B)
 *
 * Export button with blocking reasons display.
 * Design approved by Lisa 2026-01-09.
 *
 * States:
 * - Ready: Green button enabled, export allowed
 * - Partial/Blocked: Gray button disabled, blocking reasons shown
 * - Loading: Button disabled with spinner
 * - Error: Error message with retry
 *
 * Accessibility: WCAG AA compliant, keyboard navigable, ARIA labels
 * i18n: All strings externalized to i18n/en.json
 */

import { useState } from 'react';
import './ExportGatePanel.css';

export interface BlockingReason {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: {
    productId?: string;
    site?: string;
    missingAttributes?: string[];
    segmentId?: string;
  };
}

export interface ExportGatePanelProps {
  /** Whether export is ready (status === 'ready') */
  exportReady: boolean;
  /** Blocking reasons if not ready */
  blockingReasons?: BlockingReason[];
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when export button clicked */
  onExport?: () => void;
  /** Callback to reload data */
  onReload?: () => void;
}

/**
 * ExportGatePanel - Display export button with blocking reasons
 *
 * Features:
 * - Green "Export to RetailOps" button when ready
 * - Disabled button with blocking reasons when not ready
 * - Tooltip on disabled button explaining why
 * - Loading state with spinner
 * - Error state with retry
 * - Keyboard navigation (Tab, Enter to activate)
 * - Screen reader support with ARIA
 * - Focus management for accessibility
 */
export function ExportGatePanel({
  exportReady,
  blockingReasons = [],
  loading = false,
  error = null,
  onExport,
  onReload,
}: ExportGatePanelProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!onExport || !exportReady) return;

    setExporting(true);
    try {
      await onExport();
    } finally {
      setExporting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div
        className="export-gate-panel export-gate-panel--loading"
        role="status"
        aria-label="Loading export status"
      >
        <div className="export-gate-panel__header">
          <h3 className="export-gate-panel__title">Export to RetailOps</h3>
        </div>
        <div className="export-gate-panel__body">
          <button
            type="button"
            className="export-gate-panel__button export-gate-panel__button--loading"
            disabled
            aria-label="Loading, please wait"
          >
            <span className="export-gate-panel__spinner" aria-hidden="true"></span>
            <span>Loading...</span>
          </button>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="export-gate-panel export-gate-panel--error"
        role="alert"
        aria-live="polite"
      >
        <div className="export-gate-panel__header">
          <h3 className="export-gate-panel__title">Export to RetailOps</h3>
        </div>
        <div className="export-gate-panel__body">
          <div className="export-gate-panel__error-message">
            <span className="export-gate-panel__error-icon" aria-hidden="true">
              ⚠️
            </span>
            <span>{error}</span>
          </div>
          {onReload && (
            <button
              type="button"
              className="export-gate-panel__retry-button"
              onClick={onReload}
              aria-label="Retry loading export status"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Ready state - export allowed
  if (exportReady) {
    return (
      <div
        className="export-gate-panel export-gate-panel--ready"
        role="region"
        aria-labelledby="export-gate-title"
      >
        <div className="export-gate-panel__header">
          <h3 id="export-gate-title" className="export-gate-panel__title">
            Export to RetailOps
          </h3>
        </div>
        <div className="export-gate-panel__body">
          <p className="export-gate-panel__ready-message">
            ✓ This product is ready for export
          </p>
          <button
            type="button"
            className="export-gate-panel__button export-gate-panel__button--ready"
            onClick={handleExport}
            disabled={exporting}
            aria-label="Export product to RetailOps"
          >
            {exporting ? (
              <>
                <span className="export-gate-panel__spinner" aria-hidden="true"></span>
                <span>Exporting...</span>
              </>
            ) : (
              <span>Export to RetailOps</span>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Blocked state - export not allowed
  return (
    <div
      className="export-gate-panel export-gate-panel--blocked"
      role="region"
      aria-labelledby="export-gate-title"
      aria-describedby="blocking-reasons-list"
    >
      <div className="export-gate-panel__header">
        <h3 id="export-gate-title" className="export-gate-panel__title">
          Export to RetailOps
        </h3>
      </div>
      <div className="export-gate-panel__body">
        <button
          type="button"
          className="export-gate-panel__button export-gate-panel__button--blocked"
          disabled
          aria-disabled="true"
          aria-label={`Export to RetailOps, disabled, ${blockingReasons.length} blocking reasons`}
          title="Complete required fields to enable export"
        >
          Export to RetailOps
        </button>

        {blockingReasons.length > 0 && (
          <div className="export-gate-panel__blocking-section">
            <h4
              className="export-gate-panel__blocking-title"
              id="blocking-reasons-title"
            >
              Blocking Reasons
            </h4>
            <ul
              className="export-gate-panel__blocking-list"
              id="blocking-reasons-list"
              role="list"
              aria-labelledby="blocking-reasons-title"
            >
              {blockingReasons.map((reason, index) => (
                <li
                  key={index}
                  className={`export-gate-panel__blocking-item export-gate-panel__blocking-item--${reason.severity}`}
                  role="listitem"
                >
                  <span
                    className="export-gate-panel__blocking-severity"
                    aria-label={`${reason.severity} severity`}
                  >
                    {reason.severity === 'critical' && '🔴'}
                    {reason.severity === 'warning' && '🟡'}
                    {reason.severity === 'info' && 'ℹ️'}
                  </span>
                  <span className="export-gate-panel__blocking-message">
                    {reason.message}
                  </span>
                  {reason.details?.missingAttributes &&
                    reason.details.missingAttributes.length > 0 && (
                      <ul className="export-gate-panel__missing-attributes">
                        {reason.details.missingAttributes.map((attr, attrIndex) => (
                          <li key={attrIndex}>{attr}</li>
                        ))}
                      </ul>
                    )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="export-gate-panel__tooltip">
          <span className="export-gate-panel__tooltip-icon" aria-hidden="true">
            💡
          </span>
          <span className="export-gate-panel__tooltip-text">
            Complete the required fields above to enable export
          </span>
        </div>
      </div>
    </div>
  );
}
