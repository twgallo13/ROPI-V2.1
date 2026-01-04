/**
 * Export Blocked Modal Component
 * 
 * Displays when export is blocked by completion gate (HTTP 423).
 * Shows operator-visible explanation with actionable next steps.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExportBlockedModal.css';

export interface ExportBlockingReason {
  type: string;
  severity: string;
  message: string;
  details?: {
    productId?: string;
    site?: string;
    missingAttributes?: string[];
    currentCompletion?: number;
    requiredCompletion?: number;
    segmentId?: string;
  };
}

export interface ExportBlockedModalProps {
  open: boolean;
  onClose: () => void;
  summary?: string;
  blockingReasons?: ExportBlockingReason[];
  catalogStats?: {
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;
    readyCount: number;
  };
  operatorExplanation?: {
    summary: string;
    blockingIssues: string[];
    completionBreakdown?: Array<{
      segmentId: string;
      segmentName: string;
      score: number;
      weightPct: number;
      missingAttributes: string[];
    }>;
    siteStatus?: Array<{
      site: string;
      blocked: boolean;
      reason?: string;
      missingAttributes?: string[];
    }>;
    actionRequired: string[];
  };
}

export function ExportBlockedModal({
  open,
  onClose,
  summary,
  blockingReasons,
  catalogStats,
  operatorExplanation,
}: ExportBlockedModalProps) {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('reasons');

  if (!open) return null;

  const blockedProductIds = blockingReasons
    ?.filter(r => r.details?.productId)
    .map(r => r.details!.productId!)
    .slice(0, 3) || [];

  return (
    <div className="export-blocked-modal-overlay" onClick={onClose}>
      <div className="export-blocked-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            <span className="icon">🚫</span>
            Export Blocked
          </h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div className="modal-summary">
            {summary}
          </div>
        )}

        {/* Operator Explanation */}
        {operatorExplanation && (
          <div className="modal-explanation">
            <div className="explanation-section">
              <h3>What's blocking export</h3>
              <p className="explanation-summary">
                {operatorExplanation.summary}
              </p>
              {operatorExplanation.blockingIssues.length > 0 && (
                <ul className="blocking-issues">
                  {operatorExplanation.blockingIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Site Status */}
            {operatorExplanation.siteStatus && operatorExplanation.siteStatus.length > 0 && (
              <div className="explanation-section">
                <h3>Site Status</h3>
                <div className="sites-status">
                  {operatorExplanation.siteStatus.map((site) => (
                    <div
                      key={site.site}
                      className={`site-card ${site.blocked ? 'blocked' : 'ready'}`}
                    >
                      <div className="site-icon">
                        {site.blocked ? '❌' : '✅'}
                      </div>
                      <div className="site-info">
                        <div className="site-name">{site.site}</div>
                        {site.reason && (
                          <div className="site-reason">{site.reason}</div>
                        )}
                        {site.missingAttributes && site.missingAttributes.length > 0 && (
                          <div className="site-attributes">
                            Missing: {site.missingAttributes.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Breakdown */}
            {operatorExplanation.completionBreakdown &&
              operatorExplanation.completionBreakdown.length > 0 && (
                <div className="explanation-section">
                  <h3>Completion by Segment</h3>
                  <div className="segments-breakdown">
                    {operatorExplanation.completionBreakdown.map((segment) => (
                      <div key={segment.segmentId} className="segment-row">
                        <div className="segment-info">
                          <div className="segment-name">{segment.segmentName}</div>
                          <div className="segment-weight">Weight: {segment.weightPct}%</div>
                        </div>
                        <div className="segment-score">
                          <div className="score-value">{segment.score}%</div>
                          {segment.missingAttributes.length > 0 && (
                            <div className="missing-attrs">
                              Missing: {segment.missingAttributes.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Action Required */}
            {operatorExplanation.actionRequired.length > 0 && (
              <div className="explanation-section action-section">
                <h3>What to do next</h3>
                <ul className="action-list">
                  {operatorExplanation.actionRequired.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Catalog Stats */}
        {catalogStats && (
          <div className="modal-stats">
            <div className="stat-item">
              <div className="stat-label">Total Products</div>
              <div className="stat-value">{catalogStats.totalProducts}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Ready for Export</div>
              <div className="stat-value success">{catalogStats.readyCount}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Blocked (Completion)</div>
              <div className="stat-value blocked">
                {catalogStats.blockedByCompletionCount}
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Blocked (Site)</div>
              <div className="stat-value blocked">
                {catalogStats.blockedBySiteCount}
              </div>
            </div>
          </div>
        )}

        {/* Blocking Reasons (detailed) */}
        {blockingReasons && blockingReasons.length > 0 && (
          <div
            className="modal-section expandable"
            onClick={() =>
              setExpandedSection(
                expandedSection === 'reasons' ? null : 'reasons'
              )
            }
          >
            <h3 className="expandable-header">
              <span className="expand-icon">
                {expandedSection === 'reasons' ? '▼' : '▶'}
              </span>
              Detailed Blocking Reasons ({blockingReasons.length})
            </h3>
            {expandedSection === 'reasons' && (
              <div className="reasons-list">
                {blockingReasons.map((reason, i) => (
                  <div key={i} className="reason-item">
                    <div className="reason-type">{reason.type}</div>
                    <div className="reason-message">{reason.message}</div>
                    {reason.details && (
                      <div className="reason-details">
                        {reason.details.productId && (
                          <span className="detail">
                            Product: {reason.details.productId}
                          </span>
                        )}
                        {reason.details.site && (
                          <span className="detail">Site: {reason.details.site}</span>
                        )}
                        {reason.details.currentCompletion !== undefined && (
                          <span className="detail">
                            Completion: {reason.details.currentCompletion}%
                          </span>
                        )}
                        {reason.details.requiredCompletion !== undefined && (
                          <span className="detail">
                            Required: {reason.details.requiredCompletion}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              navigate('/settings/export-settings');
              onClose();
            }}
          >
            Go to Completion Settings
          </button>
          {blockedProductIds.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                navigate(`/products/${blockedProductIds[0]}`);
                onClose();
              }}
            >
              Open First Blocked Product
            </button>
          )}
          <button className="btn btn-tertiary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
