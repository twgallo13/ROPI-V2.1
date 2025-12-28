/**
 * Import Mapping Step Component
 * Step 2: Map CSV headers to normalized fields
 * 
 * LP-importer-mapping-recon-1.2.0: Registry-driven mapping options & autosuggest
 * - Fetches attribute options from registry API
 * - Falls back to SDK DEFAULT_COLUMN_MAPPINGS on fetch failure
 * - Autosuggest scoring for CSV header matching
 * - Shows reference_only and taxonomy indicators
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_COLUMN_MAPPINGS } from '@ropi-aoss/sdk';
import { listAttributes, buildImporterColumns, Attribute } from '../../services/attributesService';
import MappingOptionLabel, { FIELD_TOOLTIPS } from './MappingOptionLabel';
import './ImportMappingStep.css';

interface ImportMappingStepProps {
  headers: string[];
  onMappingComplete: (mappings: ColumnMappingConfig) => void;
  onBack: () => void;
}

interface ColumnMappingConfig {
  [sourceColumn: string]: string; // Maps CSV column to normalized field
}

/**
 * AttributeOption: Internal representation of a mapping target field
 * LP-1.2.0: Registry-driven structure with autosuggest support
 * LP-1.0.0: Dedupe logic is now in buildFallbackOptions() and buildRegistryOptions()
 */
type AttributeOption = {
  value: string;           // attribute_id (used as select value)
  attributeId: string;     // attribute_id
  friendlyLabel: string;   // label + optional hints
  importerColumns: string[]; // CSV header aliases for autosuggest
  usage?: string;          // 'reference_only' etc.
  data_type?: string;
  required: boolean;
  allowed_values?: string[];
};

/**
 * Build fallback options from SDK DEFAULT_COLUMN_MAPPINGS
 * LP-1.2.0: Used when registry fetch fails
 */
function buildFallbackOptions(): AttributeOption[] {
  const uniqueMap = new Map<string, AttributeOption>();
  
  for (const m of DEFAULT_COLUMN_MAPPINGS) {
    const key = (m as any).targetField;
    if (!uniqueMap.has(key)) {
      const sourceColumns = Array.isArray((m as any).sourceColumn) 
        ? (m as any).sourceColumn.map(String) 
        : [String((m as any).sourceColumn)];
      
      uniqueMap.set(key, {
        value: key,
        attributeId: key,
        friendlyLabel: key,
        importerColumns: sourceColumns,
        usage: undefined,
        required: !!(m as any).required,
      });
    } else if ((m as any).required) {
      uniqueMap.get(key)!.required = true;
    }
  }
  
  return Array.from(uniqueMap.values()).sort((a, b) => {
    // Sort: required first, then alphabetically
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.friendlyLabel.localeCompare(b.friendlyLabel);
  });
}

/**
 * Build options from registry attributes
 * LP-1.2.0: Registry-driven options with rich metadata
 */
function buildRegistryOptions(attrs: Attribute[]): AttributeOption[] {
  const options = attrs.map(a => {
    const hint = a.usage === 'reference_only' ? ' (reference_only)' : '';
    const friendlyLabel = `${a.label}${hint}`;
    
    return {
      value: a.attribute_id,
      attributeId: a.attribute_id,
      friendlyLabel,
      importerColumns: buildImporterColumns(a),
      usage: a.usage,
      data_type: a.data_type,
      // Importer-required should only reflect import_required (not required_for_completion)
      // required_for_completion is a business/completion rule and must not block imports
      required: !!a.import_required,
      allowed_values: a.allowed_values,
    } as AttributeOption;
  });

  // Deduplicate by attribute_id (shouldn't be needed from clean registry, but defensive)
  const unique = new Map<string, AttributeOption>();
  for (const o of options) {
    if (!unique.has(o.value)) {
      unique.set(o.value, o);
    } else if (o.required) {
      // Preserve required=true if any definition requires it
      unique.get(o.value)!.required = true;
    }
  }
  
  // Sort: required first, non-reference_only first, then alphabetically
  return Array.from(unique.values()).sort((a, b) => {
    if (a.required !== b.required) return a.required ? -1 : 1;
    // Prefer non-reference_only first
    if ((a.usage === 'reference_only') !== (b.usage === 'reference_only')) {
      return a.usage === 'reference_only' ? 1 : -1;
    }
    return a.friendlyLabel.localeCompare(b.friendlyLabel);
  });
}

