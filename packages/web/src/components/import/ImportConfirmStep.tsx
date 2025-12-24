/**
 * Import Confirm Step Component
 * Step 4: Confirm and execute import by calling backend API
 */

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthProvider';
import { getAuthHeaders } from '@/lib/authHeaders';
import './ImportConfirmStep.css';

interface ColumnMappingConfig {
  [sourceColumn: string]: string;
}

interface ImportConfirmStepProps {
  file: File;
  mappings: ColumnMappingConfig;
  onImportComplete: (batchId: string) => void;
  onBack: () => void;
}

interface ImportProgress {
  status: 'idle' | 'uploading' | 'processing' | 'committing' | 'polling' | 'success' | 'error';
  message: string;
  batchId?: string;
  rowCount?: number;
  errorCount?: number;
  warningCount?: number;
  createdCount?: number;
  updatedCount?: number;
  blockedCount?: number;
}

export function ImportConfirmStep({ file, mappings, onImportComplete, onBack }: ImportConfirmStepProps) {
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    message: '',
  });

  const handleConfirmImport = async () => {
    if (!currentUser) {
      setProgress({
        status: 'error',
        message: 'Not authenticated. Please sign in and try again.',
      });
      return;
    }

    setProgress({
      status: 'uploading',
      message: 'Uploading CSV file...',
    });

    try {
      // Get auth headers
      const authHeaders = await getAuthHeaders();
      
      // LP-ATTR-1.3.1.1: For multipart/form-data, only include Authorization header
      // Do NOT set Content-Type - browser sets it automatically with boundary
      const uploadHeaders: Record<string, string> = {
        Authorization: authHeaders.Authorization,
      };

      // Prepare form data
      const formData = new FormData();
      formData.append('file', file);

      // TODO: Send mappings with the file (currently backend uses DEFAULT_COLUMN_MAPPINGS)
      // In future, backend should accept custom mappings in the request

      // Call import API
      // LP-ATTR-1.3.1.1: Use relative URL to leverage hosting rewrites (/api/** → api function)
      // This ensures CORS works correctly through same-origin request
      const response = await fetch('/api/importCSV', {
        method: 'POST',
        headers: uploadHeaders,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      setProgress({
        status: 'processing',
        message: 'Processing import rows...',
      });

      const uploadResult = await response.json();

      // Now call processImportBatch to convert rows to products
      setProgress({
        status: 'committing',
        message: 'Converting rows to products...',
        batchId: uploadResult.batchId,
        rowCount: uploadResult.rowCount,
        errorCount: uploadResult.errorCount || 0,
        warningCount: uploadResult.warningCount || 0,
      });

      const processResponse = await fetch('/api/processImportBatch', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId: uploadResult.batchId }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${processResponse.status}: ${processResponse.statusText}`);
      }

      const processResult = await processResponse.json();

      setProgress({
        status: 'success',
        message: 'Import completed successfully!',
        batchId: uploadResult.batchId,
        rowCount: uploadResult.rowCount,
        errorCount: uploadResult.errorCount || 0,
        warningCount: uploadResult.warningCount || 0,
        createdCount: processResult.createdCount || 0,
        updatedCount: processResult.updatedCount || 0,
        blockedCount: processResult.blockedCount || 0,
      });

      // Auto-navigate after 2 seconds
      setTimeout(() => {
        if (uploadResult.batchId) {
          onImportComplete(uploadResult.batchId);
        }
      }, 2000);
    } catch (error) {
      console.error('Import failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setProgress({
        status: 'error',
        message: `Import failed: ${errorMessage}`,
      });
    }
  };

  const isImporting = progress.status === 'uploading' || progress.status === 'processing';
  const hasCompleted = progress.status === 'success' || progress.status === 'error';

  return (
    <div className="import-confirm-step">
      <h2>Confirm Import</h2>
      <p className="step-description">
        Review the import details and click "Start Import" to begin processing.
      </p>

      <div className="confirm-details">
        <div className="detail-row">
          <strong>File Name:</strong>
          <span>{file.name}</span>
        </div>
        <div className="detail-row">
          <strong>File Size:</strong>
          <span>{(file.size / 1024).toFixed(1)} KB</span>
        </div>
        <div className="detail-row">
          <strong>Mapped Fields:</strong>
          <span>{Object.values(mappings).filter(Boolean).length}</span>
        </div>
      </div>

      {progress.status !== 'idle' && (
        <div className={`import-progress ${progress.status}`}>
          <div className="progress-header">
            {progress.status === 'uploading' && <div className="spinner" />}
            {progress.status === 'processing' && <div className="spinner" />}
            {progress.status === 'success' && <span className="progress-icon">✓</span>}
            {progress.status === 'error' && <span className="progress-icon error">✗</span>}
            <strong>{progress.message}</strong>
          </div>

          {progress.status === 'success' && progress.batchId && (
            <div className="import-result">
              <div className="result-item">
                <strong>Batch ID:</strong> {progress.batchId}
              </div>
              <div className="result-item">
                <strong>Rows Processed:</strong> {progress.rowCount}
              </div>
              {progress.createdCount !== undefined && progress.createdCount > 0 && (
                <div className="result-item success">
                  <strong>Products Created:</strong> {progress.createdCount}
                </div>
              )}
              {progress.updatedCount !== undefined && progress.updatedCount > 0 && (
                <div className="result-item success">
                  <strong>Products Updated:</strong> {progress.updatedCount}
                </div>
              )}
              {progress.blockedCount !== undefined && progress.blockedCount > 0 && (
                <div className="result-item error">
                  <strong>Rows Blocked:</strong> {progress.blockedCount}
                </div>
              )}
              {progress.errorCount !== undefined && progress.errorCount > 0 && (
                <div className="result-item error">
                  <strong>Rows with Errors:</strong> {progress.errorCount}
                </div>
              )}
              {progress.warningCount !== undefined && progress.warningCount > 0 && (
                <div className="result-item warning">
                  <strong>Rows with Warnings:</strong> {progress.warningCount}
                </div>
              )}
              <p className="result-note">
                Redirecting to batch details...
              </p>
            </div>
          )}
        </div>
      )}

      <div className="confirm-actions">
        <button
          className="btn-secondary"
          onClick={onBack}
          disabled={isImporting || hasCompleted}
        >
          ← Back to Preview
        </button>
        <button
          className="btn-primary btn-large"
          onClick={handleConfirmImport}
          disabled={isImporting || progress.status === 'success'}
        >
          {isImporting ? 'Importing...' : hasCompleted ? 'Import Complete' : 'Start Import'}
        </button>
      </div>

      <div className="confirm-warning">
        <strong>⚠️ Important:</strong>
        <ul>
          <li>This will create import batch records in Firestore</li>
          <li>Rows with validation errors will be skipped</li>
          <li>You can review the full batch report after completion</li>
          <li>Admin approval may be required for product creation (W2 workflow)</li>
        </ul>
      </div>
    </div>
  );
}
