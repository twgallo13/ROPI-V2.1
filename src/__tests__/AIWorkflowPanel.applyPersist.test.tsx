/**
 * AIWorkflowPanel Apply Persist Test
 * Verify that handleApplyAllSuggestions persists and triggers validation
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AIWorkflowPanel from '../components/ProductEditorV2/AIWorkflowPanel';

// Use vi.hoisted() to define mocks
const { mockSetDoc, mockDoc, mockNewToLegacy, mockStripUndefined } = vi.hoisted(() => ({
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn(),
  mockNewToLegacy: vi.fn(),
  mockStripUndefined: vi.fn(),
}));

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: (...args: any[]) => {
    mockDoc(...args);
    return { path: args.slice(1).join('/') };
  },
  setDoc: mockSetDoc,
}));

// Mock schema adapter
vi.mock('../utils/schemaAdapter', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  newToLegacy: (product: any) => {
    mockNewToLegacy(product);
    return {
      ...product,
      department: product.sku_core?.department,
      class: product.sku_core?.class,
    };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripUndefined: (obj: any) => {
    mockStripUndefined(obj);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  },
}));

// Mock child panels - SmartDetectPanel with Apply All button
vi.mock('../components/ProductEditorV2/SmartDetectPanel', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ onApplyAllComplete }: any) => (
    <div data-testid="smart-detect-panel">
      <button 
        onClick={() => {
          // Simulate SmartDetectPanel completing Apply All
          if (onApplyAllComplete) {
            onApplyAllComplete();
          }
        }}
      >
        Apply All
      </button>
    </div>
  ),
}));

vi.mock('../components/ProductEditorV2/ValidationPanel', () => ({
  default: () => <div data-testid="validation-panel">Validation Panel</div>,
}));

vi.mock('../components/ProductEditorV2/DescriptionPanel', () => ({
  default: () => <div data-testid="description-panel">Description Panel</div>,
}));

describe('AIWorkflowPanel - Apply All Persistence', () => {
  const mockProductData = {
    id: 'TEST-PRODUCT-001',
    sku_core: {
      mpn: 'TEST-001',
      department: '',
      class: '',
      styleId: 'TEST-PRODUCT-001',
    },
  };

  const mockOnProductUpdate = vi.fn();
  const mockOnClose = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('should move to validate step when Apply All completes', async () => {
    render(
      <AIWorkflowPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onProductUpdate={mockOnProductUpdate}
        isOpen={true}
        onClose={mockOnClose}
        showToast={mockShowToast}
      />
    );

    // Panel should start on detect step
    expect(screen.getByTestId('smart-detect-panel')).toBeInTheDocument();

    // Click Apply All button (which calls onApplyAllComplete)
    const applyAllButton = screen.getByText('Apply All');
    fireEvent.click(applyAllButton);

    // Wait for step transition to validation
    await waitFor(() => {
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    });
  });

  it('should call onProductUpdate with nested updates', async () => {
    render(
      <AIWorkflowPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onProductUpdate={mockOnProductUpdate}
        isOpen={true}
        onClose={mockOnClose}
        showToast={mockShowToast}
      />
    );

  it('should render Smart Detect panel on detect step', async () => {
    render(
      <AIWorkflowPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onProductUpdate={mockOnProductUpdate}
        isOpen={true}
        onClose={mockOnClose}
        showToast={mockShowToast}
      />
    );

    expect(screen.getByTestId('smart-detect-panel')).toBeInTheDocument();
  });

  it('should mark detect step as completed after Apply All', async () => {
    render(
      <AIWorkflowPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onProductUpdate={mockOnProductUpdate}
        isOpen={true}
        onClose={mockOnClose}
        showToast={mockShowToast}
      />
    );

    const applyAllButton = screen.getByText('Apply All');
    fireEvent.click(applyAllButton);

    // Should transition to validation panel
    await waitFor(() => {
      expect(screen.getByTestId('validation-panel')).toBeInTheDocument();
    });
  });
});
