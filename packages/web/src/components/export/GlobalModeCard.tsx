/**
 * GlobalModeCard Component
 * LP-export-global-impl-2b | HES B/C Implementation
 *
 * Renders product-level aggregated completion data for GLOBAL mode exports.
 * Displays: aggregatedCompletionPct, segment scores (BEST-score-per-segment),
 * missingGlobalAttributes, blockingSegments, sitesEvaluated (collapsible).
 */

import { useState } from 'react';
import './GlobalModeCard.css';

export interface SegmentScore {
  segmentId: string;
  score: number;
  weightPct: number;
  missingAttributes?: string[];
  segmentName?: string;
}

export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;
  segmentScores: SegmentScore[];
  missingGlobalAttributes: string[];
  blockingSegments: string[];
  sitesEvaluated: string[];
  websiteOptional?: boolean;
}

export interface GlobalModeCardProps {
  productLevelReadiness: ProductLevelReadiness;
  threshold?: number;
  isBlocked?: boolean;
}

export function GlobalModeCard({
  productLevelReadiness,
  threshold,
  isBlocked = false,
}: GlobalModeCardProps) {
  const [sitesExpanded, setSitesExpanded] = useState(false);

  if (!productLevelReadiness) {
    return null;
  }

  const {
    aggregatedCompletionPct,
    segmentScores,
    missingGlobalAttributes,
    blockingSegments,
    sitesEvaluated,
  } = productLevelReadiness;

  const isReady = !isBlocked && (threshold ? aggregatedCompletionPct >= threshold : true);

  return (
    <div className="global-mode-card">
      <div className="card-header">
        <h3 className="card-title">🌍 Global Mode - Product-Level Evaluation</h3>
        <span className={`status-badge ${isReady ? 'ready' : 'blocked'}`}>
          {isReady ? '✅ Ready' : '❌ Blocked'}
        </span>
      </div>

      {/* Aggregated Completion Bar */}
      <div className="completion-section">
        <div className="completion-header">
          <span className="label">Global Completion</span>
          <span className="percentage">{aggregatedCompletionPct.toFixed(0)}%</span>
        </div>
        <div className="completion-bar-container">
          <div
            className={`completion-bar ${isReady ? 'ready' : 'blocked'}`}
            style={{ width: `${Math.min(aggregatedCompletionPct, 100)}%` }}
            role="progressbar"
            aria-valuenow={aggregatedCompletionPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Global completion ${aggregatedCompletionPct.toFixed(0)}%`}
          />
        </div>
        {threshold !== undefined && (
          <div className="threshold-info">
            Threshold: <strong>{threshold}%</strong>
          </div>
        )}
      </div>

      {/* Segment Breakdown Table */}
      {segmentScores.length > 0 && (
        <div className="segment-section">
          <h4 className="section-title">Segment Breakdown (Best Score per Segment)</h4>
          <div className="segments-table">
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>Score</th>
                  <th>Weight</th>
                  <th>Missing Attributes</th>
                </tr>
              </thead>
              <tbody>
                {segmentScores.map((segment) => (
                  <tr key={segment.segmentId}>
                    <td className="segment-name">{segment.segmentName || segment.segmentId}</td>
                    <td className="score">
                      <span className={`score-value ${segment.score === 100 ? 'perfect' : ''}`}>
                        {segment.score}%
                      </span>
                    </td>
                    <td className="weight">{segment.weightPct}%</td>
                    <td className="missing">
                      {segment.missingAttributes && segment.missingAttributes.length > 0
                        ? segment.missingAttributes.join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Missing Global Attributes */}
      {missingGlobalAttributes.length > 0 && (
        <div className="missing-section">
          <h4 className="section-title">Missing Global Attributes</h4>
          <ul className="missing-list">
            {missingGlobalAttributes.map((attr) => (
              <li key={attr}>{attr}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Blocking Segments */}
      {blockingSegments.length > 0 && (
        <div className="blocking-section">
          <h4 className="section-title">Blocking Segments</h4>
          <div className="blocking-list">
            {blockingSegments.map((segment) => (
              <div key={segment} className="blocking-item">
                <span className="icon">⚠️</span>
                <span>{segment}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sites Evaluated (Collapsible) */}
      {sitesEvaluated.length > 0 && (
        <div className="sites-section">
          <button
            className="sites-toggle"
            onClick={() => setSitesExpanded(!sitesExpanded)}
            aria-expanded={sitesExpanded}
            aria-controls="sites-list"
          >
            <span className="toggle-icon">{sitesExpanded ? '▼' : '▶'}</span>
            <span className="toggle-text">Sites Evaluated ({sitesEvaluated.length})</span>
          </button>
          {sitesExpanded && (
            <div id="sites-list" className="sites-list">
              {sitesEvaluated.map((site) => (
                <div key={site} className="site-item">
                  {site}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GlobalModeCard;
