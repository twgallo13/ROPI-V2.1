/**
 * Import Batch Detail Page Tests
 * Tests View Product links and importOutcome display
 */

import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ImportBatchDetailPage } from '../src/pages/ImportBatchDetailPage';
import type { ImportBatch, ImportEngineRow } from '@ropi-aoss/sdk';

const mockBatch: ImportBatch = {
  batchId: 'test-batch-001',
  fileName: 'test.csv',
  createdAt: '2025-01-15T12:00:00Z',
  createdBy: 'user-123',
  rowCount: 3,
  status: 'processed',
  createdCount: 1,
  updatedCount: 1,
  blockedCount: 1,
  processedAt: '2025-01-15T12:05:00Z',
  processedBy: 'user-123',
};

const mockRows: ImportEngineRow[] = [
  {
    rowId: 'row-created',
    batchId: 'test-batch-001',
    source: { columns: { SKU: 'CREATED-001' }, lineNumber: 1 },
    normalized: { sku: 'CREATED-001', title: 'Created Product', brand: 'Brand' },
    validation: { isValid: true, errors: [], warnings: [] },
    meta: {
      rowId: 'row-created',
      batchId: 'test-batch-001',
      productId: 'created-001',
      importedAt: '2025-01-15T12:01:00Z',
      importedBy: 'user-123',
      status: 'completed',
      importOutcome: 'created',
    },
  },
  {
    rowId: 'row-updated',
    batchId: 'test-batch-001',
    source: { columns: { SKU: 'UPDATED-001' }, lineNumber: 2 },
    normalized: { sku: 'UPDATED-001', title: 'Updated Product', brand: 'Brand' },
    validation: { isValid: true, errors: [], warnings: [] },
    meta: {
      rowId: 'row-updated',
      batchId: 'test-batch-001',
      productId: 'updated-001',
      importedAt: '2025-01-15T12:02:00Z',
      importedBy: 'user-123',
      status: 'completed',
      importOutcome: 'updated',
    },
  },
  {
    rowId: 'row-blocked',
    batchId: 'test-batch-001',
    source: { columns: { SKU: '' }, lineNumber: 3 },
    normalized: {},
    validation: {
      isValid: false,
      errors: [{ code: 'MISSING_REQUIRED_FIELD', severity: 'error', field: 'sku', message: 'SKU required' }],
      warnings: [],
    },
    meta: {
      rowId: 'row-blocked',
      batchId: 'test-batch-001',
      productId: 'blocked-001',
      importedAt: '2025-01-15T12:03:00Z',
      importedBy: 'user-123',
      status: 'failed',
      importOutcome: 'skipped_validation_error',
    },
  },
];

let getDocMock: ReturnType<typeof vi.fn>;
let getDocsMock: ReturnType<typeof vi.fn>;

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getFirestore: vi.fn(() => ({} as any)),
}));

vi.mock('@/contexts/AuthProvider', () => ({
  useAuth: () => ({
    currentUser: {
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
    },
    isAdmin: true,
  }),
}));

describe('ImportBatchDetailPage', () => {
  beforeEach(() => {
    getDocMock = vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => mockBatch,
    });

    getDocsMock = vi.fn().mockResolvedValue({
      docs: mockRows.map(row => ({
        id: row.rowId,
        data: () => row,
      })),
    });

    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useParams: () => ({ batchId: 'test-batch-001' }),
      };
    });
  });

  it('should render commit counters', async () => {
    render(
      <BrowserRouter>
        <ImportBatchDetailPage />
      </BrowserRouter>
    );

    const createdLabel = await screen.findByText(/Products Created/i);
    expect(createdLabel.previousElementSibling).toHaveTextContent('1');

    const updatedLabel = await screen.findByText(/Products Updated/i);
    expect(updatedLabel.previousElementSibling).toHaveTextContent('1');

    const blockedLabel = await screen.findByText(/Rows Blocked/i);
    expect(blockedLabel.previousElementSibling).toHaveTextContent('1');
  });

  it('should show "View Product (Created)" link for created rows', async () => {
    getDocsMock = vi.fn().mockResolvedValue({
      docs: [
        {
          id: mockRows[0].rowId,
          data: () => mockRows[0],
        },
      ],
    });

    render(
      <BrowserRouter>
        <ImportBatchDetailPage />
      </BrowserRouter>
    );

    const link = await screen.findByText(/View Product \(Created\)/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/products/created-001');
  });

  it('should show "View Product (Updated)" link for updated rows', async () => {
    getDocsMock = vi.fn().mockResolvedValue({
      docs: [
        {
          id: mockRows[1].rowId,
          data: () => mockRows[1],
        },
      ],
    });

    render(
      <BrowserRouter>
        <ImportBatchDetailPage />
      </BrowserRouter>
    );

    const link = await screen.findByText(/View Product \(Updated\)/i);
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/products/updated-001');
  });

  it('should show "Blocked by validation" for blocked rows', async () => {
    getDocsMock = vi.fn().mockResolvedValue({
      docs: [
        {
          id: mockRows[2].rowId,
          data: () => mockRows[2],
        },
      ],
    });

    render(
      <BrowserRouter>
        <ImportBatchDetailPage />
      </BrowserRouter>
    );

    const blockedLabel = await screen.findByText(/Blocked by validation/i);
    expect(blockedLabel).toBeInTheDocument();
    expect(screen.queryByText(/View Product/i)).not.toBeInTheDocument();
  });

  it('should display all three outcome types correctly', async () => {
    render(
      <BrowserRouter>
        <ImportBatchDetailPage />
      </BrowserRouter>
    );

    expect(await screen.findByText(/View Product \(Created\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/View Product \(Updated\)/i)).toBeInTheDocument();
    expect(await screen.findByText(/Blocked by validation/i)).toBeInTheDocument();
  });
});
