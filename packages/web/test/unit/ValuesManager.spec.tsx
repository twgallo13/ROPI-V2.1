/**
 * ValuesManager Component Unit Tests
 * 
 * Tests CUD operations, search, bulk add, reorder, synonyms
 * 
 * Lisa PVS-0.2.9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ValuesManager, {
  type AllowedValue,
  valuesToPayload,
  payloadToValues,
} from '../../src/components/ValuesManager';

// Mock test data
const createMockValues = (count: number): AllowedValue[] => {
  const baseValues = ['Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink', 'Brown', 'Black', 'White'];
  return Array.from({ length: count }, (_, i) => ({
    id: `val-${i}`,
    value: count <= baseValues.length ? baseValues[i] : `Value ${i + 1}`,
    enabled: true,
    synonyms: [],
  }));
};

const mockOnChange = vi.fn();
const mockOnSave = vi.fn().mockResolvedValue(undefined);

describe('ValuesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with empty values', () => {
      render(
        <ValuesManager
          values={[]}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByTestId('values-manager')).toBeInTheDocument();
      expect(screen.getByTestId('quick-add-input')).toBeInTheDocument();
      expect(screen.getByText(/No values defined/)).toBeInTheDocument();
    });

    it('renders with values list', () => {
      render(
        <ValuesManager
          values={createMockValues(3)}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
    });

    it('shows header with active count', () => {
      render(
        <ValuesManager
          values={createMockValues(5)}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByText(/5 active/)).toBeInTheDocument();
    });
  });

  describe('Quick Add', () => {
    it('adds a new value on Enter (prepended)', async () => {
      render(
        <ValuesManager
          values={createMockValues(2)}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('quick-add-input');
      await userEvent.type(input, 'NewValue{Enter}');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall).toHaveLength(3);
        // New value is prepended to the list
        expect(lastCall[0].value).toBe('NewValue');
        expect(lastCall[0].isNew).toBe(true);
      });
    });

    it('trims whitespace from new values', async () => {
      render(
        <ValuesManager
          values={[]}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('quick-add-input');
      await userEvent.type(input, '  Trimmed Value  {Enter}');

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall[0].value).toBe('Trimmed Value');
      });
    });

    it('prevents adding duplicate values', async () => {
      render(
        <ValuesManager
          values={createMockValues(3)}
          onChange={mockOnChange}
        />
      );

      mockOnChange.mockClear();

      const input = screen.getByTestId('quick-add-input');
      await userEvent.type(input, 'Red{Enter}');

      // The quick add should not add duplicates
      // Check that the last call (if any) doesn't have a new Red value
      const callsWithNewRed = mockOnChange.mock.calls.filter(
        call => call[0].some((v: AllowedValue) => v.value === 'Red' && v.isNew)
      );
      expect(callsWithNewRed).toHaveLength(0);
    });

    it('prevents adding empty values', async () => {
      render(
        <ValuesManager
          values={[]}
          onChange={mockOnChange}
        />
      );

      const input = screen.getByTestId('quick-add-input');
      await userEvent.type(input, '   {Enter}');

      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('is disabled when readOnly', () => {
      render(
        <ValuesManager
          values={createMockValues(3)}
          onChange={mockOnChange}
          readOnly
        />
      );

      expect(screen.getByTestId('quick-add-input')).toBeDisabled();
    });
  });

  describe('Search', () => {
    it('filters values by search query', async () => {
      render(
        <ValuesManager
          values={createMockValues(5)}
          onChange={mockOnChange}
        />
      );

      const searchInput = screen.getByTestId('values-search');
      await userEvent.type(searchInput, 'Blue');

      // Wait for debounce
      await waitFor(() => {
        expect(screen.getByText('Blue')).toBeInTheDocument();
        expect(screen.queryByText('Red')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });

    it('searches in synonyms', async () => {
      const valuesWithSynonyms: AllowedValue[] = [
        { id: 'v1', value: 'Crimson', enabled: true, synonyms: ['red', 'scarlet'] },
        { id: 'v2', value: 'Azure', enabled: true, synonyms: ['blue', 'cerulean'] },
      ];

      render(
        <ValuesManager
          values={valuesWithSynonyms}
          onChange={mockOnChange}
        />
      );

      const searchInput = screen.getByTestId('values-search');
      await userEvent.type(searchInput, 'scarlet');

      await waitFor(() => {
        expect(screen.getByText('Crimson')).toBeInTheDocument();
        expect(screen.queryByText('Azure')).not.toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Delete/Undo', () => {
    it('soft deletes a value', async () => {
      render(
        <ValuesManager
          values={createMockValues(3)}
          onChange={mockOnChange}
        />
      );

      // Click delete on first value
      const deleteBtns = screen.getAllByTitle('Delete value');
      fireEvent.click(deleteBtns[0]);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        const deletedValue = lastCall.find((v: AllowedValue) => v.id === 'val-0');
        expect(deletedValue?.isDeleted).toBe(true);
      });
    });

    it('shows undo button for deleted values', async () => {
      const valuesWithDeleted: AllowedValue[] = [
        { id: 'v1', value: 'Red', enabled: true, synonyms: [], isDeleted: true },
        { id: 'v2', value: 'Blue', enabled: true, synonyms: [] },
      ];

      render(
        <ValuesManager
          values={valuesWithDeleted}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByLabelText('Undo delete')).toBeInTheDocument();
    });

    it('undoes soft delete', async () => {
      const valuesWithDeleted: AllowedValue[] = [
        { id: 'v1', value: 'Red', enabled: true, synonyms: [], isDeleted: true },
        { id: 'v2', value: 'Blue', enabled: true, synonyms: [] },
      ];

      render(
        <ValuesManager
          values={valuesWithDeleted}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByLabelText('Undo delete'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        const restoredValue = lastCall.find((v: AllowedValue) => v.id === 'v1');
        expect(restoredValue?.isDeleted).toBe(false);
      });
    });
  });

  describe('Bulk Add Modal', () => {
    it('opens bulk add modal', async () => {
      render(
        <ValuesManager
          values={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByTestId('bulk-add-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('bulk-add-modal')).toBeInTheDocument();
      });
    });

    it('parses and adds values on confirm', async () => {
      render(
        <ValuesManager
          values={[]}
          onChange={mockOnChange}
        />
      );

      fireEvent.click(screen.getByTestId('bulk-add-btn'));

      const textarea = screen.getByTestId('bulk-input');
      await userEvent.type(textarea, 'Apple\nBanana\nCherry');

      // Click confirm to add all values
      fireEvent.click(screen.getByTestId('bulk-confirm'));

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
        const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1][0];
        expect(lastCall).toHaveLength(3);
        expect(lastCall.map((v: AllowedValue) => v.value)).toEqual(['Apple', 'Banana', 'Cherry']);
      });
    });
  });

  describe('Payload Conversion', () => {
    it('valuesToPayload converts correctly', () => {
      const values: AllowedValue[] = [
        { id: 'v1', value: 'Red', enabled: true, synonyms: ['crimson', 'scarlet'] },
        { id: 'v2', value: 'Blue', enabled: true, synonyms: [] },
        { id: 'v3', value: 'Old', enabled: true, synonyms: [], isDeleted: true },
      ];

      const payload = valuesToPayload(values);

      expect(payload.allowed_values).toEqual(['Red', 'Blue']);
      expect(payload.synonyms).toEqual({
        Red: ['crimson', 'scarlet'],
      });
    });

    it('payloadToValues converts correctly', () => {
      const allowed_values = ['Red', 'Blue', 'Green'];
      const synonyms = {
        Red: ['crimson'],
        Blue: ['azure'],
      };

      const values = payloadToValues(allowed_values, synonyms);

      expect(values).toHaveLength(3);
      expect(values[0].value).toBe('Red');
      expect(values[0].synonyms).toEqual(['crimson']);
      expect(values[1].value).toBe('Blue');
      expect(values[1].synonyms).toEqual(['azure']);
      expect(values[2].value).toBe('Green');
      expect(values[2].synonyms).toEqual([]);
    });
  });

  describe('Save Flow', () => {
    it('calls onSave with correct payload', async () => {
      // Create values with isNew to make them dirty
      const values: AllowedValue[] = [
        { id: 'v1', value: 'Red', enabled: true, synonyms: ['crimson'], isNew: true },
        { id: 'v2', value: 'Blue', enabled: true, synonyms: [] },
      ];

      render(
        <ValuesManager
          values={values}
          onChange={mockOnChange}
          onSave={mockOnSave}
        />
      );

      // Save button should be enabled since there are new values
      fireEvent.click(screen.getByTestId('save-values-btn'));

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          allowed_values: ['Red', 'Blue'],
          synonyms: { Red: ['crimson'] },
        });
      });
    });

    it('disables save button when no changes (not dirty)', () => {
      // Values without isNew or isDeleted or modified = not dirty
      const cleanValues: AllowedValue[] = [
        { id: 'v1', value: 'Red', enabled: true, synonyms: [], originalValue: 'Red' },
        { id: 'v2', value: 'Blue', enabled: true, synonyms: [], originalValue: 'Blue' },
      ];
      
      render(
        <ValuesManager
          values={cleanValues}
          onChange={mockOnChange}
          onSave={mockOnSave}
        />
      );

      expect(screen.getByTestId('save-values-btn')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles', () => {
      render(
        <ValuesManager
          values={createMockValues(3)}
          onChange={mockOnChange}
        />
      );

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });
});
