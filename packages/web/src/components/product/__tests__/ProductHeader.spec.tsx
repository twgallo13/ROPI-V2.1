/**
 * ProductHeader Tests
 * LP-export-unlock-1.0.0
 *
 * Tests publish button gating via canPublish prop (completion.ready).
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProductHeader from '../ProductHeader';
import type { Product } from '../../../types/product';

// Mock CSS import
vi.mock('../ProductHeader.css', () => ({}));
vi.mock('../../../utils/dateUtils', () => ({
  formatForDisplayYYYYMMDD: (date: string) => date || '—',
}));

const mockProduct: Product = {
  id: 'test-product-123',
  sku: 'TEST-SKU-001',
  name: 'Test Product',
  status: 'draft',
  product_is_active: true,
  mpn: 'MPN-001',
  websites: ['ropi-web'],
  media_status: 'complete',
  total_inv: 100,
  warehouse_inv: 80,
  store_inv: 20,
  attributes: {},
};

describe('ProductHeader', () => {
  const mockOnSave = vi.fn();
  const mockOnPublish = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Publish Button - canPublish prop', () => {
    it('should show loading state when publishReadinessLoading is true', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={undefined}
          publishReadinessLoading={true}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      expect(publishButton).toBeDisabled();
      expect(publishButton).toHaveTextContent(/checking/i);
      expect(publishButton).toHaveAttribute('title', 'Checking publish readiness...');
    });

    it('should enable publish when canPublish is true', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={true}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      expect(publishButton).not.toBeDisabled();
      expect(publishButton).toHaveTextContent(/publish/i);
      expect(publishButton).toHaveAttribute('title', 'Publish product');
    });

    it('should disable publish when canPublish is false', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      expect(publishButton).toBeDisabled();
      expect(publishButton).toHaveAttribute('title', 'Publish blocked - completion requirements not met');
    });

    it('should disable publish when canPublish is undefined (not loaded)', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={undefined}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      expect(publishButton).toBeDisabled();
    });

    it('should call onPublish when clicked and enabled', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={true}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      fireEvent.click(publishButton);
      expect(mockOnPublish).toHaveBeenCalledTimes(1);
    });

    it('should not call onPublish when disabled', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      fireEvent.click(publishButton);
      expect(mockOnPublish).not.toHaveBeenCalled();
    });
  });

  describe('Legacy gating removed', () => {
    it('should not reference product.exportReadiness for publish gating', () => {
      // Product with high exportReadiness but canPublish=false should still be disabled
      const productWithHighReadiness: Product = {
        ...mockProduct,
        exportReadiness: { overall: 100, byWebsite: {} },
      };

      render(
        <ProductHeader
          product={productWithHighReadiness}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      // Even with exportReadiness.overall = 100, button should be disabled because canPublish=false
      expect(publishButton).toBeDisabled();
    });

    it('should enable publish based on canPublish regardless of legacy exportReadiness', () => {
      // Product with low exportReadiness but canPublish=true should be enabled
      const productWithLowReadiness: Product = {
        ...mockProduct,
        exportReadiness: { overall: 50, byWebsite: {} },
      };

      render(
        <ProductHeader
          product={productWithLowReadiness}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={true}
          publishReadinessLoading={false}
        />
      );

      const publishButton = screen.getByTestId('publish-button');
      // Even with exportReadiness.overall = 50, button should be enabled because canPublish=true
      expect(publishButton).not.toBeDisabled();
    });
  });

  // LP-export-completion-fix-1.0.0: Tests for guidance banner
  describe('Sites Guidance Banner (LP-export-completion-fix-1.0.0)', () => {
    it('should show guidance banner when blocked due to "No sites selected"', () => {
      const blockingReasons = [
        {
          type: 'REQUIRED_ATTRIBUTE_MISSING',
          severity: 'BLOCKING',
          message: 'No sites selected for product',
        },
      ];

      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
          blockingReasons={blockingReasons}
        />
      );

      const banner = screen.getByTestId('sites-guidance-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/export blocked/i);
      expect(banner).toHaveTextContent(/no sites selected/i);
    });

    it('should not show guidance banner when no blocking reasons', () => {
      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={true}
          publishReadinessLoading={false}
          blockingReasons={[]}
        />
      );

      expect(screen.queryByTestId('sites-guidance-banner')).not.toBeInTheDocument();
    });

    it('should not show guidance banner for non-sites blocking reasons', () => {
      const blockingReasons = [
        {
          type: 'SITE_DESCRIPTION_SEO_MISSING',
          severity: 'BLOCKING',
          message: 'Export blocked for us: Missing required Description/SEO attributes',
        },
      ];

      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
          blockingReasons={blockingReasons}
        />
      );

      expect(screen.queryByTestId('sites-guidance-banner')).not.toBeInTheDocument();
    });

    it('should show "Select Sites" button when onSelectSites callback provided', () => {
      const mockOnSelectSites = vi.fn();
      const blockingReasons = [
        {
          type: 'REQUIRED_ATTRIBUTE_MISSING',
          severity: 'BLOCKING',
          message: 'No sites selected for product',
        },
      ];

      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
          blockingReasons={blockingReasons}
          onSelectSites={mockOnSelectSites}
        />
      );

      const selectSitesButton = screen.getByTestId('select-sites-button');
      expect(selectSitesButton).toBeInTheDocument();
      expect(selectSitesButton).toHaveTextContent(/select sites/i);
    });

    it('should call onSelectSites when "Select Sites" button clicked', () => {
      const mockOnSelectSites = vi.fn();
      const blockingReasons = [
        {
          type: 'REQUIRED_ATTRIBUTE_MISSING',
          severity: 'BLOCKING',
          message: 'No sites selected for product',
        },
      ];

      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
          blockingReasons={blockingReasons}
          onSelectSites={mockOnSelectSites}
        />
      );

      const selectSitesButton = screen.getByTestId('select-sites-button');
      fireEvent.click(selectSitesButton);
      expect(mockOnSelectSites).toHaveBeenCalledTimes(1);
    });

    it('should not show "Select Sites" button when onSelectSites not provided', () => {
      const blockingReasons = [
        {
          type: 'REQUIRED_ATTRIBUTE_MISSING',
          severity: 'BLOCKING',
          message: 'No sites selected for product',
        },
      ];

      render(
        <ProductHeader
          product={mockProduct}
          onSave={mockOnSave}
          onPublish={mockOnPublish}
          onBack={mockOnBack}
          canPublish={false}
          publishReadinessLoading={false}
          blockingReasons={blockingReasons}
        />
      );

      expect(screen.queryByTestId('select-sites-button')).not.toBeInTheDocument();
    });
  });
});
