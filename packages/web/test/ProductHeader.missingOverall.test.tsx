/**
 * ProductHeader Missing Overall Tests
 * LP-3.0.2: Test that ProductHeader renders without errors
 * when product is missing fields like websites, exportReadiness, etc.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProductHeader from '../src/components/product/ProductHeader';

describe('ProductHeader with missing fields (LP-3.0.2)', () => {
  const mockOnSave = vi.fn();
  const mockOnPublish = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without throwing when websites is undefined', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      // websites: undefined - intentionally missing
      exportReadiness: { overall: 50, byWebsite: {} },
    } as any;

    expect(() => {
      render(
        <ProductHeader
          product={product}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
        />
      );
    }).not.toThrow();
  });

  it('renders without throwing when exportReadiness is undefined', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: ['shiekh.com'],
      // exportReadiness: undefined - intentionally missing
    } as any;

    expect(() => {
      render(
        <ProductHeader
          product={product}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
        />
      );
    }).not.toThrow();
  });

  it('renders without throwing when brand and category are undefined', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: [],
      exportReadiness: { overall: 0, byWebsite: {} },
      // brand: undefined - intentionally missing
      // category: undefined - intentionally missing
    } as any;

    const { container } = render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    // Should show N/A for missing brand/category
    expect(container.textContent).toContain('N/A');
  });

  it('displays SKU and name correctly', () => {
    const product = {
      id: 'TEST-1',
      sku: 'MY-SKU-123',
      name: 'My Product Name',
      status: 'draft',
      websites: [],
      exportReadiness: { overall: 75, byWebsite: {} },
    } as any;

    render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('MY-SKU-123')).toBeInTheDocument();
    expect(screen.getByText('My Product Name')).toBeInTheDocument();
  });

  it('renders website chips when websites array is provided', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: ['shiekh.com', 'example.com'],
      exportReadiness: { overall: 50, byWebsite: {} },
    } as any;

    render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText('shiekh.com')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('disables Publish button when exportReadiness.overall < 80', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: [],
      exportReadiness: { overall: 79, byWebsite: {} },
    } as any;

    render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    const publishButton = screen.getByText('Publish');
    expect(publishButton).toBeDisabled();
  });

  it('enables Publish button when exportReadiness.overall >= 80', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: [],
      exportReadiness: { overall: 80, byWebsite: {} },
    } as any;

    render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    const publishButton = screen.getByText('Publish');
    expect(publishButton).not.toBeDisabled();
  });

  it('calls onBack when back button is clicked', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: [],
      exportReadiness: { overall: 50, byWebsite: {} },
    } as any;

    render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    fireEvent.click(screen.getByText('← Back to Products'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('renders unknown status when status is invalid', () => {
    const product = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'invalid-status',
      websites: [],
      exportReadiness: { overall: 50, byWebsite: {} },
    } as any;

    const { container } = render(
      <ProductHeader
        product={product}
        onSave={mockOnSave}
        onPublish={mockOnPublish}
        onBack={mockOnBack}
      />
    );

    expect(container.textContent).toContain('Unknown');
  });
});
