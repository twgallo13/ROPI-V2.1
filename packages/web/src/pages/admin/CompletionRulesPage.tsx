/**
 * Completion Rules Admin Page
 * LP-phase2b-001: Completion Model — UI & Export Gate Integration (Phase 2B)
 *
 * Read-only view of completion rules versions and history.
 * Design approved by Lisa 2026-01-09.
 *
 * Features:
 * - List of completion rules versions (timestamp, author, rule count)
 * - Read-only version details view
 * - No edit buttons (Phase 2B read-only requirement)
 * - WCAG AA compliant keyboard navigation
 * - Proper table semantics for screen readers
 */

import { useEffect, useState } from 'react';
import { getAuthHeaders } from '../../lib/authHeaders';
import './CompletionRulesPage.css';

interface CompletionRulesVersion {
  rulesVersion: number;
  schemaVersion: string;
  updatedAt: string;
  updatedBy: string;
  ruleCount: number;
  segmentCount: number;
  exportUnlockThresholdPct: number;
}

interface CompletionRulesConfig {
  schemaVersion: string;
  rulesVersion: number;
  updatedAt: string;
  updatedBy: string;
  exportUnlockThresholdPct: number;
  segments: Array<{
    id: string;
    name: string;
    enabled: boolean;
    weightPct: number;
  }>;
}

async function fetchCompletionRulesVersions(): Promise<CompletionRulesVersion[]> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch('/api/admin/completion-rules/versions', {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch rules versions: ${response.status}`);
  }

  return await response.json();
}

async function fetchCompletionRulesConfig(version?: number): Promise<CompletionRulesConfig> {
  const authHeaders = await getAuthHeaders();
  const url = version
    ? `/api/admin/completion-rules/versions/${version}`
    : '/api/admin/completion-rules/config';

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch rules config: ${response.status}`);
  }

  return await response.json();
}

export function CompletionRulesPage() {
  const [versions, setVersions] = useState<CompletionRulesVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [config, setConfig] = useState<CompletionRulesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, []);

  async function loadVersions() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompletionRulesVersions();
      setVersions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load versions';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadVersion(version: number) {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompletionRulesConfig(version);
      setConfig(data);
      setSelectedVersion(version);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load version details';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleBackToList() {
    setSelectedVersion(null);
    setConfig(null);
  }

  function handleVersionClick(version: number) {
    loadVersion(version);
  }

  function handleKeyDown(event: React.KeyboardEvent, version: number) {
    if (event.key === 'Enter') {
      loadVersion(version);
    }
  }

  // Loading state
  if (loading && versions.length === 0) {
    return (
      <div className="completion-rules-page">
        <div className="completion-rules-page__header">
          <h1 className="completion-rules-page__title">Completion Rules Versions</h1>
        </div>
        <div className="completion-rules-page__loading" role="status" aria-label="Loading versions">
          <div className="skeleton skeleton--table"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && versions.length === 0) {
    return (
      <div className="completion-rules-page">
        <div className="completion-rules-page__header">
          <h1 className="completion-rules-page__title">Completion Rules Versions</h1>
        </div>
        <div className="completion-rules-page__error" role="alert" aria-live="polite">
          <span className="completion-rules-page__error-icon" aria-hidden="true">
            ⚠️
          </span>
          <span>{error}</span>
          <button
            type="button"
            className="completion-rules-page__retry-button"
            onClick={loadVersions}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Version details view
  if (selectedVersion !== null && config) {
    return (
      <div className="completion-rules-page">
        <div className="completion-rules-page__header">
          <button
            type="button"
            className="completion-rules-page__back-button"
            onClick={handleBackToList}
            aria-label="Back to versions list"
          >
            ← Back to Versions
          </button>
          <h1 className="completion-rules-page__title">
            Completion Rules — Version {config.rulesVersion}
          </h1>
        </div>

        <div className="completion-rules-page__content">
          <div className="completion-rules-page__meta-card">
            <h2 className="completion-rules-page__meta-title">Version Details</h2>
            <dl className="completion-rules-page__meta-list">
              <dt>Version:</dt>
              <dd>{config.rulesVersion}</dd>
              <dt>Schema Version:</dt>
              <dd>{config.schemaVersion}</dd>
              <dt>Last Updated:</dt>
              <dd>{new Date(config.updatedAt).toLocaleString()}</dd>
              <dt>Updated By:</dt>
              <dd>{config.updatedBy}</dd>
              <dt>Export Threshold:</dt>
              <dd>{config.exportUnlockThresholdPct}%</dd>
              <dt>Total Segments:</dt>
              <dd>{config.segments.length}</dd>
            </dl>
          </div>

          <div className="completion-rules-page__segments-card">
            <h2 className="completion-rules-page__segments-title">Segments</h2>
            <table className="completion-rules-page__segments-table">
              <thead>
                <tr>
                  <th>Segment ID</th>
                  <th>Name</th>
                  <th>Weight</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {config.segments.map((segment) => (
                  <tr key={segment.id}>
                    <td><code>{segment.id}</code></td>
                    <td>{segment.name}</td>
                    <td>{segment.weightPct}%</td>
                    <td>
                      <span
                        className={`status-badge ${
                          segment.enabled ? 'status-badge--enabled' : 'status-badge--disabled'
                        }`}
                      >
                        {segment.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="completion-rules-page__readonly-notice">
            <span className="completion-rules-page__readonly-icon" aria-hidden="true">
              🔒
            </span>
            <span>
              This is a read-only view. Completion rules are managed via configuration files.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Versions list view
  return (
    <div className="completion-rules-page">
      <div className="completion-rules-page__header">
        <h1 className="completion-rules-page__title">Completion Rules Versions</h1>
        <p className="completion-rules-page__subtitle">
          View completion rules history and configuration details
        </p>
      </div>

      <div className="completion-rules-page__content">
        {versions.length === 0 ? (
          <div className="completion-rules-page__empty" role="status">
            <p>No versions found</p>
          </div>
        ) : (
          <table
            className="completion-rules-page__versions-table"
            role="table"
            aria-label="Completion rules versions table"
          >
            <thead>
              <tr>
                <th scope="col">Version</th>
                <th scope="col">Timestamp</th>
                <th scope="col">Author</th>
                <th scope="col">Segments</th>
                <th scope="col">Threshold</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => (
                <tr
                  key={version.rulesVersion}
                  className="completion-rules-page__version-row"
                  tabIndex={0}
                  onClick={() => handleVersionClick(version.rulesVersion)}
                  onKeyDown={(e) => handleKeyDown(e, version.rulesVersion)}
                  role="row"
                  aria-label={`Version ${version.rulesVersion}, click to view details`}
                >
                  <td data-label="Version">
                    <strong>{version.rulesVersion}</strong>
                  </td>
                  <td data-label="Timestamp">
                    {new Date(version.updatedAt).toLocaleString()}
                  </td>
                  <td data-label="Author">{version.updatedBy}</td>
                  <td data-label="Segments">{version.segmentCount}</td>
                  <td data-label="Threshold">{version.exportUnlockThresholdPct}%</td>
                  <td data-label="Actions">
                    <button
                      type="button"
                      className="completion-rules-page__view-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadVersion(version.rulesVersion);
                      }}
                      aria-label={`View version ${version.rulesVersion} details`}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default CompletionRulesPage;
