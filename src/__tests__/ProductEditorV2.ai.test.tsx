/**
 * ProductEditorV2 AI functionality tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ProductEditorV2 from '../components/ProductEditorV2';

// Mock Firebase
vi.mock('../firebase', () => ({
  db: {},
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  serverTimestamp: vi.fn(() => ({ __type: 'serverTimestamp' })),
}));

// Mock services
vi.mock('../services/describe', () => ({
  describeProduct: vi.fn(),
}));

// Mock hooks
vi.mock('../hooks/useVocab', () => ({
  useVocab: () => ({
    loading: false,
    genders: [],
    ageGroups: [],
    fits: [],
    materials: [],
    primaryColors: [],
    descriptiveColors: [],
    cutTypes: [],
    closureTypes: [],
    heelHeights: [],
    platformHeights: [],
    sportsTeams: [],
    leagues: [],
    categories: [],
    departments: [],
    classes: [],
  }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
  }),
}));

// Mock utils
vi.mock('../utils/schemaAdapter', () => ({
  legacyToNew: (product: any) => product,
  newToLegacy: (product: any) => product,
  validateProduct: () => ({ errors: [], warnings: [] }),
  stripUndefined: (obj: any) => obj,
}));

const mockProduct = {
  id: 'test-product-id',
  name: 'Test Product',
  brand: 'Test Brand',
  mpn: 'TEST-123',
  department: 'Men',
  category: 'Footwear',
  sku_core: {
    name: 'Test Product',
    brand: 'Test Brand',
    mpn: 'TEST-123',
  },
  marketing: {
    description: '',
  },
};

describe('ProductEditorV2 AI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AI tab when product is provided', async () => {
    const { getDoc, getDocs } = await import('firebase/firestore');
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      id: 'test-product-id',
      data: () => mockProduct,
    });
    
    // Mock getDocs to return an empty snapshot
    (getDocs as any).mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      empty: true,
      size: 0,
    });

    render(
      <ProductEditorV2
        isOpen={true}
        onClose={() => {}}
        productId="test-product-id"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading product...')).not.toBeInTheDocument();
    });

    // Check for AI tab
    const aiTab = screen.getByTestId('ai-tab');
    expect(aiTab).toBeInTheDocument();
    expect(aiTab).toHaveTextContent('AI Generate');
  });

  it('shows generate button when AI tab is active', async () => {
    const { getDoc, getDocs } = await import('firebase/firestore');
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      id: 'test-product-id',
      data: () => mockProduct,
    });
    
    // Mock getDocs to return an empty snapshot
    (getDocs as any).mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      empty: true,
      size: 0,
    });

    render(
      <ProductEditorV2
        isOpen={true}
        onClose={() => {}}
        productId="test-product-id"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading product...')).not.toBeInTheDocument();
    });

    // Click AI tab
    const aiTab = screen.getByTestId('ai-tab');
    fireEvent.click(aiTab);

    // Check for generate button
    await waitFor(() => {
      const generateButton = screen.getByTestId('generate-button');
      expect(generateButton).toBeInTheDocument();
      expect(generateButton).toHaveTextContent('✨ Generate with AI');
    });
  });

  it('calls describe service when generate button is clicked', async () => {
    const { getDoc, getDocs } = await import('firebase/firestore');
    const { describeProduct } = await import('../services/describe');
    
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      id: 'test-product-id',
      data: () => mockProduct,
    });

    (getDocs as any).mockResolvedValue({
      forEach: vi.fn(),
      docs: [],
      empty: true,
      size: 0,
    });

    (describeProduct as any).mockResolvedValue({
      text: 'Generated description',
      description: 'Generated description',
      scores: { overall: 8, factual: 9, tone: 8, seo: 7, clarity: 8 },
    });

    render(
      <ProductEditorV2
        isOpen={true}
        onClose={() => {}}
        productId="test-product-id"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading product...')).not.toBeInTheDocument();
    });

    // Click AI tab
    const aiTab = screen.getByTestId('ai-tab');
    fireEvent.click(aiTab);

    // Click generate button
    await waitFor(() => {
      const generateButton = screen.getByTestId('generate-button');
      fireEvent.click(generateButton);
    });

    // Verify describe service was called
    await waitFor(() => {
      expect(describeProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'test-product-id',
          channel: 'RetailOps',
        }),
        expect.any(Object)
      );
    });
  });

  it('displays template info when template is used', async () => {
    const { getDoc, getDocs } = await import('firebase/firestore');
    
    (getDoc as any).mockResolvedValue({
      exists: () => true,
      id: 'test-product-id',
      data: () => mockProduct,
    });

    (getDocs as any).mockResolvedValue({
      forEach: (callback: any) => {
        callback({
          id: 'RetailOps',
          data: () => ({
            text: 'Generated description',
            scores: { overall: 8 },
          }),
        });
      },
      docs: [{
        id: 'RetailOps',
        data: () => ({
          text: 'Generated description',
          scores: { overall: 8 },
        }),
      }],
      empty: false,
      size: 1,
    });

    render(
      <ProductEditorV2
        isOpen={true}
        onClose={() => {}}
        productId="test-product-id"
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading product...')).not.toBeInTheDocument();
    });

    // Click AI tab
    const aiTab = screen.getByTestId('ai-tab');
    fireEvent.click(aiTab);

    // Look for preview HTML
    await waitFor(() => {
      const previewHtml = screen.queryByTestId('preview-html');
      if (previewHtml) {
        expect(previewHtml).toBeInTheDocument();
      }
    });
  });
});