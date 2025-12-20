/**
 * MobileMPNScanner Unit Tests
 * 
 * LP-1.2.3: Tests for MPN lookup with proper auth headers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MobileMPNScanner from '../../src/components/observations/MobileMPNScanner';

// Mock getAuthHeaders
vi.mock('../../src/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    Authorization: 'Bearer test-token',
    'Content-Type': 'application/json',
  }),
}));

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  writable: true,
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('MobileMPNScanner', () => {
  const mockOnProductFound = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia.mockRejectedValue(new Error('Camera not available'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Product Lookup', () => {
    it('should send Authorization header when looking up product', async () => {
      const mockProduct = {
        id: 'prod-123',
        product_mpn: 'ABC-123',
        title: 'Test Product',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ product: mockProduct }),
      });

      render(
        <MobileMPNScanner
          onProductFound={mockOnProductFound}
          onClose={mockOnClose}
          apiBaseUrl="/api"
        />
      );

      // Switch to manual mode (since camera is mocked to fail)
      const manualTab = screen.getByText('⌨️ Manual');
      fireEvent.click(manualTab);

      // Enter MPN
      const input = screen.getByLabelText('Enter MPN');
      fireEvent.change(input, { target: { value: 'ABC-123' } });

      // Submit form
      const submitBtn = screen.getByText('Find Product');
      fireEvent.click(submitBtn);

      // Verify fetch was called with Authorization header
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/products/by-mpn/ABC-123',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer test-token',
            }),
          })
        );
      });
    });

    it('should handle 401 error with appropriate message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      render(
        <MobileMPNScanner
          onProductFound={mockOnProductFound}
          onClose={mockOnClose}
          apiBaseUrl="/api"
        />
      );

      // Switch to manual mode
      const manualTab = screen.getByText('⌨️ Manual');
      fireEvent.click(manualTab);

      // Enter MPN and submit
      const input = screen.getByLabelText('Enter MPN');
      fireEvent.change(input, { target: { value: 'TEST-MPN' } });
      fireEvent.click(screen.getByText('Find Product'));

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText(/Authentication required/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 error with not found message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      render(
        <MobileMPNScanner
          onProductFound={mockOnProductFound}
          onClose={mockOnClose}
          apiBaseUrl="/api"
        />
      );

      // Switch to manual mode
      const manualTab = screen.getByText('⌨️ Manual');
      fireEvent.click(manualTab);

      // Enter MPN and submit
      const input = screen.getByLabelText('Enter MPN');
      fireEvent.change(input, { target: { value: 'NONEXISTENT' } });
      fireEvent.click(screen.getByText('Find Product'));

      // Verify error message is shown
      await waitFor(() => {
        expect(screen.getByText(/No product found with MPN/i)).toBeInTheDocument();
      });
    });

    it('should call onProductFound when product is found', async () => {
      const mockProduct = {
        id: 'prod-456',
        product_mpn: 'XYZ-789',
        title: 'Found Product',
        brand: 'TestBrand',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ product: mockProduct }),
      });

      render(
        <MobileMPNScanner
          onProductFound={mockOnProductFound}
          onClose={mockOnClose}
          apiBaseUrl="/api"
        />
      );

      // Switch to manual mode
      const manualTab = screen.getByText('⌨️ Manual');
      fireEvent.click(manualTab);

      // Enter MPN and submit
      const input = screen.getByLabelText('Enter MPN');
      fireEvent.change(input, { target: { value: 'XYZ-789' } });
      fireEvent.click(screen.getByText('Find Product'));

      // Verify onProductFound was called
      await waitFor(() => {
        expect(mockOnProductFound).toHaveBeenCalledWith(mockProduct);
      });
    });
  });

  describe('UI Interactions', () => {
    it('should switch between scan and manual modes', () => {
      render(
        <MobileMPNScanner
          onProductFound={mockOnProductFound}
          onClose={mockOnClose}
        />
      );

      // Default should show scan mode (though camera fails)
      const manualTab = screen.getByText('⌨️ Manual');
      const scanTab = screen.getByText('📷 Scan');

      // Switch to manual
      fireEvent.click(manualTab);
      expect(screen.getByLabelText('Enter MPN')).toBeInTheDocument();

      // Switch back to scan
      fireEvent.click(scanTab);
      // Should be in scan mode (showing camera error since mock fails)
    });

    it('should call onClose when cancel button is clicked', () => {
      render(
        <MobileMPNScanner
          onProductFound={mockOnProductFound}
          onClose={mockOnClose}
        />
      );

      // Switch to manual mode first
      fireEvent.click(screen.getByText('⌨️ Manual'));

      const cancelBtn = screen.getByText('Cancel');
      fireEvent.click(cancelBtn);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
