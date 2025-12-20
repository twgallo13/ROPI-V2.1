/**
 * MobileMPNScanner Tests
 * 
 * LP-1.2.2: Tests for MPN lookup with authentication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileMPNScanner from '../observations/MobileMPNScanner';

// Mock getAuthHeaders
vi.mock('@/lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({
    Authorization: 'Bearer mock-admin-token',
    'Content-Type': 'application/json',
  }),
}));

// Mock navigator.mediaDevices for camera tests
const mockGetUserMedia = vi.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
  },
  configurable: true,
});

describe('MobileMPNScanner', () => {
  const mockOnProductFound = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MPN Lookup with Authorization', () => {
    it('should include Authorization header in fetch request', async () => {
      const mockProduct = {
        id: 'product-123',
        product_mpn: 'TEST-MPN-001',
        title: 'Test Product',
        thumbnail: 'https://example.com/thumb.jpg',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProduct,
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

      // Enter MPN
      const input = screen.getByPlaceholderText(/ABC-12345/i);
      await userEvent.type(input, 'TEST-MPN-001');

      // Submit
      const submitBtn = screen.getByText(/Find Product/i);
      fireEvent.click(submitBtn);

      // Wait for fetch to be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/products/by-mpn/TEST-MPN-001',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer mock-admin-token',
            }),
            credentials: 'include',
          })
        );
      });
    });

    it('should handle 401 error with appropriate message', async () => {
      (global.fetch as any).mockResolvedValueOnce({
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
      const input = screen.getByPlaceholderText(/ABC-12345/i);
      await userEvent.type(input, 'TEST-MPN-001');
      
      const submitBtn = screen.getByText(/Find Product/i);
      fireEvent.click(submitBtn);

      // Should show auth error
      await waitFor(() => {
        expect(screen.getByText(/authentication required/i)).toBeInTheDocument();
      });
    });

    it('should handle 403 error with appropriate message', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
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
      const input = screen.getByPlaceholderText(/ABC-12345/i);
      await userEvent.type(input, 'TEST-MPN-001');
      
      const submitBtn = screen.getByText(/Find Product/i);
      fireEvent.click(submitBtn);

      // Should show permission error
      await waitFor(() => {
        expect(screen.getByText(/admin access required/i)).toBeInTheDocument();
      });
    });

    it('should handle 404 error with product not found message', async () => {
      (global.fetch as any).mockResolvedValueOnce({
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
      const input = screen.getByPlaceholderText(/ABC-12345/i);
      await userEvent.type(input, 'NONEXISTENT-MPN');
      
      const submitBtn = screen.getByText(/Find Product/i);
      fireEvent.click(submitBtn);

      // Should show not found error
      await waitFor(() => {
        expect(screen.getByText(/no product found/i)).toBeInTheDocument();
      });
    });

    it('should call onProductFound with product data on success', async () => {
      const mockProduct = {
        id: 'product-123',
        product_mpn: 'TEST-MPN-001',
        title: 'Test Product',
        thumbnail: 'https://example.com/thumb.jpg',
        brand: 'Test Brand',
        sku: 'SKU-001',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockProduct,
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
      const input = screen.getByPlaceholderText(/ABC-12345/i);
      await userEvent.type(input, 'TEST-MPN-001');
      
      const submitBtn = screen.getByText(/Find Product/i);
      fireEvent.click(submitBtn);

      // Should call onProductFound with product data
      await waitFor(() => {
        expect(mockOnProductFound).toHaveBeenCalledWith(mockProduct);
      });
    });
  });
});
