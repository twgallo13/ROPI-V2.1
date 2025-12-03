/**
 * Import History Table Component
 * Shows recent import_batches with status
 */

import type { ImportBatch } from '@ropi-aoss/sdk';
import './ImportHistoryTable.css';

interface ImportHistoryTableProps {
  batches: ImportBatch[];
  loading: boolean;
  onBatchClick: (batchId: string) => void;
}

export function ImportHistoryTable({ batches, loading, onBatchClick }: ImportHistoryTableProps) {
  if (loading) {
    return (
      <div className="history-loading">
        <div className="spinner-large" />
        <p>Loading import history...</p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="history-empty">
        <h3>No Import History</h3>
        <p>You haven't created any imports yet.</p>
        <p>Click "+ New Import" to get started.</p>
      </div>
    );
  }

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'processed':
        return <span className="status-badge processed">Processed</span>;
      case 'failed':
        return <span className="status-badge failed">Failed</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  return (
    <div className="import-history-table-wrapper">
      <table className="import-history-table">
        <thead>
          <tr>
            <th>Batch ID</th>
            <th>File Name</th>
            <th>Created At</th>
            <th>Created By</th>
            <th>Rows</th>
            <th>Errors</th>
            <th>Warnings</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {batches.map(batch => (
            <tr key={batch.batchId}>
              <td className="batch-id">
                <code>{batch.batchId.slice(0, 8)}...</code>
              </td>
              <td className="file-name">{batch.fileName}</td>
              <td className="created-at">{formatDate(batch.createdAt)}</td>
              <td className="created-by">
                <code>{batch.createdBy.slice(0, 8)}...</code>
              </td>
              <td className="row-count">{batch.rowCount}</td>
              <td className={`error-count ${batch.errorCount && batch.errorCount > 0 ? 'has-errors' : ''}`}>
                {batch.errorCount || 0}
              </td>
              <td className={`warning-count ${batch.warningCount && batch.warningCount > 0 ? 'has-warnings' : ''}`}>
                {batch.warningCount || 0}
              </td>
              <td className="status-cell">{getStatusBadge(batch.status)}</td>
              <td className="actions-cell">
                <button
                  className="btn-view-details"
                  onClick={() => onBatchClick(batch.batchId)}
                >
                  View Details →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
