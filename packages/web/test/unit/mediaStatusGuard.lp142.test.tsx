/**
 * LP-importer-mapping-recon-1.4.2 — Media Status Guard Tests
 * 
 * Verify that unknown media_status values do not crash the UI components.
 * The defensive fallback should use the 'missing' status configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import ProductHeader from '../../src/components/product/ProductHeader';
import LaunchMediaTab from '../../src/components/product/LaunchMediaTab';

// Mock the useAttributeRegistry hook for LaunchMediaTab
vi.mock('../../src/hooks/useAttributeRegistry', () => ({
  useAttributeRegistry: () => ({
    getAttributeById: () => undefined,
  }),
}));

describe('LP-1.4.2: Media Status Guard', () => {
  const mockOnSave = vi.fn();
  const mockOnPublish = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ProductHeader', () => {
    it('renders without crash when media_status is a known value (complete)', () => {
      const product = {
        id: 'TEST-1',
        sku: 'TEST-SKU',
        name: 'Test Product',
        status: 'draft',
        media_status: 'complete',
        websites: [],
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

      // Should show "Media present" label
      expect(screen.getByLabelText('Media present')).toBeInTheDocument();
    });

    it('renders without crash when media_status is undefined (fallback to missing)', () => {
      const product = {
        id: 'TEST-2',
        sku: 'TEST-SKU',
        name: 'Test Product',
        status: 'draft',
        // media_status: undefined
        websites: [],
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

      // Should show "No media uploaded" label (fallback)
      expect(screen.getByLabelText('No media uploaded')).toBeInTheDocument();
    });

    it('renders without crash when media_status is an unknown string (LP-1.4.2 fix)', () => {
      const product = {
        id: 'TEST-3',
        sku: 'TEST-SKU',
        name: 'Test Product',
        status: 'draft',
        media_status: 'sdfsdfgdf-23rcwsdf34-sdf34r-', // Unknown garbage value
        websites: [],
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

      // Should fallback to "No media uploaded" label
      expect(screen.getByLabelText('No media uploaded')).toBeInTheDocument();
    });

    it('applies correct CSS class for unknown media_status (fallback to missing)', () => {
      const product = {
        id: 'TEST-4',
        sku: 'TEST-SKU',
        name: 'Test Product',
        status: 'draft',
        media_status: 'some-random-unknown-value',
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

      // Should have the missing status class
      const mediaStatusElement = container.querySelector('.media-status--missing');
      expect(mediaStatusElement).toBeInTheDocument();
    });
  });

  describe('LaunchMediaTab', () => {
    const baseProduct = {
      id: 'TEST-1',
      sku: 'TEST-SKU',
      name: 'Test Product',
      status: 'draft',
      websites: [],
      media: { gallery: [] },
    } as any;

    it('renders without crash when media_status is a known value (partial)', () => {
      const product = {
        ...baseProduct,
        media_status: 'partial',
      };

      expect(() => {
        render(<LaunchMediaTab product={product} onUpdate={mockOnUpdate} />);
      }).not.toThrow();
    });

    it('renders without crash when media_status is undefined (fallback to missing)', () => {
      const product = {
        ...baseProduct,
        // media_status: undefined
      };

      expect(() => {
        render(<LaunchMediaTab product={product} onUpdate={mockOnUpdate} />);
      }).not.toThrow();
    });

    it('renders without crash when media_status is an unknown string (LP-1.4.2 fix)', () => {
      const product = {
        ...baseProduct,
        media_status: 'xyz-unknown-garbage-status-12345',
      };

      expect(() => {
        render(<LaunchMediaTab product={product} onUpdate={mockOnUpdate} />);
      }).not.toThrow();
    });

    it('uses fallback className for unknown media_status', () => {
      const product = {
        ...baseProduct,
        media_status: 'totally-unknown-status',
      };

      const { container } = render(
        <LaunchMediaTab product={product} onUpdate={mockOnUpdate} />
      );

      // Should have the missing status class applied
      const mediaStatusElement = container.querySelector('.media-status--missing');
      expect(mediaStatusElement).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('ProductHeader handles empty string media_status', () => {
      const product = {
        id: 'TEST-EDGE-1',
        sku: 'TEST-SKU',
        name: 'Test Product',
        status: 'draft',
        media_status: '',
        websites: [],
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

    it('LaunchMediaTab handles numeric-like string media_status', () => {
      const product = {
        id: 'TEST-EDGE-2',
        sku: 'TEST-SKU',
        name: 'Test Product',
        status: 'draft',
        media_status: '12345',
        websites: [],
        media: { gallery: [] },
      } as any;

      expect(() => {
        render(<LaunchMediaTab product={product} onUpdate={mockOnUpdate} />);
      }).not.toThrow();
    });
  });
});
