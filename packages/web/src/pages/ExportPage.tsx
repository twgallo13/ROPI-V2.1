import { useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import { ExportBlockedModal } from '@/components/export/ExportBlockedModal';
import { useExportCompletion } from '@/hooks/useExportCompletion';
import { usePageTitle } from '@/hooks/usePageTitle';
import { getAuthHeaders } from '@/lib/authHeaders';

/**
 * Export Manager Page
 * LP-export-unlock-1.0.0
 * LP-export-global-impl-2b | HES B/C Enhancement
 *
 * Handles product data exports with completion gate enforcement.
 * Supports both SITE_SCOPED and GLOBAL modes:
 * - SITE_SCOPED: Site dropdown shown, site param sent in export request
 * - GLOBAL: Site dropdown hidden, "🌍 Global Export Mode" badge shown, site='GLOBAL' sent
 *
 * Export is gated solely by completion.ready:
 * - completion not loaded → disabled + loading indicator
 * - completion.ready === true → export enabled, UI interactive
 * - completion.ready === false → blocked modal with reasons
 */

function ExportPage() {
  usePageTitle('Export');
  
  const { loading, error, completion, exportReady, exportBlocked, refresh } = useExportCompletion();
  const [exporting, setExporting] = useState(false);
  const [selectedSite, setSelectedSite] = useState('ropi-web');
  const [selectedFormat, setSelectedFormat] = useState('csv');

  // Detect mode from completion data (defaults to SITE_SCOPED if not specified)
  const exportMode = completion?.mode ?? 'SITE_SCOPED';

  async function handleExport() {
    // Guard: only allow export when completion.ready === true
    if (!exportReady) {
      return;
    }

    try {
      setExporting(true);
      const authHeaders = await getAuthHeaders();

      // In GLOBAL mode, send site: 'GLOBAL'; in SITE_SCOPED, send selected site
      const siteValue = exportMode === 'GLOBAL' ? 'GLOBAL' : selectedSite;

      const response = await fetch('/api/admin/exports/dry-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          site: siteValue,
          format: selectedFormat,
          limit: 100,
          includeMeta: true,
        }),
      });

      if (!response.ok) {
        // Re-check completion on failure (may have changed)
        await refresh();
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      alert(`Export successful! ${result.summary?.exportedProducts || 0} products exported.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      alert(message);
    } finally {
      setExporting(false);
    }
  }

  // Derive UI states from completion.ready
  const isDisabled = loading || !exportReady || exporting;
  const buttonLabel = loading
    ? 'Checking readiness...'
    : exporting
      ? 'Exporting...'
      : exportReady
        ? 'Start Export'
        : 'Export Blocked';

  return (
    <PageLayout title="Export Manager">
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h2>Product Export</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Export products to CSV for downstream systems. Exports are blocked if completion
            requirements are not met (see Completion Rules in Settings).
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface)',
            }}
            data-testid="export-loading"
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
            <p>Checking export readiness...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              padding: '2rem',
              textAlign: 'center',
              border: '1px solid var(--color-error)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-error-bg)',
            }}
            data-testid="export-error"
          >
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
            <p style={{ color: 'var(--color-error)' }}>{error}</p>
            <button
              onClick={refresh}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Export Ready State */}
        {!loading && !error && exportReady && (
          <div
            style={{
              padding: '2rem',
              border: '1px solid var(--color-success)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface)',
            }}
            data-testid="export-ready"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>✅</span>
              <h3 style={{ margin: 0 }}>Export Ready</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Completion requirements met. You can export products.
              {completion?.completionPct !== undefined && (
                <span style={{ marginLeft: '0.5rem' }}>
                  (Completion: {completion.completionPct.toFixed(0)}% / {completion.threshold}% threshold)
                </span>
              )}
            </p>

            <div style={{ marginBottom: '2rem' }}>
              <h4>Export Options</h4>

              {/* GLOBAL Mode Badge */}
              {exportMode === 'GLOBAL' && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '4px',
                    marginBottom: '1rem',
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>🌍</span>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1565c0' }}>Global Export Mode</div>
                    <div style={{ fontSize: '0.85rem', color: '#0d47a1' }}>Product-level evaluation</div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}
              >
                {/* Site Selector - Hidden in GLOBAL Mode */}
                {exportMode !== 'GLOBAL' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                      Site
                    </label>
                    <select
                      value={selectedSite}
                      onChange={(e) => setSelectedSite(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: '4px',
                      }}
                      data-testid="export-site-select"
                    >
                      <option value="ropi-web">ropi-web</option>
                      <option value="shiekh">shiekh</option>
                      <option value="karmaloop">karmaloop</option>
                      <option value="mltd">mltd</option>
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                    Format
                  </label>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                    }}
                    data-testid="export-format-select"
                  >
                    <option value="csv">CSV (RetailOps)</option>
                    <option value="json">JSON</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isDisabled}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.6 : 1,
              }}
              data-testid="export-button"
            >
              {buttonLabel}
            </button>
          </div>
        )}

        {/* Export Blocked State - show summary card (modal auto-opens) */}
        {!loading && !error && exportBlocked && (
          <div
            style={{
              padding: '2rem',
              border: '1px solid var(--color-warning)',
              borderRadius: '8px',
              backgroundColor: 'var(--color-surface)',
            }}
            data-testid="export-blocked"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🚫</span>
              <h3 style={{ margin: 0 }}>Export Blocked</h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
              {completion?.operatorExplanation?.summary ||
                'Completion requirements not met. See details below.'}
            </p>
            {completion?.completionPct !== undefined && (
              <p style={{ marginBottom: '1rem' }}>
                Current completion: <strong>{completion.completionPct.toFixed(0)}%</strong> (required:{' '}
                {completion.threshold}%)
              </p>
            )}
            <button
              onClick={refresh}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '1rem',
              }}
            >
              Refresh Status
            </button>
          </div>
        )}
      </div>

      {/* Export Blocked Modal — auto-opens when exportBlocked */}
      <ExportBlockedModal
        open={exportBlocked}
        onClose={refresh}
        summary={completion?.operatorExplanation?.summary}
        blockingReasons={completion?.blockingReasons}
        catalogStats={completion?.catalogStats}
        operatorExplanation={completion?.operatorExplanation}
      />
    </PageLayout>
  );
}

export default ExportPage;
