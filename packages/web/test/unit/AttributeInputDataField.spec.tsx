/**
 * AttributeInput data-field Attribute Tests
 * 
 * Tests that all attribute inputs have proper data-field and name attributes
 * for scroll-to-field navigation (LP-1.0.2)
 * 
 * Lisa LP-1.0.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductAttributesTab from '../../src/components/product/ProductAttributesTab';
import type { Attribute } from '../../src/hooks/useAttributes';

const mockAttributes: Attribute[] = [
  {
    attribute_id: 'color',
    label: 'Color',
    data_type: 'enum',
    status: 'active',
    allowed_values: ['Red', 'Blue', 'Green'],
  },
  {
    attribute_id: 'size',
    label: 'Size',
    data_type: 'string',
    status: 'active',
  },
  {
    attribute_id: 'is_featured',
    label: 'Is Featured',
    data_type: 'boolean',
    status: 'active',
  },
  {
    attribute_id: 'price',
    label: 'Price',
    data_type: 'currency',
    status: 'active',
  },
  {
    attribute_id: 'release_date',
    label: 'Release Date',
    data_type: 'date',
    status: 'active',
  },
  {
    attribute_id: 'tags',
    label: 'Tags',
    data_type: 'multiSelect',
    status: 'active',
  },
  {
    attribute_id: 'metadata',
    label: 'Metadata',
    data_type: 'json',
    status: 'active',
  },
];

// Mock useAttributeRegistry hook (used by ProductAttributesTab)
vi.mock('../../src/hooks/useAttributeRegistry', () => ({
  useAttributeRegistry: () => ({
    attributes: mockAttributes,
    activeAttributes: mockAttributes,
    requiredAttributes: [],
    loading: false,
    error: null,
    getAttributeById: (id: string) => mockAttributes.find(a => a.attribute_id === id),
    getAttributesByCategory: () => [],
    refresh: vi.fn(),
  }),
}));

// Mock useGlobalLoading hook
vi.mock('../../src/hooks/useGlobalLoading', () => ({
  useGlobalLoading: () => ({
    isLoading: false,
    setLoading: vi.fn(),
    addLoadingSource: vi.fn(),
    removeLoadingSource: vi.fn(),
    loadingSources: new Set(),
    error: null,
    setError: vi.fn(),
    clearError: vi.fn(),
  }),
}));

const mockProduct = {
  id: 'test-product',
  sku: 'TEST-SKU',
  styleId: 'STYLE-001',
  name: 'Test Product',
  brand: 'Test Brand',
  category: 'Shoes',
  department: 'Men',
  subcategory: 'Sneakers',
  firstReceived: '2025-01-01',
  launchDate: '2025-02-01',
  launchStatus: 'scheduled',
  websites: ['shiekh.com'],
  attributes: {
    color: 'Red',
    size: 'Large',
    is_featured: true,
    price: 99.99,
    release_date: '2025-03-01',
    tags: ['new', 'sale'],
    metadata: { key: 'value' },
  },
  skuConfidence: 1,
  exportReady: true,
  created: '2025-01-01T00:00:00Z',
  updated: '2025-01-15T00:00:00Z',
};

describe('AttributeInput data-field attributes (LP-1.0.2)', () => {
  const renderTab = () => {
    return render(
      <BrowserRouter>
        <ProductAttributesTab product={mockProduct as any} onUpdate={vi.fn()} />
      </BrowserRouter>
    );
  };

  it('renders enum input with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-color');
    expect(input).toHaveAttribute('data-field', 'attributes.color');
    expect(input).toHaveAttribute('name', 'attributes.color');
  });

  it('renders string input with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-size');
    expect(input).toHaveAttribute('data-field', 'attributes.size');
    expect(input).toHaveAttribute('name', 'attributes.size');
  });

  it('renders boolean input with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-is_featured');
    expect(input).toHaveAttribute('data-field', 'attributes.is_featured');
    expect(input).toHaveAttribute('name', 'attributes.is_featured');
  });

  it('renders currency input with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-price');
    expect(input).toHaveAttribute('data-field', 'attributes.price');
    expect(input).toHaveAttribute('name', 'attributes.price');
  });

  it('renders date input with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-release_date');
    expect(input).toHaveAttribute('data-field', 'attributes.release_date');
    expect(input).toHaveAttribute('name', 'attributes.release_date');
  });

  it('renders multiSelect input with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-tags');
    expect(input).toHaveAttribute('data-field', 'attributes.tags');
    expect(input).toHaveAttribute('name', 'attributes.tags');
  });

  it('renders json textarea with correct data-field attribute', () => {
    renderTab();
    
    const input = screen.getByTestId('attr-input-metadata');
    expect(input).toHaveAttribute('data-field', 'attributes.metadata');
    expect(input).toHaveAttribute('name', 'attributes.metadata');
  });

  it('all inputs follow canonical key format: attributes.<attribute_id>', () => {
    renderTab();
    
    // Get all inputs with data-field
    const inputs = document.querySelectorAll('[data-field^="attributes."]');
    
    expect(inputs.length).toBeGreaterThan(0);
    
    inputs.forEach((input) => {
      const dataField = input.getAttribute('data-field');
      const name = input.getAttribute('name');
      
      // Verify format: attributes.<attribute_id>
      expect(dataField).toMatch(/^attributes\.[a-z_]+$/);
      
      // Verify name matches data-field
      expect(name).toBe(dataField);
    });
  });

  it('inputs can be queried by data-field selector for scroll-to', () => {
    renderTab();
    
    // Simulate how handleScrollToField finds elements
    const colorInput = document.querySelector('[data-field="attributes.color"]');
    expect(colorInput).toBeInTheDocument();
    expect(colorInput).toBe(screen.getByTestId('attr-input-color'));
    
    const sizeInput = document.querySelector('[data-field="attributes.size"]');
    expect(sizeInput).toBeInTheDocument();
    expect(sizeInput).toBe(screen.getByTestId('attr-input-size'));
  });

  it('inputs can also be queried by name attribute as fallback', () => {
    renderTab();
    
    // Simulate fallback query used by handleScrollToField
    const colorInput = document.querySelector('[name="attributes.color"]');
    expect(colorInput).toBeInTheDocument();
    
    const priceInput = document.querySelector('[name="attributes.price"]');
    expect(priceInput).toBeInTheDocument();
  });
});
