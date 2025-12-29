/**
 * Product Header Date Display Tests — LP-1.4.6.7
 * 
 * Tests for the header fallback logic that displays last_received from:
 * 1. attributes.last_received (normalized ISO)
 * 2. core last_received field (vendor format)
 * 3. Empty state when both absent
 * 
 * @see packages/web/src/components/product/ProductHeader.tsx
 * @see HOMER_LP-1.4.6.7_HES.md
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProductHeader from '../ProductHeader';
import type { Product } from '../../../types/product';

// Minimal product mock for header testing
const createProductMock = (overrides?: Partial<Product>): Product => ({
  id: 'test-product-id',
  sku: 'TEST-SKU',
  mpn: 'TEST-MPN',
  status: 'draft',
  product_is_active: true,
  total_inv: 0,
  warehouse_inv: 0,
  store_inv: 0,
  media_status: 'missing',
  websites: [],
  ...overrides,
} as Product);

const mockHandlers = {
  onSave: () => {},
  onPublish: () => {},
  onBack: () => {},
};

describe('ProductHeader - Last Received Display', () => {
  it('should display date from attributes.last_received (ISO format)', () => {
    const product = createProductMock({
      attributes: {
        last_received: '2025-12-18T00:00:00.000Z',
      },
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('2025-12-18');
  });

  it('should display date from core last_received when attributes absent (vendor format)', () => {
    const product = createProductMock({
      last_received: '12/18/2025',
      attributes: undefined,
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('2025-12-18');
  });

  it('should prefer attributes.last_received over core field', () => {
    const product = createProductMock({
      last_received: '12/26/2025', // vendor format in core
      attributes: {
        last_received: '2025-12-18T00:00:00.000Z', // ISO in attributes
      },
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    // Should display attributes value, not core
    expect(lastReceivedElement).toHaveTextContent('2025-12-18');
  });

  it('should display "—" when both attributes and core last_received are absent', () => {
    const product = createProductMock({
      last_received: undefined,
      attributes: undefined,
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('—');
  });

  it('should display "—" when last_received is unparseable', () => {
    const product = createProductMock({
      attributes: {
        last_received: 'invalid-date-string',
      },
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('—');
  });

  it('should handle two-digit year vendor format (12/18/25)', () => {
    const product = createProductMock({
      last_received: '12/18/25',
      attributes: undefined,
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('2025-12-18');
  });

  it('should handle hyphen-separated vendor format (12-18-2025)', () => {
    const product = createProductMock({
      last_received: '12-18-2025',
      attributes: undefined,
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('2025-12-18');
  });

  it('should display "—" when attributes.last_received is empty string', () => {
    const product = createProductMock({
      attributes: {
        last_received: '',
      },
    });

    render(<ProductHeader product={product} {...mockHandlers} />);

    const lastReceivedElement = screen.getByTestId('header-last-received');
    expect(lastReceivedElement).toHaveTextContent('—');
  });
});
