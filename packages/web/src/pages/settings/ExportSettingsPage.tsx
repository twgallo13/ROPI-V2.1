/**
 * Export Settings Page — Completion Rules Editor
 * 
 * Allows operators to configure completion rules that drive export gate behavior.
 * All changes directly affect export blocking outcomes.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import {
  fetchCompletionRules,
  saveCompletionRules,
  type CompletionRulesConfig,
  type SegmentConfig,
} from '@/services/completionRulesClient';
import './ExportSettingsPage.css';

/**
 * Component for editing a single segment
 */
interface SegmentEditorProps {
  segment: SegmentConfig;
  onChange: (segment: SegmentConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  allSites: string[];
}

function SegmentEditor({
  segment,
  onChange,
  onRemove,
  canRemove,
  allSites,
}: SegmentEditorProps) {
  return (
    <div className="segment-card">
      <div className="segment-header">
        <div>
          <h4 className="segment-name">{segment.name}</h4>
          <div className="segment-id">ID: {segment.id}</div>
        </div>
        <div className="segment-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={segment.enabled}
              onChange={(e) =>
                onChange({ ...segment, enabled: e.target.checked })
              }
            />
            Enabled
          </label>
          {canRemove && (
            <button
              className="btn btn-danger-text"
              onClick={onRemove}
              title="Remove segment"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {segment.enabled && (
        <>
          {/* Weight */}
          <div className="form-row">
            <label>Weight (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={segment.weightPct || 0}
              onChange={(e) =>
                onChange({
                  ...segment,
                  weightPct: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)),
                })
              }
              className="form-input"
            />
            <div className="hint">
              Total of all enabled segments must equal 100%
            </div>
          </div>

          {/* Rule Type */}
          <div className="form-row">
            <label>Rule Type</label>
            <select
              value={segment.ruleType}
              onChange={(e) =>
                onChange({
                  ...segment,
                  ruleType: e.target.value as 'ALL_REQUIRED' | 'ANY_REQUIRED',
                })
              }
              className="form-input"
            >
              <option value="ALL_REQUIRED">All attributes required</option>
              <option value="ANY_REQUIRED">Any attribute required</option>
            </select>
            <div className="hint">
              ALL_REQUIRED: Product must have all selected attributes
              <br />
              ANY_REQUIRED: Product must have at least one selected attribute
            </div>
          </div>

          {/* Selected Sites */}
          <div className="form-row">
            <label>Sites (where this requirement applies)</label>
            <div className="sites-list">
              {allSites.map((site) => (
                <label key={site} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={(segment.appliesTo?.sites || []).includes(site)}
                    onChange={(e) => {
                      const sites = segment.appliesTo?.sites || [];
                      const newSites = e.target.checked
                        ? [...sites, site]
                        : sites.filter((s) => s !== site);
                      onChange({
                        ...segment,
                        appliesTo: {
                          ...segment.appliesTo,
                          sites: newSites,
                        },
                      });
                    }}
                  />
                  {site}
                </label>
              ))}
            </div>
            {(!segment.appliesTo?.sites || segment.appliesTo.sites.length === 0) && (
              <div className="warning-text">
                ⚠️ No sites selected: This requirement will not block any products
              </div>
            )}
            <div className="hint">
              When a site is selected, the Description and SEO attributes required
              for that site will block completion if missing
            </div>
          </div>

          {/* Attribute Source */}
          <div className="form-row">
            <label>Attribute Source</label>
            <select
              value={segment.attributeSelector?.source || 'REGISTRY'}
              onChange={(e) =>
                onChange({
                  ...segment,
                  attributeSelector: {
                    ...segment.attributeSelector,
                    source: e.target.value as 'REGISTRY' | 'STATIC',
                  },
                })
              }
              className="form-input"
            >
              <option value="REGISTRY">From Attribute Registry</option>
              <option value="STATIC">Static list</option>
            </select>
            <div className="hint">
              REGISTRY: Attributes marked as "required_for_completion" in the registry
              <br />
              STATIC: Fixed list of attribute IDs
            </div>
          </div>

          {/* Site-Aware Requirement */}
          <div className="form-row">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={segment.attributeSelector?.siteAware || false}
                onChange={(e) =>
                  onChange({
                    ...segment,
                    attributeSelector: {
                      ...segment.attributeSelector,
                      siteAware: e.target.checked,
                    },
                  })
                }
              />
              Site-Aware Requirement
            </label>
            <div className="hint">
              When enabled, attributes required for this segment may vary by site
              (e.g., Description text content must be in the product's language for that site)
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Main Export Settings Page
 */
export default function ExportSettingsPage() {
  const navigate = useNavigate();
  const [rules, setRules] = useState<CompletionRulesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Sample sites (in real app, fetch from registry)
  const allSites = ['shiekh', 'karmaloop', 'mltd', 'sangremia'];

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompletionRules();
      if (!data) {
        setError('No completion rules configured in Firestore');
        return;
      }
      setRules(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rules';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function validateRules(config: CompletionRulesConfig): string[] {
    const errors: string[] = [];

    const enabledSegments = config.segments.filter((s) => s.enabled);
    if (enabledSegments.length === 0) {
      errors.push('At least one segment must be enabled');
    } else {
      const totalWeight = enabledSegments.reduce((sum, s) => sum + (s.weightPct || 0), 0);
      if (Math.abs(totalWeight - 100) > 0.1) {
        errors.push(
          `Enabled segment weights must sum to 100% (currently ${totalWeight.toFixed(1)}%)`
        );
      }
    }

    if (config.exportUnlockThresholdPct < 0 || config.exportUnlockThresholdPct > 100) {
      errors.push('Threshold must be between 0 and 100');
    }

    for (const segment of config.segments) {
      if (segment.enabled && (!segment.appliesTo?.sites || segment.appliesTo.sites.length === 0)) {
        errors.push(`Segment "${segment.name}" is enabled but no sites selected`);
      }
    }

    return errors;
  }

  async function handleSave() {
    if (!rules) return;

    const errors = validateRules(rules);
    setValidationErrors(errors);

    if (errors.length > 0) {
      setError('Fix validation errors before saving');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await saveCompletionRules(rules);
      setSuccess('Completion rules saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save rules';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function updateSegment(index: number, segment: SegmentConfig) {
    if (!rules) return;
    const newSegments = [...rules.segments];
    newSegments[index] = segment;
    setRules({ ...rules, segments: newSegments });
    setValidationErrors([]); // Clear validation on edit
  }

  function removeSegment(index: number) {
    if (!rules) return;
    const newSegments = rules.segments.filter((_, i) => i !== index);
    setRules({ ...rules, segments: newSegments });
  }

  if (loading) {
    return (
      <PageLayout title="Export Settings">
        <div className="loading">Loading completion rules...</div>
      </PageLayout>
    );
  }

  if (!rules) {
    return (
      <PageLayout title="Export Settings">
        <div className="error-container">
          <div className="error-message">{error || 'No completion rules found'}</div>
          <button className="btn btn-primary" onClick={loadRules}>
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Export Settings">
      <div className="export-settings-container">
        {/* Header */}
        <div className="settings-header">
          <h1>Completion Rules Configuration</h1>
          <p className="subtitle">
            Configure the completion rules that control export gate behavior. Changes here
            directly affect whether products can be exported.
          </p>
        </div>

        {/* Governance Notice */}
        <div className="governance-notice">
          <strong>⚠️ This affects export blocking</strong>
          <p>
            Completion is the <strong>single canonical gate</strong> to export. The rules you
            configure here determine which products are blocked from export. Changes take
            effect immediately.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="alert alert-warning">
            <strong>Validation errors:</strong>
            <ul>
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Export Unlock Threshold */}
        <div className="settings-section">
          <h2>Export Unlock Threshold</h2>
          <div className="form-row">
            <label htmlFor="threshold">Minimum Completion %</label>
            <div className="threshold-input-group">
              <input
                id="threshold"
                type="number"
                min="0"
                max="100"
                value={rules.exportUnlockThresholdPct}
                onChange={(e) => {
                  const val = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                  setRules({ ...rules, exportUnlockThresholdPct: val });
                  setValidationErrors([]);
                }}
                className="form-input threshold-input"
              />
              <span className="input-suffix">%</span>
            </div>
            <div className="hint">
              Products with overall completion below this percentage will be blocked from export.
              This is checked after all site-aware blocking is evaluated.
            </div>
          </div>
        </div>

        {/* Segments */}
        <div className="settings-section">
          <h2>Completion Segments</h2>
          <p className="section-description">
            Each segment represents a category of required attributes. Weights determine how
            much each segment contributes to overall completion percentage.
          </p>

          <div className="segments-list">
            {rules.segments.map((segment, index) => (
              <SegmentEditor
                key={segment.id}
                segment={segment}
                onChange={(updated) => updateSegment(index, updated)}
                onRemove={() => removeSegment(index)}
                canRemove={rules.segments.length > 1}
                allSites={allSites}
              />
            ))}
          </div>

          {/* Weight Summary */}
          <div className="weight-summary">
            <h4>Weight Distribution</h4>
            {rules.segments.map((segment) => (
              <div key={segment.id} className="weight-bar-row">
                <span className="weight-label">
                  {segment.name} {!segment.enabled && '(disabled)'}
                </span>
                <div className="weight-bar-container">
                  <div
                    className={`weight-bar ${!segment.enabled ? 'disabled' : ''}`}
                    style={{ width: `${segment.weightPct || 0}%` }}
                  >
                    {segment.weightPct > 5 && <span>{segment.weightPct}%</span>}
                  </div>
                </div>
              </div>
            ))}
            <div className="weight-total">
              Total (enabled):{' '}
              <strong>
                {rules.segments
                  .filter((s) => s.enabled)
                  .reduce((sum, s) => sum + (s.weightPct || 0), 0)
                  .toFixed(1)}
                %
              </strong>
            </div>
          </div>
        </div>

        {/* Exclusions Notice */}
        <div className="settings-section">
          <h2>Exclusions</h2>
          <p className="section-description">
            The following attribute categories are <strong>excluded by governance</strong> and
            will never block export:
          </p>
          <div className="exclusions-grid">
            <div className="exclusion-card">
              <h4>Media</h4>
              <p className="reason">{rules.exclusions.media.reason}</p>
              <p className="status">
                {rules.exclusions.media.affectsCompletion
                  ? '❌ Affects completion'
                  : '✅ Does NOT affect completion'}
              </p>
            </div>
            <div className="exclusion-card">
              <h4>Pricing</h4>
              <p className="reason">{rules.exclusions.pricing.reason}</p>
              <p className="status">
                {rules.exclusions.pricing.affectsCompletion
                  ? '❌ Affects completion'
                  : '✅ Does NOT affect completion'}
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Info */}
        <div className="settings-section">
          <h2>Configuration Info</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Schema Version</span>
              <span className="value">{rules.schemaVersion}</span>
            </div>
            <div className="info-item">
              <span className="label">Rules Version</span>
              <span className="value">{rules.rulesVersion}</span>
            </div>
            <div className="info-item">
              <span className="label">Last Updated</span>
              <span className="value">{new Date(rules.updatedAt).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <span className="label">Updated By</span>
              <span className="value">{rules.updatedBy}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || validationErrors.length > 0}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
            Back to Settings
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
