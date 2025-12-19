/**
 * AliasTable Component
 * Displays and manages header aliases for attribute mapping
 * 
 * Features:
 * - Inline edit/delete
 * - Bulk import
 * - Confidence badges
 * - Approve low-confidence aliases
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { AliasEntry } from '../hooks/useMappings';
import type { Attribute } from '../hooks/useAttributes';
import styles from './MappingTab.module.css';

export interface AliasTableProps {
  aliases: AliasEntry[];
  attributes: Attribute[];
  onAdd: (alias: string, canonicalId: string) => Promise<void>;
  onUpdate: (oldAlias: string, newAlias: string, canonicalId: string) => Promise<void>;
  onDelete: (alias: string) => Promise<void>;
  onApprove?: (alias: string) => Promise<void>;
  onBulkImport: () => void;
  loading?: boolean;
  saving?: boolean;
  readOnly?: boolean;
}

interface EditingState {
  alias: string;
  newAlias: string;
  canonicalId: string;
}

export default function AliasTable({
  aliases,
  attributes,
  onAdd,
  onUpdate,
  onDelete,
  onApprove,
  onBulkImport,
  loading = false,
  saving = false,
  readOnly = false,
}: AliasTableProps) {
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [adding, setAdding] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [newCanonicalId, setNewCanonicalId] = useState('');
  const [typeaheadOpen, setTypeaheadOpen] = useState(false);
  const [typeaheadQuery, setTypeaheadQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typeaheadRef = useRef<HTMLDivElement>(null);

  // Filter attributes for typeahead
  const filteredAttributes = useMemo(() => {
    if (!typeaheadQuery) return attributes.slice(0, 10);
    const query = typeaheadQuery.toLowerCase();
    return attributes
      .filter(a => 
        a.attribute_id.toLowerCase().includes(query) ||
        a.label.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [attributes, typeaheadQuery]);

  // Close typeahead on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (typeaheadRef.current && !typeaheadRef.current.contains(e.target as Node)) {
        setTypeaheadOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle add alias
  const handleAdd = useCallback(async () => {
    if (!newAlias.trim() || !newCanonicalId.trim()) {
      setError('Both alias and target attribute are required');
      return;
    }

    // Check for duplicate alias (case-insensitive)
    const existingAlias = aliases.find(
      a => a.alias.toLowerCase() === newAlias.toLowerCase()
    );
    if (existingAlias) {
      setError(`Alias "${newAlias}" already exists`);
      return;
    }

    // Validate canonical ID exists
    const attrExists = attributes.some(a => a.attribute_id === newCanonicalId);
    if (!attrExists) {
      setError(`Attribute "${newCanonicalId}" not found`);
      return;
    }

    try {
      setError(null);
      await onAdd(newAlias.trim(), newCanonicalId);
      setNewAlias('');
      setNewCanonicalId('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add alias');
    }
  }, [newAlias, newCanonicalId, aliases, attributes, onAdd]);

  // Handle update
  const handleUpdate = useCallback(async () => {
    if (!editing) return;
    
    if (!editing.newAlias.trim() || !editing.canonicalId.trim()) {
      setError('Both alias and target attribute are required');
      return;
    }

    // Check for duplicate (excluding current)
    const existingAlias = aliases.find(
      a => a.alias.toLowerCase() === editing.newAlias.toLowerCase() &&
           a.alias.toLowerCase() !== editing.alias.toLowerCase()
    );
    if (existingAlias) {
      setError(`Alias "${editing.newAlias}" already exists`);
      return;
    }

    try {
      setError(null);
      await onUpdate(editing.alias, editing.newAlias.trim(), editing.canonicalId);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update alias');
    }
  }, [editing, aliases, onUpdate]);

  // Handle delete
  const handleDelete = useCallback(async (alias: string) => {
    if (!confirm(`Delete alias "${alias}"?`)) return;
    try {
      setError(null);
      await onDelete(alias);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alias');
    }
  }, [onDelete]);

  // Handle approve
  const handleApprove = useCallback(async (alias: string) => {
    if (!onApprove) return;
    try {
      setError(null);
      await onApprove(alias);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve alias');
    }
  }, [onApprove]);

  // Typeahead keyboard navigation
  const handleTypeaheadKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!typeaheadOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, filteredAttributes.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredAttributes[highlightedIndex]) {
          const attr = filteredAttributes[highlightedIndex];
          if (editing) {
            setEditing({ ...editing, canonicalId: attr.attribute_id });
          } else {
            setNewCanonicalId(attr.attribute_id);
          }
          setTypeaheadOpen(false);
        }
        break;
      case 'Escape':
        setTypeaheadOpen(false);
        break;
    }
  }, [typeaheadOpen, filteredAttributes, highlightedIndex, editing]);

  // Render confidence badge
  const renderConfidenceBadge = (confidence: AliasEntry['confidence']) => {
    const classes = {
      high: styles.badgeHigh,
      medium: styles.badgeMedium,
      low: styles.badgeLow,
    };
    return (
      <span className={`${styles.badge} ${classes[confidence]}`} title={`${confidence} confidence match`}>
        {confidence}
      </span>
    );
  };

  // Render source badge
  const renderSourceBadge = (source: AliasEntry['source'], sourceId?: string) => {
    const classes = {
      global: styles.badgeGlobal,
      attribute: styles.badgeAttribute,
      source: styles.badgeSource,
    };
    const label = sourceId ? `${source}:${sourceId}` : source;
    return (
      <span className={`${styles.badge} ${classes[source]}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Loading aliases...
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

      <table className={styles.table} role="grid" aria-label="Header aliases">
        <thead>
          <tr>
            <th scope="col">Alias Header</th>
            <th scope="col">Maps To</th>
            <th scope="col">Source</th>
            <th scope="col">Confidence</th>
            <th scope="col">
              <span className={styles.srOnly}>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {aliases.length === 0 && !adding && (
            <tr>
              <td colSpan={5}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🔗</div>
                  <p className={styles.emptyTitle}>No aliases defined</p>
                  <p className={styles.emptyText}>
                    Add header aliases to map vendor column names to canonical attributes
                  </p>
                  {!readOnly && (
                    <button 
                      className={`${styles.btn} ${styles.btnPrimary}`}
                      onClick={() => setAdding(true)}
                    >
                      + Add Alias
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}

          {aliases.map((alias) => (
            <tr key={alias.alias}>
              {editing?.alias === alias.alias ? (
                // Editing row
                <>
                  <td>
                    <input
                      type="text"
                      className={styles.editInput}
                      value={editing.newAlias}
                      onChange={(e) => setEditing({ ...editing, newAlias: e.target.value })}
                      aria-label="Edit alias name"
                      autoFocus
                    />
                  </td>
                  <td>
                    <div className={styles.typeahead} ref={typeaheadRef}>
                      <input
                        type="text"
                        className={styles.editInput}
                        value={editing.canonicalId}
                        onChange={(e) => {
                          setEditing({ ...editing, canonicalId: e.target.value });
                          setTypeaheadQuery(e.target.value);
                          setTypeaheadOpen(true);
                          setHighlightedIndex(0);
                        }}
                        onFocus={() => {
                          setTypeaheadQuery(editing.canonicalId);
                          setTypeaheadOpen(true);
                        }}
                        onKeyDown={handleTypeaheadKeyDown}
                        aria-label="Edit target attribute"
                        aria-expanded={typeaheadOpen}
                        aria-haspopup="listbox"
                      />
                      {typeaheadOpen && filteredAttributes.length > 0 && (
                        <div className={styles.typeaheadDropdown} role="listbox">
                          {filteredAttributes.map((attr, idx) => (
                            <div
                              key={attr.attribute_id}
                              className={`${styles.typeaheadOption} ${idx === highlightedIndex ? styles.typeaheadOptionHighlighted : ''}`}
                              onClick={() => {
                                setEditing({ ...editing, canonicalId: attr.attribute_id });
                                setTypeaheadOpen(false);
                              }}
                              role="option"
                              aria-selected={idx === highlightedIndex}
                            >
                              <strong>{attr.attribute_id}</strong>
                              <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>{attr.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{renderSourceBadge(alias.source, alias.sourceId)}</td>
                  <td>{renderConfidenceBadge(alias.confidence)}</td>
                  <td>
                    <div className={styles.rowActions} style={{ opacity: 1 }}>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnIcon}`}
                        onClick={handleUpdate}
                        disabled={saving}
                        aria-label="Save changes"
                      >
                        ✓
                      </button>
                      <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
                        onClick={() => setEditing(null)}
                        aria-label="Cancel editing"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </>
              ) : (
                // Display row
                <>
                  <td>
                    <code style={{ fontSize: '0.8125rem', background: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '3px' }}>
                      {alias.alias}
                    </code>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8125rem', color: '#3b82f6' }}>
                      {alias.canonicalId}
                    </code>
                  </td>
                  <td>{renderSourceBadge(alias.source, alias.sourceId)}</td>
                  <td>{renderConfidenceBadge(alias.confidence)}</td>
                  <td>
                    <div className={styles.rowActions}>
                      {!readOnly && (
                        <>
                          {alias.confidence === 'low' && onApprove && (
                            <button
                              className={`${styles.btn} ${styles.btnSecondary}`}
                              onClick={() => handleApprove(alias.alias)}
                              disabled={saving}
                              title="Approve this alias"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
                            onClick={() => setEditing({
                              alias: alias.alias,
                              newAlias: alias.alias,
                              canonicalId: alias.canonicalId,
                            })}
                            disabled={saving}
                            aria-label={`Edit alias ${alias.alias}`}
                          >
                            ✏️
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
                            onClick={() => handleDelete(alias.alias)}
                            disabled={saving}
                            aria-label={`Delete alias ${alias.alias}`}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </>
              )}
            </tr>
          ))}

          {/* Add new row */}
          {adding && (
            <tr>
              <td>
                <input
                  ref={inputRef}
                  type="text"
                  className={styles.editInput}
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  placeholder="vendor_header"
                  aria-label="New alias name"
                  autoFocus
                />
              </td>
              <td>
                <div className={styles.typeahead} ref={typeaheadRef}>
                  <input
                    type="text"
                    className={styles.editInput}
                    value={newCanonicalId}
                    onChange={(e) => {
                      setNewCanonicalId(e.target.value);
                      setTypeaheadQuery(e.target.value);
                      setTypeaheadOpen(true);
                      setHighlightedIndex(0);
                    }}
                    onFocus={() => {
                      setTypeaheadQuery(newCanonicalId);
                      setTypeaheadOpen(true);
                    }}
                    onKeyDown={handleTypeaheadKeyDown}
                    placeholder="canonical_attribute"
                    aria-label="Target attribute"
                    aria-expanded={typeaheadOpen}
                    aria-haspopup="listbox"
                  />
                  {typeaheadOpen && filteredAttributes.length > 0 && (
                    <div className={styles.typeaheadDropdown} role="listbox">
                      {filteredAttributes.map((attr, idx) => (
                        <div
                          key={attr.attribute_id}
                          className={`${styles.typeaheadOption} ${idx === highlightedIndex ? styles.typeaheadOptionHighlighted : ''}`}
                          onClick={() => {
                            setNewCanonicalId(attr.attribute_id);
                            setTypeaheadOpen(false);
                          }}
                          role="option"
                          aria-selected={idx === highlightedIndex}
                        >
                          <strong>{attr.attribute_id}</strong>
                          <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>{attr.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <span className={`${styles.badge} ${styles.badgeAttribute}`}>attribute</span>
              </td>
              <td>
                <span className={`${styles.badge} ${styles.badgeHigh}`}>high</span>
              </td>
              <td>
                <div className={styles.rowActions} style={{ opacity: 1 }}>
                  <button
                    className={`${styles.btn} ${styles.btnPrimary} ${styles.btnIcon}`}
                    onClick={handleAdd}
                    disabled={saving}
                    aria-label="Add alias"
                  >
                    ✓
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
                    onClick={() => {
                      setAdding(false);
                      setNewAlias('');
                      setNewCanonicalId('');
                    }}
                    aria-label="Cancel adding"
                  >
                    ✕
                  </button>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {aliases.length > 0 && !adding && !readOnly && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => setAdding(true)}
            disabled={saving}
          >
            + Add Alias
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onBulkImport}
            disabled={saving}
          >
            📥 Bulk Import
          </button>
        </div>
      )}
    </div>
  );
}
