/**
 * BulkAliasImportModal Component
 * Modal for bulk importing aliases from CSV or pasted text
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Attribute } from '../hooks/useAttributes';
import styles from './MappingTab.module.css';

export interface BulkAliasImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (aliases: { alias: string; canonicalId: string }[]) => Promise<void>;
  attributes: Attribute[];
  existingAliases: string[];
}

interface ParsedAlias {
  alias: string;
  canonicalId: string;
  valid: boolean;
  error?: string;
}

export default function BulkAliasImportModal({
  isOpen,
  onClose,
  onImport,
  attributes,
  existingAliases,
}: BulkAliasImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Parse input text
  const parsedAliases = useMemo((): ParsedAlias[] => {
    if (!inputText.trim()) return [];

    const lines = inputText.trim().split('\n');
    const results: ParsedAlias[] = [];
    const seenAliases = new Set(existingAliases.map(a => a.toLowerCase()));
    const attributeIds = new Set(attributes.map(a => a.attribute_id));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Support multiple formats:
      // 1. alias,canonical_id
      // 2. alias -> canonical_id
      // 3. alias => canonical_id
      // 4. alias: canonical_id
      // 5. alias canonical_id (tab separated)
      let alias: string | undefined;
      let canonicalId: string | undefined;

      if (trimmed.includes(',')) {
        [alias, canonicalId] = trimmed.split(',').map(s => s.trim());
      } else if (trimmed.includes('->')) {
        [alias, canonicalId] = trimmed.split('->').map(s => s.trim());
      } else if (trimmed.includes('=>')) {
        [alias, canonicalId] = trimmed.split('=>').map(s => s.trim());
      } else if (trimmed.includes(':')) {
        [alias, canonicalId] = trimmed.split(':').map(s => s.trim());
      } else if (trimmed.includes('\t')) {
        [alias, canonicalId] = trimmed.split('\t').map(s => s.trim());
      } else {
        // Can't parse
        results.push({
          alias: trimmed,
          canonicalId: '',
          valid: false,
          error: 'Could not parse line. Use format: alias,canonical_id',
        });
        continue;
      }

      if (!alias || !canonicalId) {
        results.push({
          alias: alias || '',
          canonicalId: canonicalId || '',
          valid: false,
          error: 'Missing alias or canonical ID',
        });
        continue;
      }

      // Check for duplicate in parsed list
      const aliasLower = alias.toLowerCase();
      if (seenAliases.has(aliasLower)) {
        results.push({
          alias,
          canonicalId,
          valid: false,
          error: 'Duplicate alias',
        });
        continue;
      }

      // Check canonical ID exists
      if (!attributeIds.has(canonicalId)) {
        results.push({
          alias,
          canonicalId,
          valid: false,
          error: `Attribute "${canonicalId}" not found`,
        });
        continue;
      }

      seenAliases.add(aliasLower);
      results.push({
        alias,
        canonicalId,
        valid: true,
      });
    }

    return results;
  }, [inputText, attributes, existingAliases]);

  const validCount = parsedAliases.filter(a => a.valid).length;
  const invalidCount = parsedAliases.filter(a => !a.valid).length;

  // Handle import
  const handleImport = useCallback(async () => {
    const validAliases = parsedAliases.filter(a => a.valid);
    if (validAliases.length === 0) {
      setError('No valid aliases to import');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      await onImport(validAliases);
      setInputText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }, [parsedAliases, onImport, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
    >
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2 id="bulk-import-title" className={styles.modalTitle}>
            Bulk Import Aliases
          </h2>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {error && (
            <div className={styles.error} role="alert" style={{ marginBottom: '1rem' }}>
              ⚠️ {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="bulk-aliases">
              Paste aliases (one per line)
            </label>
            <textarea
              ref={textareaRef}
              id="bulk-aliases"
              className={styles.bulkTextarea}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Supported formats:
alias,canonical_id
alias -> canonical_id
alias => canonical_id
alias: canonical_id
alias	canonical_id (tab)

Example:
VendorColor,primary_color
ProductName -> title
SKU: product_sku`}
              rows={10}
            />
          </div>

          {/* Preview */}
          {parsedAliases.length > 0 && (
            <div className={styles.bulkPreview}>
              <div className={styles.bulkPreviewTitle}>
                Preview
                <span className={styles.bulkPreviewCount} style={{ marginLeft: '0.5rem' }}>
                  {validCount} valid
                  {invalidCount > 0 && (
                    <span className={styles.bulkPreviewError}>
                      , {invalidCount} invalid
                    </span>
                  )}
                </span>
              </div>

              <table className={styles.table} style={{ fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '20px' }}></th>
                    <th>Alias</th>
                    <th>Canonical ID</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedAliases.slice(0, 20).map((parsed, idx) => (
                    <tr key={idx}>
                      <td>
                        {parsed.valid ? (
                          <span style={{ color: '#059669' }}>✓</span>
                        ) : (
                          <span style={{ color: '#dc2626' }}>✕</span>
                        )}
                      </td>
                      <td>
                        <code style={{ fontSize: '0.75rem' }}>{parsed.alias}</code>
                      </td>
                      <td>
                        <code style={{ fontSize: '0.75rem', color: parsed.valid ? '#3b82f6' : '#9ca3af' }}>
                          {parsed.canonicalId || '—'}
                        </code>
                      </td>
                      <td>
                        {parsed.valid ? (
                          <span className={`${styles.badge} ${styles.badgeHigh}`}>valid</span>
                        ) : (
                          <span style={{ color: '#dc2626', fontSize: '0.75rem' }}>
                            {parsed.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {parsedAliases.length > 20 && (
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Showing first 20 of {parsedAliases.length} entries
                </p>
              )}
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing ? (
              <>
                <div className={styles.spinner} style={{ width: 14, height: 14 }} />
                Importing...
              </>
            ) : (
              `Import ${validCount} Alias${validCount !== 1 ? 'es' : ''}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
