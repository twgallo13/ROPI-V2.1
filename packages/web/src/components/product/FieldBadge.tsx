/**
 * FieldBadge Component
 * S5 — Product UI: Provenance UX & Edit Behavior
 * LP-smart-rules-ui-provenance-1.0.0
 * 
 * Displays a small, subtle badge/icon inline with form fields when a value
 * was auto-filled by a Smart Rule. Includes an accessible tooltip showing:
 * - Rule name and ID
 * - Reason for the fill
 * - Input data used (e.g., RICS category)
 * - Applied timestamp
 * - Link to rule in Admin UI (if available)
 * 
 * Accessibility:
 * - Keyboard focusable
 * - ARIA label for screen readers
 * - Tooltip accessible via keyboard
 */

import { useState, useRef, useEffect } from 'react';
import type { FieldProvenance } from '../../types/product';
import './FieldBadge.css';

export interface FieldBadgeProps {
  /** Field provenance data */
  provenance: FieldProvenance | undefined;
  /** Field path (e.g., 'attributes.gender') for tooltip */
  fieldPath: string;
  /** Optional class name */
  className?: string;
}

/**
 * Format a timestamp for display
 */
function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * Get admin UI link for a rule
 */
function getRuleAdminLink(ruleId: string): string | undefined {
  // TODO: Wire to actual admin UI route when available
  if (!ruleId) return undefined;
  return `/admin/smart-rules/${ruleId}`;
}

/**
 * FieldBadge - Smart Rule provenance indicator
 */
export function FieldBadge({ provenance, fieldPath, className = '' }: FieldBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Don't render if no provenance or not from Smart Rule
  if (!provenance || provenance.source !== 'smartRule') {
    return null;
  }

  // Close tooltip on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        badgeRef.current &&
        !badgeRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    }

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  // Close tooltip on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowTooltip(false);
        badgeRef.current?.focus();
      }
    }

    if (showTooltip) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showTooltip]);

  const handleToggle = () => {
    setShowTooltip(!showTooltip);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  const ruleLink = provenance.ruleId ? getRuleAdminLink(provenance.ruleId) : undefined;
  const tooltipId = `provenance-tooltip-${fieldPath.replace(/\./g, '-')}`;

  return (
    <span className={`field-badge-container ${className}`}>
      <button
        ref={badgeRef}
        type="button"
        className="field-badge field-badge--smart-rule"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-label={`Smart Rule: ${provenance.ruleName || provenance.ruleId || 'Auto-filled'}`}
        aria-describedby={showTooltip ? tooltipId : undefined}
        aria-expanded={showTooltip}
        title="Auto-filled by Smart Rule"
        data-testid={`field-badge-${fieldPath}`}
      >
        <svg
          className="field-badge__icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Lightning bolt icon */}
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      </button>

      {showTooltip && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          className="field-badge__tooltip"
          role="tooltip"
          aria-live="polite"
        >
          <div className="field-badge__tooltip-header">
            <span className="field-badge__tooltip-title">Smart Rule Applied</span>
            <button
              type="button"
              className="field-badge__tooltip-close"
              onClick={() => setShowTooltip(false)}
              aria-label="Close tooltip"
            >
              ×
            </button>
          </div>

          <dl className="field-badge__tooltip-content">
            {provenance.ruleName && (
              <>
                <dt>Rule Name</dt>
                <dd>
                  {ruleLink ? (
                    <a
                      href={ruleLink}
                      className="field-badge__rule-link"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {provenance.ruleName}
                    </a>
                  ) : (
                    provenance.ruleName
                  )}
                </dd>
              </>
            )}

            {provenance.ruleId && (
              <>
                <dt>Rule ID</dt>
                <dd className="field-badge__mono">{provenance.ruleId}</dd>
              </>
            )}

            {provenance.reason && (
              <>
                <dt>Reason</dt>
                <dd>{provenance.reason}</dd>
              </>
            )}

            {typeof provenance.input?.ricsCategory === 'string' && provenance.input.ricsCategory && (
              <>
                <dt>Input (RICS Category)</dt>
                <dd className="field-badge__mono">
                  {provenance.input.ricsCategory}
                </dd>
              </>
            )}

            {provenance.appliedAt && (
              <>
                <dt>Applied At</dt>
                <dd>{formatTimestamp(provenance.appliedAt)}</dd>
              </>
            )}

            <dt>Field</dt>
            <dd className="field-badge__mono">{fieldPath}</dd>
          </dl>

          {ruleLink && (
            <div className="field-badge__tooltip-footer">
              <a
                href={ruleLink}
                className="field-badge__admin-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                View rule in Admin →
              </a>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

export default FieldBadge;
