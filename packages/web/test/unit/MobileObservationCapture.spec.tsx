/**
 * MobileObservationCapture Component Tests
 * 
 * LP-1.1.1: Unit tests for mobile observation capture.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileObservationCapture from '../../src/components/observations/MobileObservationCapture';

// Mock the child components
vi.mock('../../src/components/observations/MobileMPNScanner', () => ({
  default: vi.fn(({ onProductFound, onClose }) => (
    <div data-testid="mock-scanner">
      <button 
        data-testid="mock-select-product"
        onClick={() => onProductFound({
          id: 'test-id',
          product_mpn: 'TEST-123',
          title: 'Test Product',
          thumbnail: 'https://example.com/thumb.jpg',
          brand: 'Test Brand',
        })}
      >
        Select Product
      </button>
      <button data-testid="mock-close-scanner" onClick={onClose}>
        Close
      </button>
    </div>
  )),
}));

vi.mock('../../src/components/observations/ObservationImageUploader', () => ({
  default: vi.fn(({ images, onImagesChange }) => (
    <div data-testid="mock-image-uploader">
      <button 
        data-testid="mock-add-image"
        onClick={() => onImagesChange([
          ...images,
          { id: 'img1', url: 'https://example.com/img.jpg', thumbnail: 'thumb', status: 'uploaded' }
        ])}
      >
        Add Image
      </button>
      <span data-testid="image-count">{images.length}</span>
    </div>
  )),
}));

vi.mock('../../src/components/observations/AIAnalyzeChips', () => ({
  default: vi.fn(({ onSuggestionSelect }) => (
    <div data-testid="mock-ai-chips">
      <button 
        data-testid="mock-select-suggestion"
        onClick={() => onSuggestionSelect('AI suggested text')}
      >
        Select Suggestion
      </button>
    </div>
  )),
}));

vi.mock('../../src/components/product/FieldPicker', () => ({
  FieldPicker: vi.fn(({ value, onChange }) => (
    <div data-testid="mock-field-picker">
      <button 
        data-testid="mock-select-field"
        onClick={() => onChange({ type: 'product', key: 'product.title' })}
      >
        Select Field
      </button>
      {value && <span data-testid="selected-field">{value.key}</span>}
    </div>
  )),
}));

// Mock the sync hook
const mockAddObservation = vi.fn().mockResolvedValue({ id: 'new-obs-id' });
const mockSyncNow = vi.fn().mockResolvedValue({ synced: 1, failed: 0 });

vi.mock('../../src/hooks/useObservationsSync', () => ({
  useObservationsSync: vi.fn(() => ({
    pendingCount: 0,
    isOnline: true,
    isSyncing: false,
    addObservation: mockAddObservation,
    syncNow: mockSyncNow,
    refreshPending: vi.fn(),
    pendingObservations: [],
  })),
}));

describe('MobileObservationCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render scan button when no product selected', () => {
    render(<MobileObservationCapture />);
    
    expect(screen.getByText(/Scan or Enter MPN/i)).toBeInTheDocument();
  });

  it('should open scanner modal when scan button clicked', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    
    expect(screen.getByTestId('mock-scanner')).toBeInTheDocument();
  });

  it('should display product info after selection', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    expect(screen.getByText('TEST-123')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('Test Brand')).toBeInTheDocument();
  });

  it('should show form fields after product selected', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    expect(screen.getByLabelText(/Observation/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
  });

  it('should allow typing observation text', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    await user.type(input, 'Test observation');
    
    expect(input).toHaveValue('Test observation');
  });

  it('should allow changing severity', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    const highButton = screen.getByRole('radio', { name: /High/i });
    await user.click(highButton);
    
    expect(highButton).toHaveAttribute('aria-checked', 'true');
  });

  it('should validate required fields before save', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    // Try to save without observation text
    const saveButton = screen.getByText(/Save & Continue/i);
    expect(saveButton).toBeDisabled();
  });

  it('should save observation when form is valid', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    // Select product
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    // Enter observation text
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    await user.type(input, 'Test observation');
    
    // Save
    const saveButton = screen.getByText(/Save & Continue/i);
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(mockAddObservation).toHaveBeenCalledWith(
        expect.objectContaining({
          product_mpn: 'TEST-123',
          text: 'Test observation',
          severity: 'medium',
          source: 'mobile_capture',
        })
      );
    });
  });

  it('should show success message after save', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    await user.type(input, 'Test observation');
    await user.click(screen.getByText(/Save & Continue/i));
    
    await waitFor(() => {
      expect(screen.getByText(/Observation saved!/i)).toBeInTheDocument();
    });
  });

  it('should clear form after save', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    await user.type(input, 'Test observation');
    await user.click(screen.getByText(/Save & Continue/i));
    
    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('should handle AI suggestion selection', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    // Add image first
    await user.click(screen.getByTestId('mock-add-image'));
    
    // Enable AI analysis
    const toggle = screen.getByLabelText(/AI Analysis/i);
    await user.click(toggle);
    
    // Select suggestion
    await user.click(screen.getByTestId('mock-select-suggestion'));
    
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    expect(input).toHaveValue('AI suggested text');
  });

  it('should append AI suggestion to existing text', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    // Type some text first
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    await user.type(input, 'Existing text');
    
    // Add image and enable AI
    await user.click(screen.getByTestId('mock-add-image'));
    const toggle = screen.getByLabelText(/AI Analysis/i);
    await user.click(toggle);
    
    // Select suggestion
    await user.click(screen.getByTestId('mock-select-suggestion'));
    
    expect(input).toHaveValue('Existing text, AI suggested text');
  });

  it('should handle clear button', async () => {
    const user = userEvent.setup();
    render(<MobileObservationCapture />);
    
    await user.click(screen.getByText(/Scan or Enter MPN/i));
    await user.click(screen.getByTestId('mock-select-product'));
    
    const input = screen.getByPlaceholderText(/e.g., hidden pocket/i);
    await user.type(input, 'Test observation');
    
    await user.click(screen.getByText(/Clear/i));
    
    // Should reset to initial state (no product selected)
    expect(screen.getByText(/Scan or Enter MPN/i)).toBeInTheDocument();
  });
});
