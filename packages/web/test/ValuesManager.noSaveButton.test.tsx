/**
 * ValuesManager Save Button Visibility Tests
 * 
 * LP-ATTR-1.2.2: Tests that Save Values button is only rendered when onSave prop is provided.
 * When onSave is not passed, the parent Save handles persistence.
 * 
 * Homer LP-ATTR-1.2.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ValuesManager, { type AllowedValue } from '../src/components/ValuesManager';

describe('ValuesManager Save Button Visibility', () => {
  const mockValues: AllowedValue[] = [
    { id: 'val-1', value: 'Red', enabled: true, synonyms: [], originalValue: 'Red' },
    { id: 'val-2', value: 'Blue', enabled: true, synonyms: [], originalValue: 'Blue' },
  ];

  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should NOT render Save Values button when onSave prop is NOT provided', () => {
    render(
      <ValuesManager
        values={mockValues}
        onChange={mockOnChange}
        // onSave is NOT passed
      />
    );

    // The Save Values button should not exist
    const saveButton = screen.queryByTestId('save-values-btn');
    expect(saveButton).toBeNull();
  });

  it('should render Save Values button when onSave prop IS provided', () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ValuesManager
        values={mockValues}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    // The Save Values button should exist
    const saveButton = screen.queryByTestId('save-values-btn');
    expect(saveButton).not.toBeNull();
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toHaveTextContent('Save Values');
  });

  it('should call onSave when Save Values button is clicked', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    
    // Add a new value to make isDirty true
    const dirtyValues: AllowedValue[] = [
      ...mockValues,
      { id: 'val-3', value: 'Green', enabled: true, synonyms: [], isNew: true },
    ];

    render(
      <ValuesManager
        values={dirtyValues}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByTestId('save-values-btn');
    expect(saveButton).toBeInTheDocument();
    
    // Button should be enabled when there are changes (isDirty = true due to isNew)
    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1);
    });

    // Check that onSave was called with the expected payload structure
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        allowed_values: expect.arrayContaining(['Red', 'Blue', 'Green']),
        synonyms: expect.any(Object),
      })
    );
  });

  it('should still show Bulk Add button regardless of onSave prop', () => {
    render(
      <ValuesManager
        values={mockValues}
        onChange={mockOnChange}
        // onSave is NOT passed
      />
    );

    // Bulk Add should always be present
    const bulkAddButton = screen.queryByTestId('bulk-add-btn');
    expect(bulkAddButton).toBeInTheDocument();
    expect(bulkAddButton).toHaveTextContent('Bulk Add');
  });

  it('should disable Save Values button when no changes (isDirty = false)', () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);

    // Values with originalValue matching value (not dirty)
    const cleanValues: AllowedValue[] = [
      { id: 'val-1', value: 'Red', enabled: true, synonyms: [], originalValue: 'Red' },
    ];

    render(
      <ValuesManager
        values={cleanValues}
        onChange={mockOnChange}
        onSave={mockOnSave}
      />
    );

    const saveButton = screen.getByTestId('save-values-btn');
    expect(saveButton).toBeDisabled();
  });
});
