/**
 * Import Upload Step Component
 * Step 1: Upload CSV file with validation
 */

import { useState, useRef, ChangeEvent } from 'react';
import Papa from 'papaparse';
import './ImportUploadStep.css';

interface UploadedFile {
  file: File;
  content: string;
  headers: string[];
  rows: Record<string, string>[];
}

interface ImportUploadStepProps {
  onFileUploaded: (fileData: UploadedFile) => void;
  onCancel: () => void;
}

export function ImportUploadStep({ onFileUploaded, onCancel }: ImportUploadStepProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');
    
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file (.csv extension)');
      setSelectedFile(null);
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size exceeds 10MB limit');
      setSelectedFile(null);
      return;
    }

    // Validate non-empty
    if (file.size === 0) {
      setError('File is empty');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setParsing(true);
    setError('');

    try {
      // Read file content
      const content = await selectedFile.text();

      // Parse CSV with PapaParse
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            const errorMsg = results.errors[0].message;
            setError(`CSV parsing error: ${errorMsg}`);
            setParsing(false);
            return;
          }

          const headers = results.meta.fields || [];
          const rows = results.data as Record<string, string>[];

          if (headers.length === 0) {
            setError('CSV file has no headers');
            setParsing(false);
            return;
          }

          if (rows.length === 0) {
            setError('CSV file has no data rows');
            setParsing(false);
            return;
          }

          // Success - pass to parent
          onFileUploaded({
            file: selectedFile,
            content,
            headers,
            rows,
          });
        },
        error: (error: Error) => {
          setError(`Failed to parse CSV: ${error.message}`);
          setParsing(false);
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to read file: ${errorMsg}`);
      setParsing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="import-upload-step">
      <h2>Upload CSV File</h2>
      <p className="step-description">
        Select a RetailOps CSV export file to begin the import process.
      </p>

      <div className="upload-area">
        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="file-input"
            id="csv-file-input"
          />
          <label htmlFor="csv-file-input" className="file-input-label">
            <span className="upload-icon">📁</span>
            <span className="upload-text">
              {selectedFile ? selectedFile.name : 'Choose CSV file...'}
            </span>
          </label>
        </div>

        {selectedFile && (
          <div className="file-info">
            <div className="file-detail">
              <strong>File:</strong> {selectedFile.name}
            </div>
            <div className="file-detail">
              <strong>Size:</strong> {formatFileSize(selectedFile.size)}
            </div>
            <div className="file-detail">
              <strong>Type:</strong> {selectedFile.type || 'text/csv'}
            </div>
          </div>
        )}

        {error && (
          <div className="upload-error">
            ⚠️ {error}
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button
          className="btn-secondary"
          onClick={onCancel}
          disabled={parsing}
        >
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={handleUpload}
          disabled={!selectedFile || parsing}
        >
          {parsing ? 'Parsing CSV...' : 'Continue to Mapping →'}
        </button>
      </div>

      <div className="upload-help">
        <h3>Requirements</h3>
        <ul>
          <li>File must be in CSV format (.csv extension)</li>
          <li>File size must not exceed 10MB</li>
          <li>CSV must include column headers</li>
          <li>CSV must contain at least one data row</li>
        </ul>
      </div>
    </div>
  );
}
