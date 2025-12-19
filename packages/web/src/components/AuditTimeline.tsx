/**
 * AuditTimeline Component
 * PVS-0.3.3 - Audit UI
 * 
 * Displays chronological list of audit events with expand/collapse
 * for viewing diffs and triggering revert actions
 */

import { useState, useCallback } from 'react';
import type { AuditEvent, AuditAction } from '../hooks/useAudit';
import DiffViewer from './DiffViewer';
import styles from './AuditTab.module.css';

export interface AuditTimelineProps {
  events: AuditEvent[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRevert: (event: AuditEvent) => void;
  onSelectEvent: (event: AuditEvent) => void;
  selectedEventId?: string;
}

/**
 * Format action type for display
 */
function formatAction(action: AuditAction): { label: string; icon: string; color: string } {
  switch (action) {
    case 'create':
      return { label: 'Created', icon: '➕', color: 'green' };
    case 'update':
      return { label: 'Updated', icon: '✏️', color: 'blue' };
    case 'delete':
      return { label: 'Deleted', icon: '🗑️', color: 'red' };
    case 'revert':
      return { label: 'Reverted', icon: '↩️', color: 'purple' };
    case 'status_change':
      return { label: 'Status Changed', icon: '🔄', color: 'orange' };
    default:
      return { label: action, icon: '📝', color: 'gray' };
  }
}

/**
 * Format relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Format full timestamp
 */
function formatFullTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Single timeline event row
 */
function TimelineEvent({
  event,
  isExpanded,
  onToggle,
  onRevert,
  isSelected,
}: {
  event: AuditEvent;
  isExpanded: boolean;
  onToggle: () => void;
  onRevert: () => void;
  isSelected: boolean;
}) {
  const actionInfo = formatAction(event.action);
  const canRevert = event.action !== 'delete' && event.before !== null;
  const hasChanges = event.before !== null || event.after !== null;

  return (
    <div
      className={`${styles.timelineEvent} ${isExpanded ? styles.timelineEventExpanded : ''} ${isSelected ? styles.timelineEventSelected : ''}`}
      data-action={event.action}
    >
      {/* Timeline connector */}
      <div className={styles.timelineConnector}>
        <div className={styles.timelineDot} style={{ backgroundColor: `var(--color-${actionInfo.color}, #666)` }}>
          <span className={styles.timelineIcon}>{actionInfo.icon}</span>
        </div>
        <div className={styles.timelineLine} />
      </div>

      {/* Event content */}
      <div className={styles.timelineContent}>
        <div className={styles.timelineHeader}>
          <div className={styles.timelineHeaderLeft}>
            <span className={`${styles.timelineAction} ${styles[`action${actionInfo.color}`]}`}>
              {actionInfo.label}
            </span>
            <span className={styles.timelineActor} title={event.actorEmail}>
              {event.actorEmail || event.actor}
            </span>
          </div>
          <div className={styles.timelineHeaderRight}>
            <span className={styles.timelineTime} title={formatFullTimestamp(event.timestamp)}>
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        </div>

        <div className={styles.timelineSummary}>
          {event.summary || `${actionInfo.label} attribute`}
          {event.reason && (
            <span className={styles.timelineReason}>
              Reason: "{event.reason}"
            </span>
          )}
        </div>

        {event.changedFields && event.changedFields.length > 0 && (
          <div className={styles.timelineChangedFields}>
            Changed: {event.changedFields.join(', ')}
          </div>
        )}

        {event.revertedFromEventId && (
          <div className={styles.timelineRevertRef}>
            ↩️ Reverted from event #{event.revertedFromEventId.slice(0, 8)}
          </div>
        )}

        {/* Action buttons */}
        <div className={styles.timelineActions}>
          {hasChanges && (
            <button
              type="button"
              className={styles.timelineBtn}
              onClick={onToggle}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Hide diff' : 'View diff'}
            >
              {isExpanded ? '▼ Hide Diff' : '▶ View Diff'}
            </button>
          )}
          {canRevert && (
            <button
              type="button"
              className={`${styles.timelineBtn} ${styles.timelineBtnRevert}`}
              onClick={onRevert}
              aria-label="Revert to this state"
            >
              ↩️ Revert
            </button>
          )}
        </div>

        {/* Expanded diff view */}
        {isExpanded && hasChanges && (
          <div className={styles.timelineDiff}>
            <DiffViewer
              before={event.before}
              after={event.after}
              changedFields={event.changedFields}
              title={`Changes from ${actionInfo.label.toLowerCase()}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * AuditTimeline component
 */
export function AuditTimeline({
  events,
  loading,
  hasMore,
  onLoadMore,
  onRevert,
  onSelectEvent,
  selectedEventId,
}: AuditTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const handleToggle = useCallback((eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedEvents(new Set(events.map(e => e.id)));
  }, [events]);

  const handleCollapseAll = useCallback(() => {
    setExpandedEvents(new Set());
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className={styles.timelineLoading}>
        <div className={styles.spinner} />
        <p>Loading audit history...</p>
      </div>
    );
  }

  if (!loading && events.length === 0) {
    return (
      <div className={styles.timelineEmpty}>
        <div className={styles.timelineEmptyIcon}>📜</div>
        <h3>No Audit History</h3>
        <p>Changes to this attribute will appear here.</p>
      </div>
    );
  }

  return (
    <div className={styles.timeline} role="log" aria-label="Audit timeline">
      {/* Timeline controls */}
      <div className={styles.timelineControls}>
        <span className={styles.timelineCount}>
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
        <div className={styles.timelineControlBtns}>
          <button
            type="button"
            className={styles.timelineControlBtn}
            onClick={handleExpandAll}
            disabled={expandedEvents.size === events.length}
          >
            Expand All
          </button>
          <button
            type="button"
            className={styles.timelineControlBtn}
            onClick={handleCollapseAll}
            disabled={expandedEvents.size === 0}
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Events list */}
      <div className={styles.timelineEvents}>
        {events.map((event) => (
          <TimelineEvent
            key={event.id}
            event={event}
            isExpanded={expandedEvents.has(event.id)}
            isSelected={event.id === selectedEventId}
            onToggle={() => {
              handleToggle(event.id);
              onSelectEvent(event);
            }}
            onRevert={() => onRevert(event)}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className={styles.timelineLoadMore}>
          <button
            type="button"
            className={styles.timelineLoadMoreBtn}
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

export default AuditTimeline;
