import { useState } from 'react';
import PageLayout from '@/components/common/PageLayout';
import { ExportBlockedModal, type ExportBlockingReason } from '@/components/export/ExportBlockedModal';

/**
 * Export Manager Page
 * 
 * Handles product data exports with completion gate enforcement.
 * Shows 423 blocking modal when export is blocked by completion requirements.
 */
interface ExportBlockedPayload {
  success: false;
  error: string;
  message: string;
  readiness: {
    ready: boolean;
    completionPct: number;
    threshold: number;
    hasBlockingSites: boolean;
    blockingReasons: ExportBlockingReason[];
    operatorExplanation: {
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
    catalogStats?: {
      totalProducts: number;
      blockedByCompletionCount: number;
      blockedBySiteCount: number;
      readyCount: number;
    };
  };
}

function ExportPage() {
  const [exportBlocked, setExportBlocked] = useState(false);
  const [blockedPayload, setBlockedPayload] = useState<ExportBlockedPayload | null>(null);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    try {
      setExporting(true);

      const response = await fetch('/api/admin/exports/dry-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebase_token') || ''}`,
        },
        body: JSON.stringify({
          site: 'ropi-web',
          limit: 100,
          includeMeta: true,
        }),
      });

      if (response.status === 423) {
        // Export blocked - show modal
        const data = (await response.json()) as ExportBlockedPayload;
        setBlockedPayload(data);
        setExportBlocked(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      const result = await response.json();
      alert(`Export successful! ${result.summary?.exportedProducts || 0} products exported.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      alert(message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageLayout title="Export Manager">
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2>Product Export</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Export products to CSV for downstream systems. Exports are blocked if completion
            requirements are not met (see Completion Rules in Settings).
          </p>
        </div>

        <div style={{
          padding: '2rem',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          backgroundColor: 'var(--color-surface)',
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <h3>Export Options</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Site
                </label>
                <select style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                }}>
                  <option>ropi-web</option>
                  <option>shiekh</option>
                  <option>karmaloop</option>
                  <option>mltd</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Format
                </label>
                <select style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                }}>
                  <option>CSV (RetailOps)</option>
                  <option>JSON</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: exporting ? 'not-allowed' : 'pointer',
              opacity: exporting ? 0.6 : 1,
            }}
          >
            {exporting ? 'Exporting...' : 'Start Export'}
          </button>

          <p style={{
            marginTop: '1rem',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            💡 If export is blocked, the page will show you exactly why and what to fix.
          </p>
        </div>
      </div>

      {/* Export Blocked Modal */}
      <ExportBlockedModal
        open={exportBlocked}
        onClose={() => setExportBlocked(false)}
        summary={blockedPayload?.readiness.operatorExplanation?.summary}
        blockingReasons={blockedPayload?.readiness.blockingReasons}
        catalogStats={blockedPayload?.readiness.catalogStats}
        operatorExplanation={blockedPayload?.readiness.operatorExplanation}
      />
    </PageLayout>
  );
}

export default ExportPage;
