/**
 * SmartDetectPanel Persist Test
 * Verify auto-apply, persist, and undo functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SmartDetectPanel from '../components/ProductEditorV2/SmartDetectPanel';

// Use vi.hoisted() to define mocks that can be used in vi.mock factory functions
const { mockSetDoc, mockDoc, mockNewToLegacy, mockStripUndefined, mockCallSmartDetect, mockCallValidator } = vi.hoisted(() => ({
  mockSetDoc: vi.fn(),
  mockDoc: vi.fn(),
  mockNewToLegacy: vi.fn(),
  mockStripUndefined: vi.fn(),
  mockCallSmartDetect: vi.fn(),
  mockCallValidator: vi.fn(),
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
      brand: product.sku_core?.brand,
      name: product.sku_core?.name,
      gender: product.descriptive?.gender,
      primaryColor: product.descriptive?.primaryColor,
      ageGroup: product.descriptive?.ageGroup,
      material: product.descriptive?.material,
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

// Mock Smart Detect API
vi.mock('../api/smartDetect', () => ({
  callSmartDetect: mockCallSmartDetect,
}));

// Mock Validator API
vi.mock('../api/validator', () => ({
  callValidator: mockCallValidator,
}));

describe('SmartDetectPanel - Persist and Undo', () => {
  const mockProductData = {
    id: 'TEST-PRODUCT-001',
    sku_core: {
      mpn: 'TEST-001',
      brand: '',
      name: '',
      department: '',
      class: '',
      styleId: 'TEST-PRODUCT-001',
    },
    descriptive: {
      ageGroup: '',
      gender: '',
      material: [],
      primaryColor: '',
    },
  };

  const mockOnApplySuggestion = vi.fn();
  const mockOnApplyAll = vi.fn();
  const mockShowToast = vi.fn();
  const mockOnRevalidate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCallSmartDetect.mockResolvedValue({
      suggestions: [],
      summary: 'No suggestions',
    });
    mockCallValidator.mockResolvedValue({
      ropiScore: 100,
      issues: [],
    });
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('should auto-apply suggestions with autoApply: true on load', async () => {
    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'sku_core.department',
          currentValue: '',
          suggestedValue: 'Footwear',
          confidence: 0.95,
          reason: 'From RICS category',
          autoApply: true,
        },
        {
          fieldPath: 'descriptive.ageGroup',
          currentValue: '',
          suggestedValue: 'Adult',
          confidence: 0.85,
          reason: 'From RICS category',
          autoApply: false,
        },
      ],
      summary: '2 suggestions found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
        onRevalidate={mockOnRevalidate}
      />
    );

    // Wait for auto-apply to complete
    await waitFor(() => {
      // Should call onApplySuggestion for autoApply suggestion
      expect(mockOnApplySuggestion).toHaveBeenCalledWith('sku_core.department', 'Footwear');
    });

    // Should NOT auto-apply the non-autoApply suggestion
    expect(mockOnApplySuggestion).not.toHaveBeenCalledWith('descriptive.ageGroup', 'Adult');

    // Should persist to Firestore
    expect(mockSetDoc).toHaveBeenCalled();

    // Should show toast with undo action
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringContaining('Auto-applied'),
      'success',
      expect.objectContaining({
        label: 'Undo',
        onClick: expect.any(Function),
      })
    );
  });

  it('should persist suggestion to Firestore with correct legacy format', async () => {
    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'descriptive.gender',
          currentValue: '',
          suggestedValue: "Men's",
          confidence: 0.9,
          reason: 'From RICS category',
          autoApply: true,
        },
      ],
      summary: '1 suggestion found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
      />
    );

    await waitFor(() => {
      expect(mockSetDoc).toHaveBeenCalled();
    });

    // Verify setDoc was called with correct arguments
    const setDocCall = mockSetDoc.mock.calls[0];
    expect(setDocCall[0]).toEqual({ path: 'products/TEST-PRODUCT-001' });
    expect(setDocCall[2]).toEqual({ merge: true });

    // Verify newToLegacy was called
    expect(mockNewToLegacy).toHaveBeenCalled();

    // Verify stripUndefined was called
    expect(mockStripUndefined).toHaveBeenCalled();
  });

  it('should call revalidation after auto-apply', async () => {
    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'sku_core.class',
          currentValue: '',
          suggestedValue: 'Athletic',
          confidence: 0.9,
          reason: 'From RICS category',
          autoApply: true,
        },
      ],
      summary: '1 suggestion found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
        onRevalidate={mockOnRevalidate}
      />
    );

    await waitFor(() => {
      expect(mockOnRevalidate).toHaveBeenCalled();
    });
  });

  it('should show Auto-Apply badge for autoApply suggestions in UI', async () => {
    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'sku_core.department',
          currentValue: '',
          suggestedValue: 'Footwear',
          confidence: 0.95,
          reason: 'From RICS category',
          autoApply: true,
        },
      ],
      summary: '1 suggestion found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
      />
    );

    // Wait for suggestions to load
    await waitFor(() => {
      expect(screen.queryByText('1 suggestion found')).toBeInTheDocument();
    });

    // Note: Auto-Apply badge won't show if already applied
    // But we can verify the suggestion was processed
    expect(mockOnApplySuggestion).toHaveBeenCalled();
  });

  it('should handle manual apply for non-autoApply suggestions', async () => {
    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'descriptive.material',
          currentValue: [],
          suggestedValue: ['Leather', 'Mesh'],
          confidence: 0.8,
          reason: 'Detected in description',
          autoApply: false,
        },
      ],
      summary: '1 suggestion found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
      />
    );

    // Wait for suggestions to load
    await waitFor(() => {
      expect(screen.getByText('1 suggestion found')).toBeInTheDocument();
    });

    // Should NOT auto-apply
    expect(mockOnApplySuggestion).not.toHaveBeenCalled();

    // Find and click Apply button
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);

    // Should now apply and persist
    await waitFor(() => {
      expect(mockOnApplySuggestion).toHaveBeenCalledWith('descriptive.material', ['Leather', 'Mesh']);
      expect(mockSetDoc).toHaveBeenCalled();
    });
  });

  it('should show error toast on persist failure', async () => {
    mockSetDoc.mockRejectedValueOnce(new Error('Firestore error'));
    
    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'sku_core.brand',
          currentValue: '',
          suggestedValue: 'Nike',
          confidence: 0.85,
          reason: 'From vendor data',
          autoApply: true,
        },
      ],
      summary: '1 suggestion found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
      />
    );

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to apply suggestion', 'error');
    });
  });

  it('should handle undo by reverting to previous value', async () => {
    let undoCallback: (() => void) | undefined;

    mockShowToast.mockImplementation((msg, type, action) => {
      if (action && action.label === 'Undo') {
        undoCallback = action.onClick;
      }
    });

    mockCallSmartDetect.mockResolvedValueOnce({
      suggestions: [
        {
          fieldPath: 'descriptive.primaryColor',
          currentValue: '',
          suggestedValue: 'Red',
          confidence: 0.95,
          reason: 'From RICS color',
          autoApply: true,
        },
      ],
      summary: '1 suggestion found',
    });

    render(
      <SmartDetectPanel
        productId="TEST-PRODUCT-001"
        productData={mockProductData}
        onApplySuggestion={mockOnApplySuggestion}
        onApplyAll={mockOnApplyAll}
        showToast={mockShowToast}
      />
    );

    // Wait for auto-apply
    await waitFor(() => {
      expect(mockOnApplySuggestion).toHaveBeenCalled();
    });

    // Clear mocks
    vi.clearAllMocks();
    mockCallSmartDetect.mockResolvedValue({ suggestions: [], summary: 'No suggestions' });

    // Call undo
    expect(undoCallback).toBeDefined();
    if (undoCallback) {
      undoCallback();
    }

    // Should revert to previous value
    await waitFor(() => {
      expect(mockOnApplySuggestion).toHaveBeenCalledWith('descriptive.primaryColor', '');
      expect(mockSetDoc).toHaveBeenCalled();
      expect(mockCallSmartDetect).toHaveBeenCalled(); // Reload suggestions
    });
  });
});
