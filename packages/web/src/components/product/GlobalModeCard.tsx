/**
 * Global Mode Card Component
 * LP-export-global-impl-2b: UI for product-level readiness aggregation
 *
 * Displays product-level completion statistics when GLOBAL mode is active.
 * Shows aggregated completion percentage, segment breakdown with BEST scores,
 * and identifies blocking segments preventing export.
 */

import './GlobalModeCard.css';

export interface SegmentScore {
  segmentId: string;
  segmentName: string;
  score: number;
  weightPct: number;
  missingAttributes: string[];
}

export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;
  segmentScores: SegmentScore[];
  missingGlobalAttributes: string[];
  websiteOptional: boolean;
  sitesEvaluated: string[];
  blockingSegments: string[];
}

interface GlobalModeCardProps {
  productLevelReadiness: ProductLevelReadiness;
  threshold?: number;
  operatorExplanation?: {
    summary?: string;
    actionRequired?: string[];
  };
}

export function GlobalModeCard({
  productLevelReadiness,
  threshold = 80,
  operatorExplanation,
}: GlobalModeCardProps) {
  const {
    aggregatedCompletionPct,
    segmentScores,
    missingGlobalAttributes,
    sitesEvaluated,
    blockingSegments,
  } = productLevelReadiness;

  const isReady = aggregatedCompletionPct >= threshold;

  return (
    <div className="global-mode-card">
      {/* Header */}
      <div className="global-card-header">
        <div className="header-title">
          <span className="global-icon">🌍</span>
          <h4>Global Completion (Aggregated)</h4>
        </div>
        <div className="header-status">
          {isReady ? (
            <span className="status-badge ready">✅ Ready</span>
          ) : (
            <span className="status-badge blocked">❌ Blocked</span>
          )}
        </div>
      </div>

      {/* Completion Summary */}
      <div className="completion-summary">
        <div className="completion-stat">
          <span className="stat-label">Aggregated Completion</span>
          <span className="stat-value">{aggregatedCompletionPct.toFixed(0)}%</span>
        </div>
        {threshold !== undefined && (
          <div className="completion-threshold">
            Export threshold: <strong>{threshold}%</strong>
          </div>
        )}
      </div>

      {/* Completion Progress Bar */}
      <div className="completion-bar-container">
        <div
          className={`completion-bar ${isReady ? 'ready' : 'blocked'}`}
          style={{ width: `${Math.min(aggregatedCompletionPct, 100)}%` }}
        />
      </div>

      {/* Operator Summary (if available) */}
      {operatorExplanation?.summary && (
        <div className="summary-section">
          <p className="summary-text">{operatorExplanation.summary}</p>
        </div>
      )}

      {/* Segment Breakdown */}
      {segmentScores.length > 0 && (
        <div className="segment-breakdown-section">
          <h5 className="section-subtitle">Completion by Segment (BEST Scores)</h5>
          <div className="segment-table">
            <div className="segment-header-row">
              <div className="segment-col-name">Segment</div>
              <div className="segment-col-score">Score</div>
              <div className="segment-col-weight">Weight</div>
              <div className="segment-col-status">Status</div>
            </div>
            {segmentScores.map((segment) => {
              const isSegmentComplete = segment.score >= 100;
              const isBlocking = blockingSegments.includes(segment.segmentId);

              return (
                <div key={segment.segmentId} className="segment-row">
                  <div className="segment-col-name">{segment.segmentName}</div>
                  <div className="segment-col-score">{segment.score.toFixed(0)}%</div>
                  <div className="segment-col-weight">{segment.weightPct}%</div>
                  <div className="segment-col-status">
                    {isSegmentComplete ? (
                      <span className="status-icon complete">✓</span>
                    ) : isBlocking ? (
                      <span className="status-icon blocking">⚠</span>
                    ) : (
                      <span className="status-icon incomplete">◐</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Blocking Segments Alert */}
      {blockingSegments.length > 0 && (
        <div className="blocking-segments-section">
          <div className="section-header">
            <span className="alert-icon">⚠️</span>
            <span className="section-title">Blocking Segments ({blockingSegments.length})</span>
          </div>
          <div className="blocking-list">
            {blockingSegments.map((segmentId) => {
              const segment = segmentScores.find((s) => s.segmentId === segmentId);
              return (
                <div key={segmentId} className="blocking-item">
                  <span className="blocking-name">{segment?.segmentName || segmentId}</span>
                  <span className="blocking-score">{segment?.score.toFixed(0) || '?'}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Missing Global Attributes */}
      {missingGlobalAttributes.length > 0 && (
        <div className="missing-attributes-section">
          <h5 className="section-subtitle">Missing Attributes</h5>
          <div className="missing-list">
            {missingGlobalAttributes.map((attr) => (
              <div key={attr} className="missing-item">
                <span className="missing-icon">○</span>
                <span className="missing-name">{attr}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Required (if available) */}
      {operatorExplanation?.actionRequired && operatorExplanation.actionRequired.length > 0 && (
        <div className="action-required-section">
          <h5 className="section-subtitle">What to do next</h5>
          <ul className="action-list">
            {operatorExplanation.actionRequired.map((action, idx) => (
              <li key={idx}>{action}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sites Evaluated (Collapsible) */}
      {sitesEvaluated.length > 0 && (
        <div className="sites-evaluated-section">
          <div className="site-info">
            <span className="site-count-label">Sites evaluated: {sitesEvaluated.length}</span>
            <div className="site-list-inline">
              {sitesEvaluated.slice(0, 3).map((site) => (
                <span key={site} className="site-badge">
                  {site}
                </span>
              ))}
              {sitesEvaluated.length > 3 && (
                <span className="site-more">+{sitesEvaluated.length - 3} more</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
