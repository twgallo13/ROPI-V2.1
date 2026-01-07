/**
 * Completion / Export Gate Panel
 * LP-completion-user-visibility-ui-1.4.0
 * Phase 2B: Extended to support GLOBAL mode product-level readiness
 */

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '../../lib/authHeaders';
import { GlobalModeCard, type ProductLevelReadiness } from './GlobalModeCard';
import './CompletionExportGatePanel.css';

export interface CompletionEvaluationResult {
  ready: boolean;
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
  mode?: 'GLOBAL' | 'SITE_SCOPED';
  productLevelReadiness?: ProductLevelReadiness;
  operatorExplanation?: {
    summary?: string;
    blockingIssues?: string[];
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
    actionRequired?: string[];
  };
}

interface CompletionExportGatePanelProps {
  productId: string;
}

async function fetchProductCompletion(
  productId: string
): Promise<CompletionEvaluationResult | null> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`/api/products/${productId}/completion`, {
      headers: {
        ...authHeaders,
      },
    });

    if (!response.ok) {
      console.warn(`[CompletionPanel] Failed to fetch completion: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[CompletionPanel] Error fetching completion:', error);
    throw error;
  }
}

export function CompletionExportGatePanel({ productId }: CompletionExportGatePanelProps) {
  const [completion, setCompletion] = useState<CompletionEvaluationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const isBlocked = completion ? !completion.ready : false;
  const percentComplete = completion?.completionPct ?? 0;
  const threshold = completion?.threshold;
  const operatorExplanation = completion?.operatorExplanation;
  const blockingIssues = operatorExplanation?.blockingIssues ?? [];
  const completionBreakdown = operatorExplanation?.completionBreakdown ?? [];
  const siteStatus = operatorExplanation?.siteStatus ?? [];
  const actionRequired = operatorExplanation?.actionRequired ?? [];

  // Phase 2B: Detect GLOBAL mode
  const isGlobalMode = completion?.mode === 'GLOBAL' && completion?.productLevelReadiness;

  return (
    <div className="completion-export-gate-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          {isBlocked ? '🚫' : '✅'} 
          {isGlobalMode ? 'Global Completion / Export' : 'Completion / Export'}
        </h3>
        <button className="refresh-button" onClick={loadCompletion} title="Refresh">
          ↻
        </button>
      </div>

      {loading && <div className="panel-loading">Loading completion data...</div>}

      {error && (
        <div className="panel-error">
          <div>{error}</div>
          <button className="retry-button" onClick={loadCompletion}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && !completion && (
        <div className="panel-empty">
          <div>No completion data returned for this product.</div>
          <button className="retry-button" onClick={loadCompletion}>
            Retry
          </button>
        </div>
      )}

      {completion && (
        <>
          {/* Phase 2B: GLOBAL Mode Rendering */}
          {isGlobalMode ? (
            <>
              <GlobalModeCard
                productLevelReadiness={completion.productLevelReadiness!}
                threshold={threshold}
                operatorExplanation={operatorExplanation}
              />

              {/* Advanced Toggle: Show site details if available */}
              {completion.productLevelReadiness!.sitesEvaluated.length > 0 &&
                siteStatus.length > 0 && (
                  <div className="advanced-section">
                    <button
                      className="advanced-toggle"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      title="Show/hide site-specific details"
                    >
                      <span className="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
                      <span className="toggle-text">Advanced Details</span>
                      <span className="toggle-count">
                        ({completion.productLevelReadiness!.sitesEvaluated.length} sites)
                      </span>
                    </button>

                    {showAdvanced && (
                      <div className="advanced-details">
                        <h4 className="advanced-title">Site Status (Per-Site Details)</h4>
                        <div className="sites-list">
                          {siteStatus.map((site) => (
                            <div key={site.site} className="site-detail-item">
                              <div className="site-detail-header">
                                <span className="site-detail-name">{site.site}</span>
                                <span className="site-detail-status">
                                  {site.blocked ? '❌ Blocked' : '✅ Ready'}
                                </span>
                              </div>
                              {site.reason && (
                                <div className="site-detail-reason">{site.reason}</div>
                              )}
                              {site.missingAttributes && site.missingAttributes.length > 0 && (
                                <div className="site-detail-missing">
                                  <strong>Missing:</strong> {site.missingAttributes.join(', ')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </>
          ) : (
            /* Existing SITE_SCOPED Mode Rendering */
            <>
              <div className="completion-section">
                <div className="completion-header">
                  <span>Completion</span>
                  <span className="completion-percentage">{percentComplete.toFixed(0)}%</span>
                </div>
                <div className="completion-bar-container">
                  <div
                    className={`completion-bar ${threshold !== undefined && percentComplete >= threshold ? 'ready' : 'blocked'}`}
                    style={{ width: `${Math.min(percentComplete, 100)}%` }}
                  />
                </div>
                <div className="threshold-info">
                  Export threshold: <strong>{threshold !== undefined ? `${threshold}%` : '—'}</strong>
                </div>
              </div>

              <div className="status-badge-container">
                {isBlocked ? (
                  <div className="badge badge-blocked">❌ Blocked from export</div>
                ) : (
                  <div className="badge badge-ready">✅ Ready for export</div>
                )}
              </div>

              {siteStatus.length > 0 && (
                <div className="sites-section">
                  <h4 className="section-title">Site Status</h4>
                  <div className="sites-list">
                    {siteStatus.map((site) => (
                      <div key={site.site} className="site-item">
                        <button
                          className={`site-button ${site.blocked ? 'blocked' : 'ready'}`}
                          onClick={() => setExpandedSite(expandedSite === site.site ? null : site.site)}
                        >
                          <span className="site-icon">{site.blocked ? '❌' : '✅'}</span>
                          <span className="site-name">{site.site}</span>
                          <span className="expand-icon">{expandedSite === site.site ? '▼' : '▶'}</span>
                        </button>
                        {expandedSite === site.site && (
                          <div className="site-details">
                            {site.reason && <p className="site-reason">{site.reason}</p>}
                            {site.missingAttributes && site.missingAttributes.length > 0 && (
                              <div className="missing-list">
                                <strong>Missing attributes:</strong>
                                <ul>
                                  {site.missingAttributes.map((attr, idx) => (
                                    <li key={idx}>{attr}</li>
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

              {completionBreakdown.length > 0 && (
                <div className="segment-section">
                  <h4 className="section-title">Completion by Segment</h4>
                  <div className="segments-list">
                    {completionBreakdown.map((segment) => (
                      <div key={segment.segmentId} className="segment-item">
                        <div className="segment-header">
                          <div className="segment-name">{segment.segmentName}</div>
                          <div className="segment-weight">Weight: {segment.weightPct}%</div>
                        </div>
                        <div className="segment-score">Score: {segment.score}%</div>
                        {segment.missingAttributes.length > 0 && (
                          <div className="segment-missing">
                            Missing: {segment.missingAttributes.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Common sections (apply to both modes) */}
          {operatorExplanation?.summary && (
            <div className="summary-section">
              <h4 className="section-title">Summary</h4>
              <p className="summary-text">{operatorExplanation.summary}</p>
            </div>
          )}

          {completion.blockingReasons.length > 0 && (
            <div className="blocking-reasons-section">
              <h4 className="section-title">Why blocked ({completion.blockingReasons.length})</h4>
              <div className="reasons-list">
                {completion.blockingReasons.map((reason, i) => (
                  <div key={i} className="reason">
                    <div className="reason-icon">⚠️</div>
                    <div className="reason-content">
                      <div className="reason-type">{reason.type}</div>
                      <div className="reason-message">{reason.message}</div>
                      {reason.details?.missingAttributes && reason.details.missingAttributes.length > 0 && (
                        <div className="reason-attrs">Missing: {reason.details.missingAttributes.join(', ')}</div>
                      )}
                      {reason.details?.site && <div className="reason-attrs">Site: {reason.details.site}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {blockingIssues.length > 0 && (
            <div className="blocking-issues-section">
              <h4 className="section-title">Blocking issues</h4>
              <ul className="blocking-issues">
                {blockingIssues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {actionRequired.length > 0 && (
            <div className="action-section">
              <h4 className="section-title">What to do next</h4>
              <ul className="action-list">
                {actionRequired.map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
