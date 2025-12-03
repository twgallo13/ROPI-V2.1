/**
 * Import Preview Step Component
 * Step 3: Preview normalized rows with validation
 */

import { useState, useEffect } from 'react';
import { normalizeImportRow, validateImportRow, type ImportNormalizedFields, type ValidationIssue, type ColumnMapping } from '@ropi-aoss/sdk';
import './ImportPreviewStep.css';

interface UploadedFile {
  file: File;
  content: string;
  headers: string[];
  rows: Record<string, string>[];
}

interface ColumnMappingConfig {
  [sourceColumn: string]: string;
}

interface ImportPreviewStepProps {
  file: UploadedFile;
  mappings: ColumnMappingConfig;
  onConfirm: () => void;
  onBack: () => void;
}

interface PreviewRow {
  lineNumber: number;
  source: Record<string, string>;
  normalized: ImportNormalizedFields;
  validation: {
    isValid: boolean;
    errors: ValidationIssue[];
    warnings: ValidationIssue[];
  };
}

const PREVIEW_ROWS_COUNT = 10;

export function ImportPreviewStep({ file, mappings, onConfirm, onBack }: ImportPreviewStepProps) {
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    processPreview();
  }, [file, mappings]);

  const processPreview = () => {
    setLoading(true);

    try {
      // Convert mappings to ColumnMapping format
      const columnMappings: ColumnMapping[] = Object.entries(mappings)
        .filter(([_, targetField]) => targetField) // Only mapped columns
        .map(([sourceColumn, targetField]) => ({
          sourceColumn,
          targetField,
          transform: 'trim' as const, // Default transform
        }));

      // Process first N rows
      const rowsToPreview = file.rows.slice(0, PREVIEW_ROWS_COUNT);
      
      const processed: PreviewRow[] = rowsToPreview.map((row, index) => {
        // Normalize row
        const normalized = normalizeImportRow(row, columnMappings);
        
        // Validate row
        const validation = validateImportRow(normalized);

        return {
          lineNumber: index + 2, // +2 because: 1 for header, 1 for 0-index
          source: row,
          normalized,
          validation,
        };
      });

      setPreviewRows(processed);
    } catch (error) {
      console.error('Failed to process preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRowExpanded = (lineNumber: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(lineNumber)) {
        next.delete(lineNumber);
      } else {
        next.add(lineNumber);
      }
      return next;
    });
  };

  const errorCount = previewRows.filter(r => !r.validation.isValid).length;
  const warningCount = previewRows.reduce(
    (sum, r) => sum + r.validation.warnings.length,
    0
  );

  const mappedFields = Object.values(mappings).filter(Boolean);

  return (
    <div className="import-preview-step">
      <h2>Preview Import Data</h2>
      <p className="step-description">
        Review the first {PREVIEW_ROWS_COUNT} rows with normalized values and validation results.
        Rows with errors will be skipped during import.
      </p>

      <div className="preview-summary">
        <div className="summary-card">
          <div className="summary-value">{file.rows.length}</div>
          <div className="summary-label">Total Rows</div>
        </div>
        <div className="summary-card">
          <div className="summary-value">{mappedFields.length}</div>
          <div className="summary-label">Mapped Fields</div>
        </div>
        <div className={`summary-card ${errorCount > 0 ? 'error' : 'success'}`}>
          <div className="summary-value">{errorCount}</div>
          <div className="summary-label">Rows with Errors</div>
        </div>
        <div className={`summary-card ${warningCount > 0 ? 'warning' : 'success'}`}>
          <div className="summary-value">{warningCount}</div>
          <div className="summary-label">Total Warnings</div>
        </div>
      </div>

      {loading ? (
        <div className="preview-loading">Loading preview...</div>
      ) : (
        <div className="preview-table-wrapper">
          <table className="preview-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>Line</th>
                <th style={{ width: '120px' }}>Status</th>
                {mappedFields.slice(0, 4).map(field => (
                  <th key={field}>{field}</th>
                ))}
                <th style={{ width: '100px' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.map(row => {
                const isExpanded = expandedRows.has(row.lineNumber);
                const hasErrors = !row.validation.isValid;
                const hasWarnings = row.validation.warnings.length > 0;

                return (
                  <>
                    <tr
                      key={row.lineNumber}
                      className={hasErrors ? 'row-error' : hasWarnings ? 'row-warning' : 'row-valid'}
                    >
                      <td className="line-number">{row.lineNumber}</td>
                      <td className="status-cell">
                        {hasErrors ? (
                          <span className="status-badge error">Error</span>
                        ) : hasWarnings ? (
                          <span className="status-badge warning">Warning</span>
                        ) : (
                          <span className="status-badge success">OK</span>
                        )}
                      </td>
                      {mappedFields.slice(0, 4).map(field => (
                        <td key={field} className="field-value">
                          <div className="value-display">
                            {row.normalized[field]?.toString() || '—'}
                          </div>
                        </td>
                      ))}
                      <td className="details-cell">
                        <button
                          className="btn-details"
                          onClick={() => toggleRowExpanded(row.lineNumber)}
                        >
                          {isExpanded ? '▼ Hide' : '▶ Show'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="row-details">
                        <td colSpan={6 + mappedFields.length}>
                          <div className="details-content">
                            {/* Source values */}
                            <div className="details-section">
                              <h4>Source Values (CSV)</h4>
                              <div className="details-grid">
                                {Object.entries(row.source).map(([key, value]) => (
                                  <div key={key} className="detail-item">
                                    <strong>{key}:</strong> {value || '(empty)'}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Normalized values */}
                            <div className="details-section">
                              <h4>Normalized Values</h4>
                              <div className="details-grid">
                                {Object.entries(row.normalized).map(([key, value]) => (
                                  <div key={key} className="detail-item">
                                    <strong>{key}:</strong>{' '}
                                    {Array.isArray(value) ? value.join(', ') : value?.toString() || '(empty)'}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Validation issues */}
                            {(row.validation.errors.length > 0 || row.validation.warnings.length > 0) && (
                              <div className="details-section">
                                <h4>Validation Issues</h4>
                                {row.validation.errors.map((error, idx) => (
                                  <div key={idx} className="validation-issue error">
                                    <span className="issue-severity">ERROR:</span>
                                    <span className="issue-field">[{error.field}]</span>
                                    <span className="issue-message">{error.message}</span>
                                  </div>
                                ))}
                                {row.validation.warnings.map((warning, idx) => (
                                  <div key={idx} className="validation-issue warning">
                                    <span className="issue-severity">WARNING:</span>
                                    <span className="issue-field">[{warning.field}]</span>
                                    <span className="issue-message">{warning.message}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="preview-note">
        <strong>Note:</strong> Showing first {PREVIEW_ROWS_COUNT} rows only.
        The full import will process all {file.rows.length} rows.
        {errorCount > 0 && (
          <span className="error-note">
            {' '}Rows with errors will be skipped and logged in the batch report.
          </span>
        )}
      </div>

      <div className="preview-actions">
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Mapping
        </button>
        <button className="btn-primary" onClick={onConfirm}>
          Confirm & Import →
        </button>
      </div>
    </div>
  );
}
