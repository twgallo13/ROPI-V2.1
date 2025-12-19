/**
 * AuditTab Component
 * PVS-0.3.3 - Audit UI
 * 
 * Main container for the Audit tab in AttributeDetailPanel:
 * - Timeline of audit events
 * - Diff viewer for changes
 * - Revert functionality
 * - Usage statistics
 * - Export capabilities
 */

import { useEffect, useState, useCallback } from 'react';
import type { Attribute } from '../hooks/useAttributes';
import { useAudit, type AuditEvent } from '../hooks/useAudit';
import AuditTimeline from './AuditTimeline';
import RevertModal from './RevertModal';
import UsageSamplePanel from './UsageSamplePanel';
import ExportAuditButton from './ExportAuditButton';
import styles from './AuditTab.module.css';

export interface AuditTabProps {
  attribute: Attribute;
  onAttributeUpdated?: () => void;
}

/**
 * Toast notification component
 */
function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
      <span className={styles.toastIcon}>
        {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
      </span>
      <span className={styles.toastMessage}>{message}</span>
      <button
        type="button"
        className={styles.toastClose}
        onClick={onClose}
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

/**
 * AuditTab component
 */
export function AuditTab({ attribute, onAttributeUpdated }: AuditTabProps) {
  const attributeId = attribute.attribute_id;

  const {
    events,
    total,
    hasMore,
    selectedEvent,
    usage,
    loading,
    loadingMore,
    reverting,
    exporting,
    error,
    fetchEvents: _fetchEvents,
    loadMore,
    fetchEventDetail,
    clearSelectedEvent: _clearSelectedEvent,
    revertToEvent,
    fetchUsage,
    exportAudit,
    refresh,
  } = useAudit(attributeId);

  const [revertEvent, setRevertEvent] = useState<AuditEvent | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load data on mount and when attribute changes
  useEffect(() => {
    if (attributeId) {
      refresh();
    }
  }, [attributeId, refresh]);

  // Handle revert click from timeline
  const handleRevertClick = useCallback((event: AuditEvent) => {
    setRevertEvent(event);
  }, []);

  // Handle revert confirmation
  const handleRevertConfirm = useCallback(async (reason: string) => {
    if (!revertEvent) return;

    const success = await revertToEvent(revertEvent.id, reason);

    if (success) {
      setRevertEvent(null);
      setToast({ message: 'Attribute reverted successfully', type: 'success' });
      onAttributeUpdated?.();
    } else {
      setToast({ message: error || 'Failed to revert attribute', type: 'error' });
    }
  }, [revertEvent, revertToEvent, error, onAttributeUpdated]);

  // Handle revert modal close
  const handleRevertClose = useCallback(() => {
    setRevertEvent(null);
  }, []);

  // Handle event selection
  const handleSelectEvent = useCallback((event: AuditEvent) => {
    fetchEventDetail(event.id);
  }, [fetchEventDetail]);

  // Handle export
  const handleExport = useCallback(async (options: Parameters<typeof exportAudit>[0]) => {
    const result = await exportAudit(options);
    if (result) {
      setToast({ message: 'Audit log exported successfully', type: 'success' });
    } else if (error) {
      setToast({ message: error, type: 'error' });
    }
    return result;
  }, [exportAudit, error]);

  // Clear toast
  const clearToast = useCallback(() => setToast(null), []);

  return (
    <div className={styles.auditTab} data-testid="audit-tab">
      {/* Header */}
      <div className={styles.auditHeader}>
        <div className={styles.auditHeaderLeft}>
          <h2 className={styles.auditTitle}>Audit History</h2>
          <span className={styles.auditSubtitle}>
            {total > 0 ? `${total} event${total !== 1 ? 's' : ''}` : 'No events yet'}
          </span>
        </div>
        <div className={styles.auditHeaderRight}>
          <button
            type="button"
            className={styles.auditRefreshBtn}
            onClick={() => refresh()}
            disabled={loading}
            title="Refresh audit log"
          >
            🔄 Refresh
          </button>
          <ExportAuditButton
            onExport={handleExport}
            exporting={exporting}
            disabled={events.length === 0}
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className={styles.auditError}>
          <span className={styles.auditErrorIcon}>⚠️</span>
          <span>{error}</span>
          <button
            type="button"
            className={styles.auditErrorRetry}
            onClick={() => refresh()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className={styles.auditContent}>
        {/* Timeline section */}
        <div className={styles.auditTimelineSection}>
          <AuditTimeline
            events={events}
            loading={loading || loadingMore}
            hasMore={hasMore}
            onLoadMore={loadMore}
            onRevert={handleRevertClick}
            onSelectEvent={handleSelectEvent}
            selectedEventId={selectedEvent?.id}
          />
        </div>

        {/* Sidebar with usage */}
        <div className={styles.auditSidebar}>
          <UsageSamplePanel
            usage={usage}
            attributeId={attributeId}
            loading={loading}
            onRefresh={fetchUsage}
          />
        </div>
      </div>

      {/* Revert modal */}
      <RevertModal
        isOpen={revertEvent !== null}
        event={revertEvent}
        usage={usage}
        reverting={reverting}
        onConfirm={handleRevertConfirm}
        onClose={handleRevertClose}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
        />
      )}
    </div>
  );
}

export default AuditTab;
