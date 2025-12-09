/**
 * Import Batch Detail Page
 * Shows row-level errors and links to products
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import PageLayout from '@/components/common/PageLayout';
import { useAuth } from '@/contexts/AuthProvider';
import { db } from '@/firebaseConfig';
import type { ImportBatch, ImportEngineRow } from '@ropi-aoss/sdk';
import './ImportBatchDetailPage.css';

export function ImportBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [rows, setRows] = useState<ImportEngineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'failed' | 'pending' | 'processed'>('all');
  const [hasWriteAccess, setHasWriteAccess] = useState(false);

  // Check access
  useEffect(() => {
    async function checkAccess() {
      if (!currentUser) {
        setHasWriteAccess(false);
        return;
      }

      if (isAdmin) {
        setHasWriteAccess(true);
        return;
      }

      try {
        const tokenResult = await currentUser.getIdTokenResult();
        const role = tokenResult.claims.role;
        setHasWriteAccess(role === 'admin' || role === 'merch');
      } catch (error) {
        console.error('Failed to check user role:', error);
        setHasWriteAccess(false);
      }
    }

    checkAccess();
  }, [currentUser, isAdmin]);

  // Load batch and rows
  useEffect(() => {
    if (!batchId || !hasWriteAccess || !db) return;

    async function loadBatchData() {
      setLoading(true);
      setError('');

      try {
        // Load batch metadata
        const batchRef = doc(db!, 'import_batches', batchId!);
        const batchSnap = await getDoc(batchRef);

        if (!batchSnap.exists()) {
          setError('Batch not found');
          setLoading(false);
          return;
        }

        const batchData = {
          batchId: batchSnap.id,
          ...batchSnap.data(),
        } as ImportBatch;
        setBatch(batchData);

        // Load rows (limit to first 100 for performance)
        const rowsRef = collection(db!, 'import_batches', batchId!, 'rows');
        const rowsSnap = await getDocs(rowsRef);
        
        const rowsData: ImportEngineRow[] = rowsSnap.docs.map(doc => ({
          ...doc.data(),
        } as ImportEngineRow));

        setRows(rowsData);
      } catch (err) {
        console.error('Failed to load batch:', err);
        setError('Failed to load batch data');
      } finally {
        setLoading(false);
      }
    }

    loadBatchData();
  }, [batchId, hasWriteAccess]);

  if (!currentUser || !hasWriteAccess) {
    return (
      <PageLayout title="Import Batch Details">
        <div className="batch-access-denied">
          <h3>Access Denied</h3>
          <p>You do not have permission to view import batches.</p>
          <button onClick={() => navigate('/import')}>← Back to Import Manager</button>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout title="Import Batch Details">
        <div className="batch-loading">
          <div className="spinner-large" />
          <p>Loading batch details...</p>
        </div>
      </PageLayout>
    );
  }

  if (error || !batch) {
    return (
      <PageLayout title="Import Batch Details">
        <div className="batch-error">
          <h3>Error</h3>
          <p>{error || 'Batch not found'}</p>
          <button onClick={() => navigate('/import')}>← Back to Import Manager</button>
        </div>
      </PageLayout>
    );
  }

  const filteredRows = rows.filter(row => {
    if (filterStatus === 'all') return true;
    return row.meta.status === filterStatus;
  });

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

  const failedCount = rows.filter(r => r.meta.status === 'failed').length;
  const processedCount = rows.filter(r => r.meta.status === 'processed').length;
  const pendingCount = rows.filter(r => r.meta.status === 'pending').length;

  return (
    <PageLayout title={`Batch: ${batch.fileName}`}>
      <div className="batch-detail-page">
        <div className="batch-header">
          <button className="btn-back" onClick={() => navigate('/import')}>
            ← Back to Import Manager
          </button>
        </div>

        {/* Batch summary */}
        <div className="batch-summary">
          <div className="summary-item">
            <strong>Batch ID:</strong>
            <code>{batch.batchId}</code>
          </div>
          <div className="summary-item">
            <strong>File Name:</strong>
            <span>{batch.fileName}</span>
          </div>
          <div className="summary-item">
            <strong>Created:</strong>
            <span>{formatDate(batch.createdAt)}</span>
          </div>
          <div className="summary-item">
            <strong>Created By:</strong>
            <code>{batch.createdBy}</code>
          </div>
          <div className="summary-item">
            <strong>Status:</strong>
            {getStatusBadge(batch.status)}
          </div>
        </div>

        {/* Row counts */}
        <div className="row-counts">
          <div className="count-card">
            <div className="count-value">{batch.rowCount}</div>
            <div className="count-label">Total Rows</div>
          </div>
          {batch.createdCount !== undefined && (
            <div className="count-card success">
              <div className="count-value">{batch.createdCount}</div>
              <div className="count-label">Products Created</div>
            </div>
          )}
          {batch.updatedCount !== undefined && (
            <div className="count-card success">
              <div className="count-value">{batch.updatedCount}</div>
              <div className="count-label">Products Updated</div>
            </div>
          )}
          {batch.blockedCount !== undefined && (
            <div className="count-card blocked">
              <div className="count-value">{batch.blockedCount}</div>
              <div className="count-label">Rows Blocked</div>
            </div>
          )}
          <div className="count-card processed">
            <div className="count-value">{processedCount}</div>
            <div className="count-label">Processed</div>
          </div>
          <div className="count-card pending">
            <div className="count-value">{pendingCount}</div>
            <div className="count-label">Pending</div>
          </div>
          <div className="count-card failed">
            <div className="count-value">{failedCount}</div>
            <div className="count-label">Failed</div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="filter-controls">
          <label>Filter by status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">All Rows ({rows.length})</option>
            <option value="processed">Processed ({processedCount})</option>
            <option value="pending">Pending ({pendingCount})</option>
            <option value="failed">Failed ({failedCount})</option>
          </select>
        </div>

        {/* Rows table */}
        <div className="rows-table-wrapper">
          <table className="rows-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>SKU</th>
                <th>Title</th>
                <th>Status</th>
                <th>Errors</th>
                <th>Product</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.rowId} className={`row-${row.meta.status}`}>
                  <td className="line-number">{row.source.lineNumber}</td>
                  <td className="sku">
                    <code>{row.normalized.sku || '—'}</code>
                  </td>
                  <td className="title">{row.normalized.title || '—'}</td>
                  <td className="status-cell">{getStatusBadge(row.meta.status)}</td>
                  <td className="errors-cell">
                    {row.validation.errors.length > 0 ? (
                      <span className="error-count">
                        {row.validation.errors.length} error{row.validation.errors.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="no-errors">—</span>
                    )}
                  </td>
                  <td className="product-cell">
                    {row.meta.importOutcome === 'skipped_validation_error' ? (
                      <span className="blocked-badge">Blocked by validation</span>
                    ) : row.meta.importOutcome === 'created' ? (
                      row.meta.productId ? (
                        <Link to={`/products/${row.meta.productId}`} className="product-link created">
                          View Product (Created) →
                        </Link>
                      ) : (
                        <span className="no-product">—</span>
                      )
                    ) : row.meta.importOutcome === 'updated' ? (
                      row.meta.productId ? (
                        <Link to={`/products/${row.meta.productId}`} className="product-link updated">
                          View Product (Updated) →
                        </Link>
                      ) : (
                        <span className="no-product">—</span>
                      )
                    ) : row.meta.productId ? (
                      <Link to={`/products/${row.meta.productId}`} className="product-link">
                        View Product →
                      </Link>
                    ) : (
                      <span className="no-product">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRows.length === 0 && (
            <div className="no-rows">
              No rows match the selected filter.
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default ImportBatchDetailPage;
