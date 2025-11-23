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

    // Create a test CSV file (v3.2: using real File object with polyfill)
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
          headers: {
            'Content-Type': 'application/json'
          },
          body: expect.stringContaining(csvContent)
        })
      );
    });

    // Verify JSON body contains csvData
    const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.csvData).toBe(csvContent);
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
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to analyze CSV file'));
    });

    alertSpy.mockRestore();
  });

  it('should send JSON with csvData and proper Content-Type header', async () => {
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
      
      // Should have Content-Type: application/json header
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(typeof options.body).toBe('string');
      const body = JSON.parse(options.body);
      expect(body).toHaveProperty('csvData');
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

    // Use async findByText to wait for UI updates (v3.2)
    const proposedMappingsHeading = await screen.findByText(/Proposed Mappings/i, {}, { timeout: 3000 });
    expect(proposedMappingsHeading).toBeInTheDocument();
    
    expect(await screen.findByText('Brand')).toBeInTheDocument();
    // Check that the mapping path is rendered somewhere
    const pathElements = await screen.findAllByText(/descriptive\.brand/);
    expect(pathElements[0]).toBeInTheDocument();
  });
});
