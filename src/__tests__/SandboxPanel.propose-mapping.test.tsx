/**
 * SandboxPanel - propose-mapping endpoint tests
 * v3.0.2 - Test multipart/form-data CSV upload
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SandboxPanel from '../pages/settings/components/SandboxPanel';

// Mock fetch
global.fetch = vi.fn();

describe('SandboxPanel - propose-mapping endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should POST to /api/attributes/propose-mapping when uploading a CSV file', async () => {
    const mockResponse = {
      mappings: [
        {
          csvHeader: 'Product Name',
          canonicalPath: 'descriptive.product_name',
          confidence: 1.0,
          matchType: 'exact',
          matchedAlias: 'Product Name'
        }
      ],
      headers: ['Product Name', 'Price']
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    render(<SandboxPanel onClose={vi.fn()} />);

    // Create a test CSV file
    const csvContent = 'Product Name,Price\nTest Product,10.00';
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

    // Find the file input by ID
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    
    // Trigger file upload
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/attributes/propose-mapping',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: expect.any(FormData)
        })
      );
    });

    // Verify FormData contains the file
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const formData = fetchCall[1].body as FormData;
    expect(formData.get('file')).toBeInstanceOf(File);
    expect((formData.get('file') as File).name).toBe('test.csv');
  });

  it('should handle CSV upload errors gracefully and show detailed error message', async () => {
    const mockError = { message: 'Invalid CSV format' };
    
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => mockError
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<SandboxPanel onClose={vi.fn()} />);

    const csvContent = 'Invalid CSV';
    const file = new File([csvContent], 'bad.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid CSV format'));
    });

    alertSpy.mockRestore();
  });

  it('should use FormData without manually setting Content-Type header', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ mappings: [], headers: [] })
    });

    render(<SandboxPanel onClose={vi.fn()} />);

    const file = new File(['test'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const options = fetchCall[1];
      
      // Should NOT have Content-Type header (browser sets it automatically for FormData)
      expect(options.headers).toBeUndefined();
      expect(options.body).toBeInstanceOf(FormData);
    });
  });

  it('should display mapping results after successful upload', async () => {
    const mockResponse = {
      mappings: [
        {
          csvHeader: 'Brand',
          canonicalPath: 'descriptive.brand',
          confidence: 0.95,
          matchType: 'synonym',
          matchedAlias: 'Brand Name'
        }
      ],
      headers: ['Brand']
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    render(<SandboxPanel onClose={vi.fn()} />);

    const file = new File(['Brand\nNike'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Proposed Mappings/i)).toBeInTheDocument();
      expect(screen.getByText('Brand')).toBeInTheDocument();
      const mappingDisplay = screen.getByText((content, element) => {
        return element?.className?.includes('font-mono') && content.includes('descriptive.brand');
      });
      expect(mappingDisplay).toBeInTheDocument();
    });
  });
});
