/**
 * BulkAliasImportModal Tests
 * 
 * Lisa PVS-0.3.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkAliasImportModal from '../BulkAliasImportModal';
import type { Attribute } from '../../hooks/useAttributes';

// Sample attributes for testing
const mockAttributes: Attribute[] = [
  { attribute_id: 'primary_color', label: 'Primary Color', data_type: 'enum' },
  { attribute_id: 'product_title', label: 'Product Title', data_type: 'string' },
  { attribute_id: 'price', label: 'Price', data_type: 'currency' },
];

describe('BulkAliasImportModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onImport: vi.fn().mockResolvedValue(undefined),
    attributes: mockAttributes,
    existingAliases: ['ExistingAlias'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when closed', () => {
    render(<BulkAliasImportModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Bulk Import Aliases')).not.toBeInTheDocument();
  });

  it('should render modal when open', () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    expect(screen.getByText('Bulk Import Aliases')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Supported formats/)).toBeInTheDocument();
  });

  it('should parse comma-separated format', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Supported formats/);

    await userEvent.type(textarea, 'VendorColor,primary_color');

    await waitFor(() => {
      expect(screen.getByText('1 valid')).toBeInTheDocument();
    });
  });

  it('should parse arrow format', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Supported formats/);

    await userEvent.type(textarea, 'VendorColor -> primary_color');

    await waitFor(() => {
      expect(screen.getByText('1 valid')).toBeInTheDocument();
    });
  });

  it('should detect duplicate aliases', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Supported formats/);

    // ExistingAlias is in existingAliases prop
    await userEvent.type(textarea, 'ExistingAlias,primary_color');

    await waitFor(() => {
      expect(screen.getByText(/Duplicate alias/)).toBeInTheDocument();
    });
  });

  it('should detect invalid canonical IDs', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Supported formats/);

    await userEvent.type(textarea, 'NewAlias,nonexistent_attr');

    await waitFor(() => {
      expect(screen.getByText(/not found/)).toBeInTheDocument();
    });
  });

  it('should handle multiple lines', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Supported formats/);

    await userEvent.type(textarea, 'VendorColor,primary_color\nProductName,product_title\nItemPrice,price');

    await waitFor(() => {
      expect(screen.getByText('3 valid')).toBeInTheDocument();
    });
  });

  it('should call onImport with valid aliases', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/Supported formats/);

    await userEvent.type(textarea, 'VendorColor,primary_color\nProductName,product_title');

    const importBtn = screen.getByText(/Import 2 Aliases/);
    await userEvent.click(importBtn);

    await waitFor(() => {
      expect(defaultProps.onImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ alias: 'VendorColor', canonicalId: 'primary_color' }),
          expect.objectContaining({ alias: 'ProductName', canonicalId: 'product_title' }),
        ])
      );
    });
  });

  it('should close modal on cancel', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    
    const cancelBtn = screen.getByText('Cancel');
    await userEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should close modal on X button', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    
    const closeBtn = screen.getByLabelText('Close modal');
    await userEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('should disable import button when no valid aliases', async () => {
    render(<BulkAliasImportModal {...defaultProps} />);
    
    const importBtn = screen.getByRole('button', { name: /Import 0 Alias/ });
    expect(importBtn).toBeDisabled();
  });
});
