/**
 * Completion / Export Gate Panel
 * 
 * Sidebar panel in product editor showing completion status and blocking reasons.
 * Helps operators understand exactly what's missing for export.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CompletionExportGatePanel.css';

export interface CompletionEvaluationResult {
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: Array<{
    type: string;
    severity: string;
    message: string;
    details?: {
      site?: string;
      missingAttributes?: string[];
      segmentId?: string;
    };
  }>;
  operatorExplanation?: {
    summary: string;
    blockingIssues: string[];
    completionBreakdown: Array<{
      segmentId: string;
      segmentName: string;
      score: number;
      weightPct: number;
      missingAttributes: string[];
    }>;
    siteStatus: Array<{
      site: string;
      blocked: boolean;
      reason?: string;
      missingAttributes?: string[];
    }>;
    actionRequired: string[];
  };
}

interface CompletionExportGatePanelProps {
  productId: string;
}

/**
 * Fetch product completion evaluation from API
 */
async function fetchProductCompletion(
  productId: string
): Promise<CompletionEvaluationResult | null> {
  try {
    const response = await fetch(`/api/products/${productId}/completion`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('firebase_token') || ''}`,
      },
    });

    if (!response.ok) {
      console.warn(`[CompletionPanel] Failed to fetch completion: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[CompletionPanel] Error fetching completion:', error);
    return null;
  }
}

/**
 * Completion / Export Gate Panel Component
 */
export function CompletionExportGatePanel({
  productId,
}: CompletionExportGatePanelProps) {
  const navigate = useNavigate();
  const [completion, setCompletion] = useState<CompletionEvaluationResult | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);

  useEffect(() => {
    loadCompletion();
  }, [productId]);

  async function loadCompletion() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchProductCompletion(productId);
      setCompletion(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load completion';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const isBlocked = !completion || completion.blockingReasons.length > 0;
  const percentComplete = completion?.completionPct || 0;
  const threshold = completion?.threshold || 80;

  return (
    <div className="completion-export-gate-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          {isBlocked ? '🚫' : '✅'} Completion / Export
        </h3>
        <button
          className="refresh-button"
          onClick={loadCompletion}
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {loading && <div className="panel-loading">Loading completion data...</div>}

      {error && <div className="panel-error">{error}</div>}

      {completion && (
        <>
          {/* Completion Percentage */}
          <div className="completion-section">
            <div className="completion-header">
              <span>Completion</span>
              <span className="completion-percentage">
                {percentComplete.toFixed(0)}%
              </span>
            </div>
            <div className="completion-bar-container">
              <div
                className={`completion-bar ${percentComplete >= threshold ? 'ready' : 'blocked'}`}
                style={{ width: `${Math.min(percentComplete, 100)}%` }}
              >
                {percentComplete > 10 && <span>{percentComplete.toFixed(0)}%</span>}
              </div>
            </div>
            <div className="threshold-info">
              Export threshold: <strong>{threshold}%</strong>
            </div>
          </div>

          {/* Status Badge */}
          <div className="status-badge-container">
            {isBlocked ? (
              <div className="badge badge-blocked">
                ❌ Blocked from export
              </div>
            ) : (
              <div className="badge badge-ready">
                ✅ Ready for export
              </div>
            )}
          </div>

          {/* Blocking Reasons */}
          {completion.blockingReasons.length > 0 && (
            <div className="blocking-reasons-section">
              <h4 className="section-title">
                Why blocked ({completion.blockingReasons.length})
              </h4>
              <div className="reasons-list">
                {completion.blockingReasons.map((reason, i) => (
                  <div key={i} className="reason">
                    <div className="reason-icon">⚠️</div>
                    <div className="reason-content">
                      <div className="reason-type">{reason.type}</div>
                      <div className="reason-message">{reason.message}</div>
                      {reason.details?.missingAttributes &&
                        reason.details.missingAttributes.length > 0 && (
                          <div className="reason-attrs">
                            Missing: {reason.details.missingAttributes.join(', ')}
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operator Explanation */}
          {completion.operatorExplanation && (
            <>
              {/* Site Status */}
              {completion.operatorExplanation.siteStatus &&
                completion.operatorExplanation.siteStatus.length > 0 && (
                  <div className="sites-section">
                    <h4 className="section-title">Site Status</h4>
                    <div className="sites-list">
                      {completion.operatorExplanation.siteStatus.map((site) => (
                        <div key={site.site} className="site-item">
                          <button
                            className={`site-button ${site.blocked ? 'blocked' : 'ready'}`}
                            onClick={() =>
                              setExpandedSite(
                                expandedSite === site.site ? null : site.site
                              )
                            }
                          >
                            <span className="site-icon">
                              {site.blocked ? '❌' : '✅'}
                            </span>
                            <span className="site-name">{site.site}</span>
                            <span className="expand-icon">
                              {expandedSite === site.site ? '▼' : '▶'}
                            </span>
                          </button>

                          {expandedSite === site.site && site.missingAttributes && (
                            <div className="site-details">
                              {site.reason && (
                                <p className="site-reason">{site.reason}</p>
                              )}
                              {site.missingAttributes.length > 0 && (
                                <div className="missing-list">
                                  <strong>Missing attributes:</strong>
                                  <ul>
                                    {site.missingAttributes.map((attr, j) => (
                                      <li key={j}>{attr}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Completion by Segment */}
              {completion.operatorExplanation.completionBreakdown &&
                completion.operatorExplanation.completionBreakdown.length > 0 && (
                  <div className="segments-section">
                    <h4 className="section-title">Completion by Segment</h4>
                    <div className="segments-breakdown">
                      {completion.operatorExplanation.completionBreakdown.map(
                        (segment) => (
                          <div key={segment.segmentId} className="segment-row">
                            <div className="segment-name">
                              {segment.segmentName}
                            </div>
                            <div className="segment-bar-container">
                              <div
                                className="segment-bar"
                                style={{
                                  width: `${Math.min(segment.score, 100)}%`,
                                }}
                              />
                            </div>
                            <div className="segment-score">
                              {segment.score.toFixed(0)}%
                            </div>
                            {segment.missingAttributes.length > 0 && (
                              <div className="segment-missing">
                                Missing: {segment.missingAttributes.join(', ')}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              {/* Action Required */}
              {completion.operatorExplanation.actionRequired &&
                completion.operatorExplanation.actionRequired.length > 0 && (
                  <div className="actions-section">
                    <h4 className="section-title">What to fix</h4>
                    <ul className="actions-list">
                      {completion.operatorExplanation.actionRequired.map(
                        (action, i) => (
                          <li key={i}>{action}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
            </>
          )}

          {/* CTA Links */}
          <div className="panel-ctas">
            <button
              className="cta-button"
              onClick={() => navigate('/settings/export-settings')}
            >
              View Export Settings
            </button>
            <button
              className="cta-button secondary"
              onClick={loadCompletion}
            >
              Refresh Status
            </button>
          </div>
        </>
      )}
    </div>
  );
}
