/**
 * PerSourceOverrides Component
 * Manages per-source (vendor) mapping overrides
 * 
 * Features:
 * - List source overrides
 * - Clone from global/attribute mapping
 * - Edit/delete overrides
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback } from 'react';
import type { SourceOverride } from '../hooks/useMappings';
import styles from './MappingTab.module.css';

export interface PerSourceOverridesProps {
  attributeId: string;  // Used for context, may be needed for future features
  sources: Record<string, SourceOverride>;
  onAdd: (sourceId: string, data: SourceOverride) => Promise<void>;
  onEdit: (sourceId: string) => void;
  onDelete: (sourceId: string) => Promise<void>;
  onCloneFromGlobal: (sourceId: string) => Promise<void>;
  loading?: boolean;
  saving?: boolean;
}

export default function PerSourceOverrides({
  attributeId: _attributeId,
  sources,
  onAdd,
  onEdit,
  onDelete,
  onCloneFromGlobal,
  loading = false,
  saving = false,
}: PerSourceOverridesProps) {
  const [adding, setAdding] = useState(false);
  const [newSourceId, setNewSourceId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sourceIds = Object.keys(sources).sort();

  // Count aliases and synonyms for a source
  const getSourceStats = (source: SourceOverride) => {
    const aliasCount = Object.keys(source.aliases || {}).length;
    const synonymCount = Object.keys(source.value_synonyms || {}).reduce(
      (sum, key) => sum + (source.value_synonyms?.[key]?.length || 0),
      0
    );
    return { aliasCount, synonymCount };
  };

  const handleAdd = useCallback(async () => {
    const trimmed = newSourceId.trim();
    if (!trimmed) {
      setError('Source ID is required');
      return;
    }

    if (sources[trimmed]) {
      setError(`Source "${trimmed}" already exists`);
      return;
    }

    // Validate source ID format (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      setError('Source ID must be alphanumeric (with underscores/hyphens)');
      return;
    }

    try {
      setError(null);
      await onAdd(trimmed, { aliases: {}, value_synonyms: {} });
      setNewSourceId('');
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add source');
    }
  }, [newSourceId, sources, onAdd]);

  const handleDelete = useCallback(async (sourceId: string) => {
    if (!confirm(`Delete source override "${sourceId}"? This cannot be undone.`)) {
      return;
    }
    try {
      setError(null);
      await onDelete(sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete source');
    }
  }, [onDelete]);

  const handleClone = useCallback(async (sourceId: string) => {
    try {
      setError(null);
      await onCloneFromGlobal(sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clone');
    }
  }, [onCloneFromGlobal]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        Loading source overrides...
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

      {sourceIds.length === 0 && !adding ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏷️</div>
          <p className={styles.emptyTitle}>No source overrides</p>
          <p className={styles.emptyText}>
            Add vendor-specific mapping overrides that take precedence over attribute-level mappings.
          </p>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setAdding(true)}
          >
            + Add Source Override
          </button>
        </div>
      ) : (
        <>
          <div className={styles.sourceList}>
            {sourceIds.map((sourceId) => {
              const source = sources[sourceId];
              const stats = getSourceStats(source);
              
              return (
                <div key={sourceId} className={styles.sourceItem}>
                  <div className={styles.sourceInfo}>
                    <span className={styles.sourceName}>{sourceId}</span>
                    <span className={styles.sourceStats}>
                      {stats.aliasCount} alias{stats.aliasCount !== 1 ? 'es' : ''}, {' '}
                      {stats.synonymCount} synonym{stats.synonymCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => handleClone(sourceId)}
                      disabled={saving}
                      title="Clone mappings from attribute level"
                    >
                      📋 Clone
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => onEdit(sourceId)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      onClick={() => handleDelete(sourceId)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add new source */}
            {adding && (
              <div className={styles.sourceItem}>
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1 }}>
                  <input
                    type="text"
                    className={styles.editInput}
                    value={newSourceId}
                    onChange={(e) => setNewSourceId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdd();
                      if (e.key === 'Escape') {
                        setAdding(false);
                        setNewSourceId('');
                      }
                    }}
                    placeholder="vendor_source_id"
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    onClick={handleAdd}
                    disabled={saving}
                  >
                    Add
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnGhost}`}
                    onClick={() => {
                      setAdding(false);
                      setNewSourceId('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {!adding && (
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => setAdding(true)}
              disabled={saving}
              style={{ marginTop: '1rem' }}
            >
              + Add Source Override
            </button>
          )}
        </>
      )}

      {/* Precedence explanation */}
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '0.75rem', 
        background: '#fffbeb', 
        borderRadius: '6px',
        fontSize: '0.8125rem',
        color: '#92400e',
      }}>
        <strong>Precedence:</strong> Source overrides take highest priority during import. 
        When importing from a specific source, mappings are applied in order: 
        Source → Attribute → Global.
      </div>
    </div>
  );
}
