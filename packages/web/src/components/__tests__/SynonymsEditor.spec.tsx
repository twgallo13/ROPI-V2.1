/**
 * SynonymsEditor Tests
 * 
 * Lisa PVS-0.3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SynonymsEditor from '../SynonymsEditor';

describe('SynonymsEditor', () => {
  const defaultProps = {
    synonyms: {},
    allowedValues: [],
    dataType: 'string',
    onChange: vi.fn(),
    readOnly: false,
    saving: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty state', () => {
    it('should show empty state for string type with no values', () => {
      render(<SynonymsEditor {...defaultProps} />);
      expect(screen.getByText('No values to map')).toBeInTheDocument();
      expect(screen.getByText('+ Add Canonical Value')).toBeInTheDocument();
    });

    it('should show different empty state for enum type', () => {
      render(<SynonymsEditor {...defaultProps} dataType="enum" />);
      expect(screen.getByText('No values to map')).toBeInTheDocument();
      expect(screen.getByText(/Add allowed values in the Values tab/)).toBeInTheDocument();
    });
  });

  describe('With allowed values (enum type)', () => {
    it('should display allowed values', () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red', 'Blue', 'Green']}
        />
      );
      
      expect(screen.getByText('Red')).toBeInTheDocument();
      expect(screen.getByText('Blue')).toBeInTheDocument();
      expect(screen.getByText('Green')).toBeInTheDocument();
    });

    it('should display existing synonyms as tags', () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{ Red: ['crimson', 'scarlet'] }}
        />
      );
      
      expect(screen.getByText('crimson')).toBeInTheDocument();
      expect(screen.getByText('scarlet')).toBeInTheDocument();
    });

    it('should show synonym count', () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{ Red: ['crimson', 'scarlet'] }}
        />
      );
      
      expect(screen.getByText('2 synonyms')).toBeInTheDocument();
    });
  });

  describe('Adding synonyms', () => {
    it('should add a synonym when pressing Enter', async () => {
      const onChange = vi.fn();
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{ Red: [] }}
          onChange={onChange}
        />
      );

      // Click Edit to show input
      const editBtn = screen.getByText('Edit');
      await userEvent.click(editBtn);

      // Type synonym and press Enter
      const input = screen.getByPlaceholderText(/Add synonym/);
      await userEvent.type(input, 'crimson{Enter}');

      expect(onChange).toHaveBeenCalledWith({ Red: ['crimson'] });
    });

    it('should add multiple comma-separated synonyms', async () => {
      const onChange = vi.fn();
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{ Red: [] }}
          onChange={onChange}
        />
      );

      const editBtn = screen.getByText('Edit');
      await userEvent.click(editBtn);

      const input = screen.getByPlaceholderText(/Add synonym/);
      await userEvent.type(input, 'crimson, scarlet, ruby{Enter}');

      expect(onChange).toHaveBeenCalledWith({
        Red: ['crimson', 'scarlet', 'ruby'],
      });
    });
  });

  describe('Removing synonyms', () => {
    it('should remove a synonym when clicking X', async () => {
      const onChange = vi.fn();
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{ Red: ['crimson', 'scarlet'] }}
          onChange={onChange}
        />
      );

      // Click Edit to show remove buttons
      const editBtn = screen.getByText('Edit');
      await userEvent.click(editBtn);

      // Find and click the remove button for 'crimson'
      const removeBtn = screen.getByLabelText('Remove synonym crimson');
      await userEvent.click(removeBtn);

      expect(onChange).toHaveBeenCalledWith({ Red: ['scarlet'] });
    });
  });

  describe('Test transformation', () => {
    it('should show exact match result', async () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red', 'Blue']}
          synonyms={{}}
        />
      );

      const testInput = screen.getByPlaceholderText(/Enter a value to test/);
      await userEvent.type(testInput, 'Red');

      await waitFor(() => {
        // Red appears multiple times (in list and in result), just verify the result exists
        expect(screen.getAllByText('Red').length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should show synonym match result', async () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{ Red: ['crimson'] }}
        />
      );

      const testInput = screen.getByPlaceholderText(/Enter a value to test/);
      await userEvent.type(testInput, 'crimson');

      await waitFor(() => {
        // Verify via "crimson" message appears
        expect(screen.getByText(/via "crimson"/)).toBeInTheDocument();
      });
    });

    it('should show unknown for non-matching values', async () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          synonyms={{}}
        />
      );

      const testInput = screen.getByPlaceholderText(/Enter a value to test/);
      await userEvent.type(testInput, 'Purple');

      await waitFor(() => {
        expect(screen.getByText('❓ Unknown')).toBeInTheDocument();
      });
    });
  });

  describe('Read-only mode', () => {
    it('should not show Edit buttons in read-only mode', () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="enum"
          allowedValues={['Red']}
          readOnly={true}
        />
      );

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should not show add button in read-only mode', () => {
      render(
        <SynonymsEditor
          {...defaultProps}
          dataType="string"
          readOnly={true}
        />
      );

      expect(screen.queryByText('+ Add Canonical Value')).not.toBeInTheDocument();
    });
  });
});
