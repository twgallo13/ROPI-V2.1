/**
 * DiffViewer Component
 * PVS-0.3.3 - Audit UI
 * 
 * Side-by-side JSON diff viewer with highlighted changes
 * Shows before → after state for audit events
 */

import { useMemo, useCallback } from 'react';
import styles from './AuditTab.module.css';

export interface DiffViewerProps {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  changedFields?: string[];
  title?: string;
  onCopy?: () => void;
}

type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

interface DiffLine {
  key: string;
  path: string;
  beforeValue: unknown;
  afterValue: unknown;
  changeType: ChangeType;
  depth: number;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return JSON.stringify(value, null, 2);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Compare two values and determine change type
 */
function compareValues(before: unknown, after: unknown): ChangeType {
  if (before === undefined && after !== undefined) return 'added';
  if (before !== undefined && after === undefined) return 'removed';
  if (JSON.stringify(before) !== JSON.stringify(after)) return 'modified';
  return 'unchanged';
}

/**
 * Extract all keys from both objects recursively
 */
function getAllKeys(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  prefix = '',
  depth = 0
): DiffLine[] {
  const lines: DiffLine[] = [];
  const beforeObj = before || {};
  const afterObj = after || {};
  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  // Sort keys alphabetically, but put common fields first
  const priorityKeys = ['attribute_id', 'label', 'data_type', 'status', 'category'];
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    const aPriority = priorityKeys.indexOf(a);
    const bPriority = priorityKeys.indexOf(b);
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const beforeValue = beforeObj[key];
    const afterValue = afterObj[key];
    const changeType = compareValues(beforeValue, afterValue);

    // Skip unchanged fields at depth 0 for cleaner view
    // But always show if explicitly in changedFields
    lines.push({
      key,
      path,
      beforeValue,
      afterValue,
      changeType,
      depth,
    });
  }

  return lines;
}

/**
 * DiffViewer component
 */
export function DiffViewer({
  before,
  after,
  changedFields,
  title,
  onCopy,
}: DiffViewerProps) {
  const diffLines = useMemo(() => {
    const lines = getAllKeys(before, after);
    
    // If changedFields is provided, filter to only show those
    // Otherwise show all lines but highlight changes
    if (changedFields && changedFields.length > 0) {
      return lines.filter(line => 
        changedFields.includes(line.path) || 
        line.changeType !== 'unchanged'
      );
    }
    
    return lines;
  }, [before, after, changedFields]);

  const handleCopyDiff = useCallback(() => {
    const diffText = diffLines
      .filter(line => line.changeType !== 'unchanged')
      .map(line => {
        const prefix = line.changeType === 'added' ? '+' : line.changeType === 'removed' ? '-' : '~';
        return `${prefix} ${line.key}: ${formatValue(line.beforeValue)} → ${formatValue(line.afterValue)}`;
      })
      .join('\n');

    navigator.clipboard.writeText(diffText);
    onCopy?.();
  }, [diffLines, onCopy]);

  const handleCopyJSON = useCallback(() => {
    const data = {
      before,
      after,
      changes: diffLines
        .filter(line => line.changeType !== 'unchanged')
        .map(line => ({
          field: line.path,
          changeType: line.changeType,
          before: line.beforeValue,
          after: line.afterValue,
        })),
    };
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    onCopy?.();
  }, [before, after, diffLines, onCopy]);

  const changedCount = diffLines.filter(l => l.changeType !== 'unchanged').length;

  if (!before && !after) {
    return (
      <div className={styles.diffViewer}>
        <div className={styles.diffEmpty}>No changes to display</div>
      </div>
    );
  }

  return (
    <div className={styles.diffViewer} role="region" aria-label={title || 'Diff viewer'}>
      <div className={styles.diffHeader}>
        <div className={styles.diffTitle}>
          {title || 'Changes'}
          <span className={styles.diffCount}>
            {changedCount} field{changedCount !== 1 ? 's' : ''} changed
          </span>
        </div>
        <div className={styles.diffActions}>
          <button
            type="button"
            className={styles.diffCopyBtn}
            onClick={handleCopyDiff}
            title="Copy changes as text"
            aria-label="Copy changes as text"
          >
            📋 Copy
          </button>
          <button
            type="button"
            className={styles.diffCopyBtn}
            onClick={handleCopyJSON}
            title="Copy as JSON"
            aria-label="Copy as JSON"
          >
            { } JSON
          </button>
        </div>
      </div>

      <div className={styles.diffContent}>
        <div className={styles.diffColumns}>
          {/* Before column */}
          <div className={styles.diffColumn}>
            <div className={styles.diffColumnHeader}>Before</div>
            <div className={styles.diffColumnContent}>
              {diffLines.map((line, idx) => (
                <div
                  key={`before-${idx}`}
                  className={`${styles.diffLine} ${styles[`diff${capitalize(line.changeType)}`]}`}
                  data-change={line.changeType}
                >
                  <span className={styles.diffKey}>{line.key}:</span>
                  <span className={styles.diffValue}>
                    {line.changeType === 'added' ? (
                      <span className={styles.diffPlaceholder}>—</span>
                    ) : (
                      formatValue(line.beforeValue)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow column */}
          <div className={styles.diffArrowColumn}>
            {diffLines.map((line, idx) => (
              <div
                key={`arrow-${idx}`}
                className={`${styles.diffArrow} ${line.changeType !== 'unchanged' ? styles.diffArrowActive : ''}`}
              >
                {line.changeType !== 'unchanged' ? '→' : ''}
              </div>
            ))}
          </div>

          {/* After column */}
          <div className={styles.diffColumn}>
            <div className={styles.diffColumnHeader}>After</div>
            <div className={styles.diffColumnContent}>
              {diffLines.map((line, idx) => (
                <div
                  key={`after-${idx}`}
                  className={`${styles.diffLine} ${styles[`diff${capitalize(line.changeType)}`]}`}
                  data-change={line.changeType}
                >
                  <span className={styles.diffKey}>{line.key}:</span>
                  <span className={styles.diffValue}>
                    {line.changeType === 'removed' ? (
                      <span className={styles.diffPlaceholder}>—</span>
                    ) : (
                      formatValue(line.afterValue)
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.diffLegend}>
        <span className={`${styles.diffLegendItem} ${styles.diffAdded}`}>+ Added</span>
        <span className={`${styles.diffLegendItem} ${styles.diffRemoved}`}>− Removed</span>
        <span className={`${styles.diffLegendItem} ${styles.diffModified}`}>~ Modified</span>
      </div>
    </div>
  );
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default DiffViewer;
