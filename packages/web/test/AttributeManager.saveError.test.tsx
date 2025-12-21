/**
 * AttributeManager Save Error Tests
 * LP-3.0.1: Test that save errors and validation details are displayed in UI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock useAttributes hook
const mockUpdateAttribute = vi.fn();
const mockCreateAttribute = vi.fn();
const mockDeleteAttribute = vi.fn();
const mockGetUsage = vi.fn();
const mockRefresh = vi.fn();

vi.mock('../src/hooks/useAttributes', () => ({
  useAttributes: () => ({
    attributes: [
      {
        attribute_id: 'test-attr',
        label: 'Test Attribute',
        data_type: 'string',
        status: 'active',
      },
    ],
    loading: false,
    error: null,
    createAttribute: mockCreateAttribute,
    updateAttribute: mockUpdateAttribute,
    deleteAttribute: mockDeleteAttribute,
    getUsage: mockGetUsage,
    refresh: mockRefresh,
  }),
  Attribute: {},
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback({ uid: 'test-user' });
    return () => {};
  }),
}));

// Mock notifications
vi.mock('../src/lib/notifications', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

// Mock stringUtils
vi.mock('../src/lib/stringUtils', () => ({
  toSnakeCase: vi.fn((s) => s.toLowerCase().replace(/\s+/g, '_')),
}));

import AttributeManager from '../src/pages/Settings/AttributeManager';
import { toastError } from '../src/lib/notifications';

describe('AttributeManager Save Error Display (LP-3.0.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should display saveError when updateAttribute returns ok:false', async () => {
    // Mock updateAttribute to return structured error
    mockUpdateAttribute.mockResolvedValue({
      ok: false,
      error: 'validation_failed',
      details: [
        { path: 'data_type', message: 'Invalid enum value' },
      ],
    });

    render(<AttributeManager />);

    // Find and click edit button for the test attribute
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click update button (edit mode shows "Update" not "Save")
    const updateButton = screen.getByText('Update');
    fireEvent.click(updateButton);

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/validation_failed/)).toBeInTheDocument();
    });

    // Verify toastError was called
    expect(toastError).toHaveBeenCalledWith('validation_failed');
  });

  it('should display validation details when present', async () => {
    mockUpdateAttribute.mockResolvedValue({
      ok: false,
      error: 'validation_failed',
      details: [
        { path: 'allowed_values', message: 'Required for enum type' },
        { path: 'data_type', message: 'Invalid data type' },
      ],
    });

    render(<AttributeManager />);

    // Open edit modal
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click update
    fireEvent.click(screen.getByText('Update'));

    // Wait for error details to appear
    await waitFor(() => {
      expect(screen.getByText('Validation Details')).toBeInTheDocument();
    });

    // Click to expand details
    const detailsElement = screen.getByText('Validation Details');
    fireEvent.click(detailsElement);

    // Check that details JSON is displayed
    await waitFor(() => {
      expect(screen.getByText(/allowed_values/)).toBeInTheDocument();
      expect(screen.getByText(/Required for enum type/)).toBeInTheDocument();
    });
  });

  it('should clear error when modal is cancelled', async () => {
    mockUpdateAttribute.mockResolvedValue({
      ok: false,
      error: 'validation_failed',
      details: null,
    });

    render(<AttributeManager />);

    // Open edit modal
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Trigger error
    fireEvent.click(screen.getByText('Update'));

    await waitFor(() => {
      expect(screen.getByText(/validation_failed/)).toBeInTheDocument();
    });

    // Cancel modal
    fireEvent.click(screen.getByText('Cancel'));

    // Re-open modal
    fireEvent.click(editButtons[0]);

    // Error should be cleared
    await waitFor(() => {
      expect(screen.queryByText(/validation_failed/)).not.toBeInTheDocument();
    });
  });

  it('should show success toast when update succeeds', async () => {
    const { toastSuccess } = await import('../src/lib/notifications');
    
    mockUpdateAttribute.mockResolvedValue({
      ok: true,
      attribute: {
        attribute_id: 'test-attr',
        label: 'Updated Label',
        data_type: 'string',
        status: 'active',
      },
    });

    render(<AttributeManager />);

    // Open edit modal
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click update
    fireEvent.click(screen.getByText('Update'));

    // Wait for success
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Updated attribute 'test-attr'");
    });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    mockUpdateAttribute.mockResolvedValue({
      ok: false,
      error: 'network_error',
      details: null,
    });

    render(<AttributeManager />);

    // Open edit modal
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Click update
    fireEvent.click(screen.getByText('Update'));

    // Should display network error
    await waitFor(() => {
      expect(screen.getByText(/network_error/)).toBeInTheDocument();
    });
  });
});