export function ImportMappingStep({ headers, onMappingComplete, onBack }: ImportMappingStepProps) {
  const [mappings, setMappings] = useState<ColumnMappingConfig>({});
  const [missingRequired, setMissingRequired] = useState<string[]>([]);
  
  // LP-1.2.0: Registry-driven field options
  const [fieldOptions, setFieldOptions] = useState<AttributeOption[]>([]);
  const [loadingAttrs, setLoadingAttrs] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // LP-1.2.0: Load attributes from registry on mount
  useEffect(() => {
    let mounted = true;
    
    async function loadAttributes() {
      try {
        const attrs = await listAttributes();
        if (!mounted) return;
        
        const options = buildRegistryOptions(attrs);
        setFieldOptions(options);
        setFetchError(null);
      } catch (err: any) {
        console.error('Failed to fetch attributes from registry:', err);
        if (!mounted) return;
        
        setFetchError(String(err?.message ?? err));
        // Fallback to SDK mappings
        const fallbackOptions = buildFallbackOptions();
        setFieldOptions(fallbackOptions);
      } finally {
        if (mounted) setLoadingAttrs(false);
      }
    }
    
    loadAttributes();
    return () => { mounted = false; };
  }, []);

  /**
   * LP-1.2.0: Autosuggest scoring algorithm
   * Returns top 3 suggestions for a given CSV header
   * 
   * Priority scoring:
   * - Score 3: Exact importerColumns match (case-insensitive)
   * - Score 2: Exact label or attributeId match
   * - Score 1: Substring match on importerColumns/label
   * - +0.1 boost for required attributes
   * - -0.05 penalty for reference_only
   */
  const suggestOptionsForHeader = useCallback((header: string): AttributeOption[] => {
    if (!header || fieldOptions.length === 0) return [];
    const h = header.trim().toLowerCase();

    const scored = fieldOptions.map(opt => {
      let score = 0;
      
      // Priority 1: Exact importerColumns match
      if (opt.importerColumns.some(ic => ic.toLowerCase() === h)) {
        score = 3;
      }
      // Priority 2: Exact label or attributeId match
      else if (opt.friendlyLabel.toLowerCase() === h || opt.attributeId.toLowerCase() === h) {
        score = 2;
      }
      // Priority 3: Substring match on importerColumns
      else if (opt.importerColumns.some(ic => ic.toLowerCase().includes(h))) {
        score = Math.max(score, 1);
      }
      // Priority 3: Substring match on label (first word)
      else if (opt.friendlyLabel.toLowerCase().includes(h.split(' ')[0])) {
        score = Math.max(score, 1);
      }
      
      // Boost for required
      if (opt.required) score += 0.1;
      // Penalty for reference_only
      if (opt.usage === 'reference_only') score -= 0.05;
      
      return { opt, score };
    });

    // Filter to options with positive score, sort by score desc then alphabetically
    const filtered = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score || a.opt.friendlyLabel.localeCompare(b.opt.friendlyLabel));
    
    const suggestions = filtered.slice(0, 3).map(f => f.opt);
    
    // Fallback: check DEFAULT_COLUMN_MAPPINGS aliases if no suggestions
    if (suggestions.length === 0) {
      for (const m of DEFAULT_COLUMN_MAPPINGS) {
        const srcs = Array.isArray((m as any).sourceColumn) 
          ? (m as any).sourceColumn 
          : [(m as any).sourceColumn];
        if (srcs.some((s: string) => s.toLowerCase() === h)) {
          const key = (m as any).targetField;
          const existing = fieldOptions.find(f => f.value === key);
          if (existing) return [existing];
          // Create temporary option from SDK mapping
          return [{
            value: key,
            attributeId: key,
            friendlyLabel: key,
            importerColumns: srcs.map(String),
            required: !!(m as any).required
          }];
        }
      }
    }
    
    return suggestions;
  }, [fieldOptions]);

  // Build FIELD_OPTIONS for the select dropdown
  const selectOptions = useMemo(() => {
    return [
      { value: '', attributeId: '', friendlyLabel: '(Unmapped)', importerColumns: [], required: false } as AttributeOption,
      ...fieldOptions,
    ];
  }, [fieldOptions]);

  // Auto-suggest mappings on mount/when options load — safer approach
  // LP-1.3.1: Only auto-assign exact importerColumns matches, enforce uniqueness
  useEffect(() => {
    if (loadingAttrs || fieldOptions.length === 0) return;

    const suggestedMappings: ColumnMappingConfig = {};
    const usedTargets = new Set<string>();

    headers.forEach(header => {
      const h = header.trim().toLowerCase();
      // Compute suggestions (same helper)
      const suggestions = suggestOptionsForHeader(header);
      // Only auto-assign if there's an exact importerColumns match (score 3)
      const exact = suggestions.find(s =>
        s.importerColumns.some(ic => ic.toLowerCase() === h)
      );
      const candidate = exact ?? null;

      if (candidate && !usedTargets.has(candidate.value)) {
        suggestedMappings[header] = candidate.value;
        usedTargets.add(candidate.value);
      }
      // Otherwise leave unmapped — show suggestion hint only
    });

    setMappings(suggestedMappings);
  }, [headers, fieldOptions, loadingAttrs, suggestOptionsForHeader]);

  // Check for missing required fields
  useEffect(() => {
    const mappedFields = Object.values(mappings).filter(Boolean);
    const required = fieldOptions
      .filter(opt => opt.required)
      .map(opt => opt.value);
    
    const missing = required.filter(field => !mappedFields.includes(field));
    setMissingRequired(missing);
  }, [mappings, fieldOptions]);

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setMappings(prev => ({
      ...prev,
      [sourceColumn]: targetField,
    }));
  };

  const handleContinue = () => {
    if (missingRequired.length > 0) {
      alert(`Missing required fields: ${missingRequired.join(', ')}`);
      return;
    }

    onMappingComplete(mappings);
  };

  const isFieldMapped = (targetField: string): boolean => {
    return Object.values(mappings).includes(targetField);
  };

  const getOption = (value: string): AttributeOption | undefined => {
    return fieldOptions.find(opt => opt.value === value);
  };

  // Render loading state
  if (loadingAttrs) {
    return (
      <div className="import-mapping-step">
        <h2>Map CSV Columns</h2>
        <div className="loading-message">Loading mapping options from registry…</div>
      </div>
    );
  }

  return (
    <div className="import-mapping-step">
      <h2>Map CSV Columns</h2>
      <p className="step-description">
        Map your CSV columns to normalized product fields. Suggested mappings have been auto-detected.
      </p>

      {/* LP-1.2.0: Show registry fetch error with fallback notice */}
      {fetchError && (
        <div className="mapping-info" style={{ color: 'orange', marginBottom: '1rem' }}>
          ⚠️ Registry fetch failed, using SDK fallback mappings. ({fetchError})
        </div>
      )}

      {missingRequired.length > 0 && (
        <div className="mapping-warning">
          ⚠️ Missing required fields: <strong>{missingRequired.join(', ')}</strong>
        </div>
      )}

      <div className="mapping-table-wrapper">
        <table className="mapping-table">
          <thead>
            <tr>
              <th>CSV Column</th>
              <th>Maps To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {headers.map(header => {
              const currentMapping = mappings[header] || '';
              const isMapped = !!currentMapping;
              const currentOption = getOption(currentMapping);
              const isReq = currentOption?.required || false;
              const suggestions = suggestOptionsForHeader(header);

              return (
                <tr key={header}>
                  <td className="csv-column">
                    <code>{header}</code>
                    {/* LP-1.2.0: Show top suggestion if not already mapped */}
                    {!isMapped && suggestions.length > 0 && (
                      <div className="suggestion-hint" style={{ fontSize: 11, color: '#666' }}>
                        Suggested: {suggestions[0].friendlyLabel}
                      </div>
                    )}
                  </td>
                  <td className="target-field">
                    <select
                      value={currentMapping}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="field-select"
                      title={currentMapping ? FIELD_TOOLTIPS[currentMapping] : undefined}
                    >
                      {selectOptions.map(option => {
                        const alreadyMapped = option.value && isFieldMapped(option.value) && currentMapping !== option.value;
                        const isRefOnly = option.usage === 'reference_only';
                        
                        return (
                          <option
                            key={option.value}
                            value={option.value}
                            disabled={!!alreadyMapped}
                          >
                            {option.attributeId || '(Unmapped)'}
                            {option.friendlyLabel && option.friendlyLabel !== option.attributeId && option.friendlyLabel !== '(Unmapped)' && ` — ${option.friendlyLabel.replace(` (reference_only)`, '')}`}
                            {option.required && ' (required)'}
                            {isRefOnly && ' (reference only)'}
                            {alreadyMapped && ' (already mapped)'}
                          </option>
                        );
                      })}
                    </select>
                    {/* LP-1.2.0: Show rich option label for mapped fields */}
                    {isMapped && currentOption && (
                      <div className="mapped-field-info" style={{ marginTop: 4 }}>
                        <MappingOptionLabel
                          attributeId={currentOption.attributeId}
                          label={currentOption.friendlyLabel.replace(' (reference_only)', '')}
                          usage={currentOption.usage}
                          allowedValues={currentOption.allowed_values}
                          tooltip={FIELD_TOOLTIPS[currentOption.value]}
                        />
                      </div>
                    )}
                  </td>
                  <td className="mapping-status">
                    {isMapped ? (
                      <span className={`status-badge ${isReq ? 'required' : 'mapped'}`}>
                        {isReq ? 'Required ✓' : 'Mapped ✓'}
                      </span>
                    ) : (
                      <span className="status-badge unmapped">Unmapped</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* LP-1.2.0: Field options preview for testing */}
      <div data-testid="import-field-options" style={{ display: 'none' }}>
        {fieldOptions.slice(0, 20).map(opt => (
          <div key={opt.value} data-testid={`field-option-${opt.value}`}>
            {opt.friendlyLabel}
          </div>
        ))}
      </div>

      <div className="mapping-summary">
        <div className="summary-item">
          <strong>Total Columns:</strong> {headers.length}
        </div>
        <div className="summary-item">
          <strong>Mapped:</strong> {Object.values(mappings).filter(Boolean).length}
        </div>
        <div className="summary-item">
          <strong>Unmapped:</strong> {headers.length - Object.values(mappings).filter(Boolean).length}
        </div>
        <div className="summary-item">
          <strong>Required Fields Missing:</strong>{' '}
          <span className={missingRequired.length > 0 ? 'text-error' : 'text-success'}>
            {missingRequired.length}
          </span>
        </div>
      </div>

      <div className="mapping-actions">
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Upload
        </button>
        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={missingRequired.length > 0}
        >
          Continue to Preview →
        </button>
      </div>
    </div>
  );
}
