/**
 * ImportPreviewEditor Component
 * Upload/paste CSV and preview mapping transformations
 * 
 * Lisa PVS-0.3.2
 */

import { useState, useCallback, useRef } from 'react';
import type { ImportPreviewResult } from '../hooks/useMappings';
import styles from './MappingTab.module.css';

export interface ImportPreviewEditorProps {
  onPreview: (csvText: string, sourceId?: string) => Promise<ImportPreviewResult>;
  saving?: boolean;
}

export default function ImportPreviewEditor({
  onPreview,
  saving = false,
}: ImportPreviewEditorProps) {
  const [csvText, setCsvText] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setError('Please upload a CSV file');
      return;
    }

    try {
      const text = await file.text();
      setCsvText(text);
      setError(null);
    } catch (err) {
      setError('Failed to read file');
    }
  }, []);

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  // Handle preview
  const handlePreview = useCallback(async () => {
    if (!csvText.trim()) {
      setError('Please upload or paste CSV data');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await onPreview(csvText, sourceId || undefined);
      setPreviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setLoading(false);
    }
  }, [csvText, sourceId, onPreview]);

  // Render confidence badge
  const renderConfidenceBadge = (confidence: string) => {
    const classes: Record<string, string> = {
      high: styles.badgeHigh,
      medium: styles.badgeMedium,
      low: styles.badgeLow,
      unknown: styles.badgeUnknown,
      exact: styles.badgeHigh,
      normalized: styles.badgeMedium,
    };
    return (
      <span className={`${styles.badge} ${classes[confidence] || styles.badgeUnknown}`}>
        {confidence}
      </span>
    );
  };

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

      {/* Drop zone / file upload */}
      <div
        className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload CSV file or drag and drop"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
          style={{ display: 'none' }}
        />
        <div className={styles.dropZoneIcon}>📄</div>
        <p className={styles.dropZoneText}>
          {csvText ? 'CSV loaded — click to replace' : 'Drop CSV file here or click to upload'}
        </p>
        <p className={styles.dropZoneHint}>
          Or paste CSV text in the box below
        </p>
      </div>

      {/* CSV text area */}
      <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
        <label className={styles.formLabel} htmlFor="csv-text">
          CSV Data (first 50 rows will be previewed)
        </label>
        <textarea
          id="csv-text"
          className={`${styles.formInput} ${styles.formTextarea}`}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="Paste CSV content here...&#10;&#10;header1,header2,header3&#10;value1,value2,value3"
          rows={6}
          style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
        />
      </div>

      {/* Source ID selector */}
      <div className={styles.formGroup}>
        <label className={styles.formLabel} htmlFor="source-id">
          Source ID (optional)
        </label>
        <input
          id="source-id"
          type="text"
          className={styles.formInput}
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          placeholder="e.g., vendor_abc"
        />
        <p className={styles.formHelp}>
          Apply source-specific mapping overrides if defined
        </p>
      </div>

      {/* Preview button */}
      <button
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handlePreview}
        disabled={loading || saving || !csvText.trim()}
      >
        {loading ? (
          <>
            <div className={styles.spinner} style={{ width: 14, height: 14 }} />
            Previewing...
          </>
        ) : (
          '🔍 Preview Mapping'
        )}
      </button>

      {/* Preview results */}
      {previewResult && (
        <div className={styles.previewResults}>
          {/* Stats */}
          <div className={styles.previewHeader}>
            <h4 style={{ margin: 0, fontSize: '0.9375rem' }}>Preview Results</h4>
            <div className={styles.previewStats}>
              <span className={styles.previewStat}>
                <span className={styles.previewStatValue}>{previewResult.previewedRows}</span>
                {' '}of{' '}
                <span className={styles.previewStatValue}>{previewResult.totalRows}</span>
                {' '}rows
              </span>
              <span className={styles.previewStat}>
                <span className={styles.previewStatValue}>{previewResult.headers.length}</span>
                {' '}columns
              </span>
              {previewResult.unknownHeaders.length > 0 && (
                <span className={styles.previewStat} style={{ color: '#dc2626' }}>
                  <span className={styles.previewStatValue}>{previewResult.unknownHeaders.length}</span>
                  {' '}unknown headers
                </span>
              )}
            </div>
          </div>

          {/* Header mapping table */}
          <div style={{ marginTop: '1rem' }}>
            <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
              Column Mapping
            </h5>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Original Header</th>
                  <th>→ Canonical ID</th>
                  <th>Confidence</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {previewResult.headers.map((header, idx) => (
                  <tr key={idx}>
                    <td>
                      <code style={{ fontSize: '0.8125rem', background: '#f3f4f6', padding: '0.125rem 0.375rem', borderRadius: '3px' }}>
                        {header.original}
                      </code>
                    </td>
                    <td>
                      {header.canonical ? (
                        <code style={{ fontSize: '0.8125rem', color: '#059669' }}>
                          {header.canonical}
                        </code>
                      ) : (
                        <span style={{ color: '#dc2626' }}>❓ Not mapped</span>
                      )}
                    </td>
                    <td>{renderConfidenceBadge(header.confidence)}</td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeAttribute}`}>
                        {header.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unknown values warning */}
          {Object.keys(previewResult.unknownValues).length > 0 && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              background: '#fef2f2', 
              borderRadius: '6px',
              border: '1px solid #fecaca',
            }}>
              <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#dc2626' }}>
                ⚠️ Unknown Values Detected
              </h5>
              <div style={{ fontSize: '0.8125rem' }}>
                {Object.entries(previewResult.unknownValues).map(([attr, values]) => (
                  <div key={attr} style={{ marginBottom: '0.5rem' }}>
                    <strong>{attr}:</strong>{' '}
                    {values.slice(0, 5).map((v, i) => (
                      <span key={i}>
                        <code style={{ background: '#fff', padding: '0.125rem 0.25rem', borderRadius: '2px' }}>
                          {v}
                        </code>
                        {i < Math.min(values.length - 1, 4) && ', '}
                      </span>
                    ))}
                    {values.length > 5 && (
                      <span style={{ color: '#6b7280' }}> +{values.length - 5} more</span>
                    )}
                  </div>
                ))}
              </div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#991b1b' }}>
                Add these values to synonyms or allowed_values to enable automatic normalization.
              </p>
            </div>
          )}

          {/* Sample rows */}
          {previewResult.rows.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                Sample Transformed Rows
              </h5>
              <div style={{ 
                overflow: 'auto', 
                maxHeight: '200px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '6px',
              }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {previewResult.headers
                        .filter(h => h.canonical)
                        .map((h, idx) => (
                          <th key={idx}>{h.canonical}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult.rows.slice(0, 5).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {previewResult.headers
                          .filter(h => h.canonical)
                          .map((h, colIdx) => (
                            <td key={colIdx}>
                              {String(row[h.canonical!] ?? '')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clear results */}
          <button
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setPreviewResult(null)}
            style={{ marginTop: '1rem' }}
          >
            Clear Preview
          </button>
        </div>
      )}
    </div>
  );
}
