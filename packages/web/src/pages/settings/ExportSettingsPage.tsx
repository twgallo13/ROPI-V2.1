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

function normalizeRules(config: CompletionRulesConfig): CompletionRulesConfig {
  return {
    ...config,
    segments: config.segments.map((segment) => ({
      ...segment,
      appliesTo: {
        mode: segment.appliesTo?.mode || 'ALL_PRODUCTS',
        sites: segment.appliesTo?.sites || [],
      },
      attributeSelector: {
        source: segment.attributeSelector?.source || 'REGISTRY',
        categories: segment.attributeSelector?.categories || [],
        requirementFlag: segment.attributeSelector?.requirementFlag || '',
        siteAware: Boolean(segment.attributeSelector?.siteAware),
        includeInternalOnly: Boolean(segment.attributeSelector?.includeInternalOnly),
        excludeAttributeIds: segment.attributeSelector?.excludeAttributeIds || [],
        staticAttributeIds: segment.attributeSelector?.staticAttributeIds || [],
      },
    })),
  };
}

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function formatCsv(list?: string[]): string {
  return (list || []).join(', ');
}

/**
 * Component for editing a single segment
 */
interface SegmentEditorProps {
  segment: SegmentConfig;
  onChange: (segment: SegmentConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  allSites: string[];
  segmentIndex: number;
  customLabel?: string;
  onLabelChange: (label: string) => void;
}

function SegmentEditor({
  segment,
  onChange,
  onRemove,
  canRemove,
  allSites,
  segmentIndex,
  customLabel,
  onLabelChange,
}: SegmentEditorProps) {
  const appliesToMode = segment.appliesTo?.mode || 'ALL_PRODUCTS';
  const appliesToSites = segment.appliesTo?.sites || [];
  const attributeSelector = segment.attributeSelector || {
    source: 'REGISTRY' as const,
    categories: [],
    requirementFlag: '',
    siteAware: false,
    includeInternalOnly: false,
    excludeAttributeIds: [],
    staticAttributeIds: [],
  };

  const weightInputId = `weight-${segment.id}`;
  const ruleTypeId = `rule-type-${segment.id}`;
  const appliesModeId = `applies-mode-${segment.id}`;
  const attributeSourceId = `attribute-source-${segment.id}`;
  const categoriesId = `categories-${segment.id}`;
  const requirementFlagId = `requirement-flag-${segment.id}`;
  const includeInternalOnlyId = `include-internal-only-${segment.id}`;
  const excludeAttributesId = `exclude-attributes-${segment.id}`;
  const staticAttributesId = `static-attributes-${segment.id}`;
  const siteAwareId = `site-aware-${segment.id}`;

  return (
    <div className="segment-card">
      <div className="segment-header">
        <div className="segment-name-container">
          <input
            type="text"
            className="segment-label-input"
            value={customLabel || ''}
            placeholder={`Segment ${segmentIndex + 1}`}
            onChange={(e) => onLabelChange(e.target.value)}
            title="Custom label for this segment"
          />
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

      {/* Weight */}
      <div className="form-row">
        <label htmlFor={weightInputId}>Weight (%)</label>
        <input
          id={weightInputId}
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
        <div className="hint">Total of all enabled segments must equal 100%</div>
      </div>

      {/* Rule Type */}
      <div className="form-row">
        <label htmlFor={ruleTypeId}>Rule Type</label>
        <select
          id={ruleTypeId}
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

      {/* Applies To Mode */}
      <div className="form-row">
        <label htmlFor={appliesModeId}>Applies To Mode</label>
        <select
          id={appliesModeId}
          value={appliesToMode}
          onChange={(e) => {
            const mode = e.target.value as 'ALL_PRODUCTS' | 'CONDITIONAL';
            onChange({
              ...segment,
              appliesTo: {
                mode,
                sites: mode === 'ALL_PRODUCTS' ? [] : appliesToSites,
              },
            });
          }}
          className="form-input"
        >
          <option value="ALL_PRODUCTS">All products</option>
          <option value="CONDITIONAL">Only selected sites</option>
        </select>
      </div>

      {/* Selected Sites (conditional) */}
      {appliesToMode === 'CONDITIONAL' && (
        <div className="form-row">
          <label>Sites (where this requirement applies)</label>
          <div className="sites-list">
            {allSites.map((site) => (
              <label key={site} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={appliesToSites.includes(site)}
                  onChange={(e) => {
                    const sites = appliesToSites || [];
                    const newSites = e.target.checked
                      ? [...sites, site]
                      : sites.filter((s) => s !== site);
                    onChange({
                      ...segment,
                      appliesTo: {
                        mode: appliesToMode,
                        sites: newSites,
                      },
                    });
                  }}
                />
                {site}
              </label>
            ))}
          </div>
          {appliesToSites.length === 0 && segment.enabled && (
            <div className="warning-text">
              ⚠️ No sites selected: This requirement will not block any products
            </div>
          )}
          <div className="hint">
            Sites are required when Applies To is set to Conditional.
          </div>
        </div>
      )}

      {/* Attribute Source */}
      <div className="form-row">
        <label htmlFor={attributeSourceId}>Attribute Source</label>
        <select
          id={attributeSourceId}
          value={attributeSelector.source || 'REGISTRY'}
          onChange={(e) =>
            onChange({
              ...segment,
              attributeSelector: {
                ...attributeSelector,
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
          REGISTRY: Attributes marked with the requirement flag (e.g. required_for_completion)
          <br />
          STATIC: Fixed list of attribute IDs
        </div>
      </div>

      {/* Registry attribute selector fields */}
      {attributeSelector.source === 'REGISTRY' && (
        <>
          <div className="form-row">
            <label htmlFor={categoriesId}>Categories</label>
            <input
              id={categoriesId}
              type="text"
              value={formatCsv(attributeSelector.categories)}
              onChange={(e) =>
                onChange({
                  ...segment,
                  attributeSelector: {
                    ...attributeSelector,
                    categories: parseCsv(e.target.value),
                  },
                })
              }
              className="form-input"
              placeholder="description, seo"
            />
            <div className="hint">Comma-separated registry categories</div>
          </div>

          <div className="form-row">
            <label htmlFor={requirementFlagId}>Requirement Flag</label>
            <input
              id={requirementFlagId}
              type="text"
              value={attributeSelector.requirementFlag || ''}
              onChange={(e) =>
                onChange({
                  ...segment,
                  attributeSelector: {
                    ...attributeSelector,
                    requirementFlag: e.target.value,
                  },
                })
              }
              className="form-input"
              placeholder="required_for_completion"
            />
            <div className="hint">Registry flag used to select required attributes</div>
          </div>

          <div className="form-row">
            <label className="toggle-label" htmlFor={includeInternalOnlyId}>
              <input
                id={includeInternalOnlyId}
                type="checkbox"
                checked={attributeSelector.includeInternalOnly || false}
                onChange={(e) =>
                  onChange({
                    ...segment,
                    attributeSelector: {
                      ...attributeSelector,
                      includeInternalOnly: e.target.checked,
                    },
                  })
                }
              />
              Include Internal Only Attributes
            </label>
          </div>
        </>
      )}

      {/* Static attribute selector fields */}
      {attributeSelector.source === 'STATIC' && (
        <div className="form-row">
          <label htmlFor={staticAttributesId}>Static Attribute IDs</label>
          <input
            id={staticAttributesId}
            type="text"
            value={formatCsv(attributeSelector.staticAttributeIds)}
            onChange={(e) =>
              onChange({
                ...segment,
                attributeSelector: {
                  ...attributeSelector,
                  staticAttributeIds: parseCsv(e.target.value),
                },
              })
            }
            className="form-input"
            placeholder="attr.title, attr.bullet_points"
          />
          <div className="hint">Comma-separated attribute IDs</div>
        </div>
      )}

      {/* Common attribute selector options */}
      <div className="form-row">
        <label className="toggle-label" htmlFor={siteAwareId}>
          <input
            id={siteAwareId}
            type="checkbox"
            checked={attributeSelector.siteAware || false}
            onChange={(e) =>
              onChange({
                ...segment,
                attributeSelector: {
                  ...attributeSelector,
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

      <div className="form-row">
        <label htmlFor={excludeAttributesId}>Exclude Attribute IDs</label>
        <input
          id={excludeAttributesId}
          type="text"
          value={formatCsv(attributeSelector.excludeAttributeIds)}
          onChange={(e) =>
            onChange({
              ...segment,
              attributeSelector: {
                ...attributeSelector,
                excludeAttributeIds: parseCsv(e.target.value),
              },
            })
          }
          className="form-input"
          placeholder="attr.internal_notes"
        />
        <div className="hint">Attributes to ignore for this segment (comma-separated)</div>
      </div>
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
  // Custom labels for segments (stored in local state, not persisted to backend)
  const [customLabels, setCustomLabels] = useState<Record<string, string>>({});

  // Sample sites (in real app, fetch from registry)
  const allSites = ['shiekh', 'karmaloop', 'mltd', 'sangremia'];

  useEffect(() => {
    loadRules();
  }, []);

  useEffect(() => {
    if (rules) {
      setValidationErrors(validateRules(rules));
    } else {
      setValidationErrors([]);
    }
  }, [rules]);

  async function loadRules() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCompletionRules();
      if (!data) {
        setError('No completion rules configured in Firestore');
        return;
      }
      const normalized = normalizeRules(data);
      setRules(normalized);
      setValidationErrors(validateRules(normalized));
      // Initialize custom labels from segment names
      const labels: Record<string, string> = {};
      normalized.segments.forEach((segment) => {
        if (segment.name && !segment.name.match(/^Segment \d+$/)) {
          // Only set custom label if it's not a default "Segment N" name
          labels[segment.id] = segment.name;
        }
      });
      setCustomLabels(labels);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load rules';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function validateRules(config: CompletionRulesConfig): string[] {
    const errors: string[] = [];

    if (!config.segments || config.segments.length === 0) {
      errors.push('At least one segment is required');
      return errors;
    }

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

    if (
      typeof config.exportUnlockThresholdPct !== 'number' ||
      config.exportUnlockThresholdPct < 0 ||
      config.exportUnlockThresholdPct > 100
    ) {
      errors.push('Threshold must be between 0 and 100');
    }

    for (const segment of config.segments) {
      const segmentLabel = segment.name || segment.id || 'segment';
      const appliesToMode = segment.appliesTo?.mode || 'ALL_PRODUCTS';
      const appliesToSites = segment.appliesTo?.sites || [];
      const selector = segment.attributeSelector;

      if (!segment.id) {
        errors.push(`Segment "${segmentLabel}" must have an id`);
      }

      if (
        typeof segment.weightPct !== 'number' ||
        segment.weightPct < 0 ||
        segment.weightPct > 100
      ) {
        errors.push(`Segment "${segmentLabel}" weight must be between 0 and 100`);
      }

      if (!['ALL_REQUIRED', 'ANY_REQUIRED'].includes(segment.ruleType)) {
        errors.push(`Segment "${segmentLabel}" has invalid rule type`);
      }

      if (!['ALL_PRODUCTS', 'CONDITIONAL'].includes(appliesToMode)) {
        errors.push(`Segment "${segmentLabel}" has invalid appliesTo mode`);
      }

      if (!Array.isArray(appliesToSites)) {
        errors.push(`Segment "${segmentLabel}" sites must be an array`);
      }

      if (segment.enabled && appliesToMode === 'CONDITIONAL' && appliesToSites.length === 0) {
        errors.push(`Segment "${segmentLabel}" is enabled but no sites selected`);
      }

      if (!selector) {
        errors.push(`Segment "${segmentLabel}" is missing attribute selector`);
        continue;
      }

      if (!['REGISTRY', 'STATIC'].includes(selector.source)) {
        errors.push(`Segment "${segmentLabel}" has invalid attribute selector source`);
      }

      if (selector.source === 'REGISTRY') {
        const categories = (selector.categories || []).filter((c) => c && c.trim().length > 0);
        if (categories.length === 0) {
          errors.push(`Segment "${segmentLabel}" requires categories when using REGISTRY source`);
        }
        if (!selector.requirementFlag || selector.requirementFlag.trim().length === 0) {
          errors.push(`Segment "${segmentLabel}" requires a requirement flag when using REGISTRY source`);
        }
      }

      if (selector.source === 'STATIC') {
        const staticIds = selector.staticAttributeIds || [];
        if (staticIds.length === 0) {
          errors.push(`Segment "${segmentLabel}" requires staticAttributeIds when using STATIC source`);
        }
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
      setSuccess(null);
      await saveCompletionRules(rules);
      setSuccess('✓ Configuration saved successfully');
      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Auto-hide success message after 5 seconds
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save rules';
      setError(message);
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  }

  function updateSegment(index: number, segment: SegmentConfig) {
    if (!rules) return;
    const newSegments = [...rules.segments];
    newSegments[index] = segment;
    setRules(normalizeRules({ ...rules, segments: newSegments }));
  }

  function removeSegment(index: number) {
    if (!rules) return;
    const newSegments = rules.segments.filter((_, i) => i !== index);
    setRules(normalizeRules({ ...rules, segments: newSegments }));
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
        {/* Top Action Bar with Save Button and Messages */}
        <div className="top-action-bar">
          <div className="action-bar-content">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || validationErrors.length > 0}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {error && <div className="alert alert-error compact">{error}</div>}
            {success && <div className="alert alert-success compact">{success}</div>}
          </div>
        </div>

        {/* Header */}
        <div className="settings-header">
          <h1>Completion Rules Configuration</h1>
          <p className="subtitle">
            Configure the completion rules that control export gate behavior. Changes here
            directly affect whether products can be exported.
          </p>
        </div>

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
                segmentIndex={index}
                customLabel={customLabels[segment.id]}
                onLabelChange={(label) => {
                  // Update both custom labels state and the actual segment.name field
                  setCustomLabels(prev => ({
                    ...prev,
                    [segment.id]: label
                  }));
                  // Update the segment name in the backend data
                  const newSegments = [...rules.segments];
                  newSegments[index] = {
                    ...segment,
                    name: label || `Segment ${index + 1}`
                  };
                  setRules(normalizeRules({ ...rules, segments: newSegments }));
                }}
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
            {rules.segments.map((segment, idx) => {
              const displayLabel = customLabels[segment.id] || `Segment ${idx + 1}`;
              return (
              <div key={segment.id} className="weight-bar-row">
                <span className="weight-label">
                  {displayLabel} {!segment.enabled && '(disabled)'}
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
            );
            })}
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
          <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
            Back to Settings
          </button>
        </div>
      </div>
    </PageLayout>
  );
}
