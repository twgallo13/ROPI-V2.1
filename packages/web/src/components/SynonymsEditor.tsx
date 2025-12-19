/**
 * SynonymsEditor Component
 * Manages value synonyms for attribute mapping
 * 
 * For enum/multiSelect: Shows allowed values with synonyms
 * For string: Shows synonym mappings
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback, useMemo } from 'react';
import styles from './MappingTab.module.css';

export interface SynonymsEditorProps {
  /** canonical value → [synonyms] mapping */
  synonyms: Record<string, string[]>;
  /** allowed values for enum/multiSelect types */
  allowedValues?: string[];
  /** data type of the attribute */
  dataType: string;
  /** Callback when synonyms change */
  onChange: (synonyms: Record<string, string[]>) => void;
  /** Whether in read-only mode */
  readOnly?: boolean;
  /** Whether saving is in progress */
  saving?: boolean;
}

export default function SynonymsEditor({
  synonyms,
  allowedValues = [],
  dataType,
  onChange,
  readOnly = false,
  saving = false,
}: SynonymsEditorProps) {
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [newSynonym, setNewSynonym] = useState('');
  const [addingValue, setAddingValue] = useState(false);
  const [newCanonicalValue, setNewCanonicalValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isSelectType = dataType === 'enum' || dataType === 'multiSelect';

  // Get all canonical values (from allowed_values or existing synonyms keys)
  const canonicalValues = useMemo(() => {
    if (isSelectType && allowedValues.length > 0) {
      return allowedValues;
    }
    return Object.keys(synonyms).sort();
  }, [isSelectType, allowedValues, synonyms]);

  // Add synonym to a canonical value
  const handleAddSynonym = useCallback((canonicalValue: string, synonym: string) => {
    const trimmed = synonym.trim();
    if (!trimmed) return;

    const current = synonyms[canonicalValue] || [];
    
    // Check for duplicates (case-insensitive)
    if (current.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already a synonym for "${canonicalValue}"`);
      return;
    }

    // Check if synonym already maps to another value
    for (const [val, syns] of Object.entries(synonyms)) {
      if (val !== canonicalValue && syns.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
        setError(`"${trimmed}" is already a synonym for "${val}"`);
        return;
      }
    }

    setError(null);
    onChange({
      ...synonyms,
      [canonicalValue]: [...current, trimmed],
    });
    setNewSynonym('');
  }, [synonyms, onChange]);

  // Remove synonym from a canonical value
  const handleRemoveSynonym = useCallback((canonicalValue: string, synonym: string) => {
    const current = synonyms[canonicalValue] || [];
    const updated = current.filter(s => s !== synonym);
    
    if (updated.length === 0) {
      // Remove the key entirely if no synonyms left
      const { [canonicalValue]: _, ...rest } = synonyms;
      onChange(rest);
    } else {
      onChange({
        ...synonyms,
        [canonicalValue]: updated,
      });
    }
  }, [synonyms, onChange]);

  // Add new canonical value (for string types)
  const handleAddCanonicalValue = useCallback(() => {
    const trimmed = newCanonicalValue.trim();
    if (!trimmed) {
      setError('Canonical value is required');
      return;
    }

    if (synonyms[trimmed]) {
      setError(`"${trimmed}" already exists`);
      return;
    }

    setError(null);
    onChange({
      ...synonyms,
      [trimmed]: [],
    });
    setNewCanonicalValue('');
    setAddingValue(false);
    setEditingValue(trimmed);
  }, [newCanonicalValue, synonyms, onChange]);

  // Parse comma-separated synonyms
  const handleBulkAddSynonyms = useCallback((canonicalValue: string, input: string) => {
    const parts = input.split(',').map(s => s.trim()).filter(Boolean);
    const current = synonyms[canonicalValue] || [];
    const existing = new Set(current.map(s => s.toLowerCase()));
    
    const newSyns = parts.filter(p => !existing.has(p.toLowerCase()));
    if (newSyns.length > 0) {
      onChange({
        ...synonyms,
        [canonicalValue]: [...current, ...newSyns],
      });
    }
    setNewSynonym('');
  }, [synonyms, onChange]);

  // Handle key press in synonym input
  const handleKeyDown = useCallback((e: React.KeyboardEvent, canonicalValue: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newSynonym.includes(',')) {
        handleBulkAddSynonyms(canonicalValue, newSynonym);
      } else {
        handleAddSynonym(canonicalValue, newSynonym);
      }
    } else if (e.key === 'Escape') {
      setEditingValue(null);
      setNewSynonym('');
    }
  }, [newSynonym, handleAddSynonym, handleBulkAddSynonyms]);

  // Test transformation
  const [testInput, setTestInput] = useState('');
  const testResult = useMemo(() => {
    if (!testInput.trim()) return null;
    const normalized = testInput.trim().toLowerCase();
    
    // Check exact canonical match
    for (const canonical of canonicalValues) {
      if (canonical.toLowerCase() === normalized) {
        return { canonical, type: 'exact' as const };
      }
    }
    
    // Check synonyms
    for (const [canonical, syns] of Object.entries(synonyms)) {
      for (const syn of syns) {
        if (syn.toLowerCase() === normalized) {
          return { canonical, type: 'synonym' as const, synonym: syn };
        }
      }
    }
    
    return { canonical: null, type: 'unknown' as const };
  }, [testInput, canonicalValues, synonyms]);

  if (canonicalValues.length === 0 && Object.keys(synonyms).length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📝</div>
        <p className={styles.emptyTitle}>No values to map</p>
        <p className={styles.emptyText}>
          {isSelectType 
            ? 'Add allowed values in the Values tab first, then add synonyms here.'
            : 'Add canonical values and their synonyms for import mapping.'}
        </p>
        {!isSelectType && !readOnly && (
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setAddingValue(true)}
          >
            + Add Canonical Value
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className={styles.error} role="alert">
          ⚠️ {error}
          <button 
            className={styles.btnGhost} 
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Value/Synonym list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {canonicalValues.map((value) => (
          <div 
            key={value} 
            className={styles.sourceItem}
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className={styles.sourceName}>{value}</span>
                <span className={styles.sourceStats}>
                  {(synonyms[value] || []).length} synonym{(synonyms[value] || []).length !== 1 ? 's' : ''}
                </span>
              </div>
              {!readOnly && (
                <button
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setEditingValue(editingValue === value ? null : value)}
                  aria-expanded={editingValue === value}
                  aria-controls={`synonyms-${value}`}
                >
                  {editingValue === value ? 'Done' : 'Edit'}
                </button>
              )}
            </div>

            {/* Synonym tags */}
            <div className={styles.synonymList} id={`synonyms-${value}`}>
              {(synonyms[value] || []).map((syn) => (
                <span key={syn} className={styles.synonymTag}>
                  {syn}
                  {!readOnly && editingValue === value && (
                    <button
                      className={styles.synonymTagRemove}
                      onClick={() => handleRemoveSynonym(value, syn)}
                      disabled={saving}
                      aria-label={`Remove synonym ${syn}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}

              {/* Add synonym input */}
              {editingValue === value && !readOnly && (
                <input
                  type="text"
                  className={styles.synonymInput}
                  value={newSynonym}
                  onChange={(e) => setNewSynonym(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, value)}
                  onBlur={() => {
                    if (newSynonym.trim()) {
                      handleAddSynonym(value, newSynonym);
                    }
                  }}
                  placeholder="Add synonym (comma for multiple)"
                  aria-label={`Add synonym for ${value}`}
                  disabled={saving}
                />
              )}

              {(synonyms[value] || []).length === 0 && editingValue !== value && (
                <span style={{ color: '#9ca3af', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                  No synonyms
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Add new canonical value (for string types) */}
        {addingValue && !isSelectType && (
          <div className={styles.sourceItem} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className={styles.editInput}
                value={newCanonicalValue}
                onChange={(e) => setNewCanonicalValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCanonicalValue();
                  if (e.key === 'Escape') {
                    setAddingValue(false);
                    setNewCanonicalValue('');
                  }
                }}
                placeholder="Canonical value"
                autoFocus
              />
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleAddCanonicalValue}
                disabled={saving}
              >
                Add
              </button>
              <button
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setAddingValue(false);
                  setNewCanonicalValue('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add value button (for string types) */}
      {!isSelectType && !addingValue && !readOnly && (
        <button
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={() => setAddingValue(true)}
          disabled={saving}
          style={{ marginTop: '1rem' }}
        >
          + Add Canonical Value
        </button>
      )}

      {/* Test transformation */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '6px' }}>
        <label className={styles.formLabel} htmlFor="test-transform">
          Test Transformation
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            id="test-transform"
            type="text"
            className={styles.formInput}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter a value to test..."
            style={{ flex: 1 }}
          />
          <span style={{ color: '#6b7280' }}>→</span>
          {testResult && (
            <span style={{ 
              fontWeight: 500,
              color: testResult.type === 'unknown' ? '#dc2626' : '#059669',
            }}>
              {testResult.type === 'unknown' 
                ? '❓ Unknown' 
                : testResult.canonical}
              {testResult.type === 'synonym' && (
                <span style={{ color: '#6b7280', fontWeight: 400, marginLeft: '0.25rem' }}>
                  (via "{testResult.synonym}")
                </span>
              )}
            </span>
          )}
        </div>
        <p className={styles.formHelp}>
          Test how a raw value would be normalized during import
        </p>
      </div>
    </div>
  );
}
