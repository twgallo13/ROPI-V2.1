/**
 * AIWorkflowPanel Description Update Test
 * Verify that handleDescriptionUpdate persists to Firestore with canonical schema
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AIWorkflowPanel from '../components/ProductEditorV2/AIWorkflowPanel';

// Use vi.hoisted() to define mocks that can be used in vi.mock factory functions
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
  doc: (...args: any[]) => {
    mockDoc(...args);
    return { path: args.slice(1).join('/') };
  },
  setDoc: mockSetDoc,
}));

// Mock schema adapter
vi.mock('../utils/schemaAdapter', () => ({
  newToLegacy: (product: any) => {
    mockNewToLegacy(product);
    return {
      ...product,
      description: product.descriptive?.description,
      metaName: product.descriptive?.metaName,
      metaDescription: product.descriptive?.metaDescription,
      keywords: product.descriptive?.keywords,
    };
  },
  stripUndefined: (obj: any) => {
    mockStripUndefined(obj);
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  },
}));

// Mock child panels
vi.mock('../components/ProductEditorV2/SmartDetectPanel', () => ({
  default: ({ onApplySuggestion, onApplyAll }: any) => (
    <div data-testid="smart-detect-panel">
      <button onClick={() => onApplySuggestion('sku_core.department', 'Footwear')}>
        Apply Single
      </button>
      <button onClick={() => onApplyAll([])}>Apply All</button>
    </div>
  ),
}));

vi.mock('../components/ProductEditorV2/ValidationPanel', () => ({
  default: ({ onIssueClick }: any) => (
    <div data-testid="validation-panel">
      <button onClick={() => onIssueClick({ fieldPath: 'sku_core.brand' })}>
        Click Issue
      </button>
    </div>
  ),
}));

vi.mock('../components/ProductEditorV2/DescriptionPanel', () => ({
  default: ({ onDescriptionUpdate }: any) => (
    <div data-testid="description-panel">
      <button
        onClick={() =>
          onDescriptionUpdate('Test description content', {
            title: 'Test SEO Title',
            metaDescription: 'Test meta description',
            keywords: ['test', 'keywords'],
          })
        }
      >
        Apply Description
      </button>
    </div>
  ),
}));

describe('AIWorkflowPanel - Description Update Persistence', () => {
  const mockProductData = {
    id: 'TEST-PRODUCT-001',
    sku_core: {
      mpn: 'TEST-001',
      brand: 'Nike',
      name: 'Test Shoe',
      department: 'Footwear',
      class: 'Athletic',
      category: 'Basketball',
      styleId: 'TEST-PRODUCT-001',
    },
    descriptive: {
      ageGroup: 'Adult',
      gender: "Men's",
      material: ['Leather', 'Mesh'],
      primaryColor: 'Black',
    },
    ai: {},
  };

  const mockOnProductUpdate = vi.fn();
  const mockOnClose = vi.fn();
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render AIWorkflowPanel and call handleDescriptionUpdate', async () => {
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

    // Panel should render
    expect(screen.getByTestId('description-panel')).toBeInTheDocument();

    // Find and click the Apply Description button
    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    // Wait for async operations
    await waitFor(() => {
      expect(mockOnProductUpdate).toHaveBeenCalled();
    });
  });

  it('should call onProductUpdate with nested descriptive and ai updates', async () => {
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

    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockOnProductUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          descriptive: expect.objectContaining({
            description: 'Test description content',
            metaName: 'Test SEO Title',
            metaDescription: 'Test meta description',
            keywords: ['test', 'keywords'],
          }),
          ai: expect.objectContaining({
            descriptionHtml: 'Test description content',
          }),
        })
      );
    });
  });

  it('should call setDoc with newToLegacy(mergedProduct) for Firestore persistence', async () => {
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

    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    await waitFor(() => {
      // Verify doc() was called with correct path
      expect(mockDoc).toHaveBeenCalledWith(
        expect.anything(), // db
        'products',
        'TEST-PRODUCT-001'
      );

      // Verify setDoc was called
      expect(mockSetDoc).toHaveBeenCalled();
      
      // Verify setDoc was called with merge: true
      const setDocCall = mockSetDoc.mock.calls[0];
      expect(setDocCall[2]).toEqual({ merge: true });
    });
  });

  it('should call newToLegacy with merged product data', async () => {
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

    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockNewToLegacy).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'TEST-PRODUCT-001',
          descriptive: expect.objectContaining({
            description: 'Test description content',
            metaName: 'Test SEO Title',
            metaDescription: 'Test meta description',
          }),
          ai: expect.objectContaining({
            descriptionHtml: 'Test description content',
          }),
        })
      );
    });
  });

  it('should call stripUndefined before Firestore write', async () => {
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

    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockStripUndefined).toHaveBeenCalled();
    });
  });

  it('should show success toast after successful save', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);

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

    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Saved', 'success');
    });
  });

  it('should show error toast on save failure', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Firestore error'));

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

    const applyButton = screen.getByText('Apply Description');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Save failed', 'error');
    });
  });
});
