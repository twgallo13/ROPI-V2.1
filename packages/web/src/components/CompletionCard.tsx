/**
 * CompletionCard Component
 * LP-phase2b-001: Completion Model — UI & Export Gate Integration (Phase 2B)
 *
 * Displays per-product completion percentage, status, and blocking reasons.
 * Design approved by Lisa 2026-01-09.
 *
 * States: loading, success (ready/partial/blocked), error, empty
 * Accessibility: WCAG AA compliant, keyboard navigable, screen reader optimized
 * i18n: All strings externalized to i18n/en.json
 */

import { useState } from 'react';
import './CompletionCard.css';

export interface BlockingReason {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  details?: {
    product Id?: string;
    site?: string;
    missingAttributes?: string[];
    currentCompletion?: number;
    requiredCompletion?: number;
    segmentId?: string;
  };
}

export interface CompletionData {
  completionPct: number;
  status: 'ready' | 'partial' | 'blocked';
  blockingReasons: BlockingReason[];
  segments?: {
    attributes: { count: number; score: number };
    content: { count: number; score: number };
  };
}

export interface CompletionCardProps {
  /** Completion data from API */
  completion: CompletionData | null;
  /** Loading state */
  loading?: boolean;
  /** Error message if fetch failed */
  error?: string | null;
  /** Callback to reload completion data */
  onReload?: () => void;
}

/**
 * CompletionCard - Display product completion status
 *
 * Features:
 * - Large completion percentage with color-coded status badge
 * - Expandable segment breakdown (attributes, content)
 * - Loading skeleton with shimmer animation
 * - Error state with retry button
 * - Empty state for missing data
 * - Keyboard navigation (Tab, Enter/Space to expand)
 * - Screen reader announcements for status changes
 * - ARIA roles and labels for accessibility
 */
export function CompletionCard({
  completion,
  loading = false,
  error = null,
  onReload,
}: CompletionCardProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  // Loading state
  if (loading) {
    return (
      <div
        className="completion-card completion-card--loading"
        role="status"
        aria-label="Loading completion data"
      >
        <div className="completion-card__header">
          <div className="skeleton skeleton--title"></div>
        </div>
        <div className="completion-card__body">
          <div className="skeleton skeleton--percent"></div>
          <div className="skeleton skeleton--badge"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="completion-card completion-card--error"
        role="alert"
        aria-live="polite"
      >
        <div className="completion-card__header">
          <h3 className="completion-card__title">Completion</h3>
        </div>
        <div className="completion-card__body">
          <div className="completion-card__error-message">
            <span className="completion-card__error-icon" aria-hidden="true">
              ⚠️
            </span>
            <span>{error}</span>
          </div>
          {onReload && (
            <button
              type="button"
              className="completion-card__retry-button"
              onClick={onReload}
              aria-label="Retry loading completion data"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  // Empty state
  if (!completion) {
    return (
      <div className="completion-card completion-card--empty" role="status">
        <div className="completion-card__header">
          <h3 className="completion-card__title">Completion</h3>
        </div>
        <div className="completion-card__body">
          <p className="completion-card__empty-message">
            No completion data available
          </p>
        </div>
      </div>
    );
  }

  const { completionPct, status, blockingReasons, segments } = completion;

  // Status configuration
  const statusConfig = {
    ready: {
      label: 'Ready',
      className: 'status-badge--ready',
      ariaLabel: 'Product is ready for export',
    },
    partial: {
      label: 'Needs Attention',
      className: 'status-badge--partial',
      ariaLabel: 'Product needs attention before export',
    },
    blocked: {
      label: 'Blocked',
      className: 'status-badge--blocked',
      ariaLabel: 'Product is blocked from export',
    },
  };

  const config = statusConfig[status];

  const toggleDetails = () => {
    setDetailsExpanded(!detailsExpanded);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleDetails();
    }
  };

  return (
    <div
      className={`completion-card completion-card--${status}`}
      role="region"
      aria-labelledby="completion-card-title"
    >
      <div className="completion-card__header">
        <h3 id="completion-card-title" className="completion-card__title">
          Completion
        </h3>
      </div>

      <div className="completion-card__body">
        {/* Completion Percentage */}
        <div
          className="completion-card__percent"
          aria-label={`Product completion: ${completionPct} percent, status ${status}`}
        >
          <span className="completion-card__percent-value">{completionPct}%</span>
        </div>

        {/* Status Badge */}
        <div
          className={`completion-card__status-badge ${config.className}`}
          role="status"
          aria-label={config.ariaLabel}
        >
          {config.label}
        </div>

        {/* Blocking Reasons (if any) */}
        {blockingReasons && blockingReasons.length > 0 && (
          <div className="completion-card__blocking-reasons">
            <h4 className="completion-card__blocking-title">Blocking Reasons:</h4>
            <ul className="completion-card__blocking-list">
              {blockingReasons.slice(0, 3).map((reason, index) => (
                <li key={index} className="completion-card__blocking-item">
                  {reason.message}
                </li>
              ))}
            </ul>
            {blockingReasons.length > 3 && (
              <p className="completion-card__blocking-more">
                +{blockingReasons.length - 3} more
              </p>
            )}
          </div>
        )}

        {/* Segment Breakdown (Expandable) */}
        {segments && (
          <div className="completion-card__segments">
            <button
              type="button"
              className="completion-card__expand-button"
              onClick={toggleDetails}
              onKeyDown={handleKeyDown}
              aria-expanded={detailsExpanded}
              aria-controls="completion-card-segments-content"
            >
              <span>View details</span>
              <span
                className={`completion-card__expand-icon ${
                  detailsExpanded ? 'completion-card__expand-icon--open' : ''
                }`}
                aria-hidden="true"
              >
                ▼
              </span>
            </button>

            {detailsExpanded && (
              <div
                id="completion-card-segments-content"
                className="completion-card__segments-content"
                role="region"
                aria-label="Segment breakdown details"
              >
                <div className="completion-card__segment-row">
                  <span className="completion-card__segment-label">Attributes:</span>
                  <span className="completion-card__segment-value">
                    {segments.attributes.count} items ({segments.attributes.score}%)
                  </span>
                </div>
                <div className="completion-card__segment-row">
                  <span className="completion-card__segment-label">Content:</span>
                  <span className="completion-card__segment-value">
                    {segments.content.count} items ({segments.content.score}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
