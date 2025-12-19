/**
 * AttributeHeader Unit Tests
 * 
 * Tests the sticky header component
 * 
 * Lisa PVS-0.2.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AttributeHeader from '../../src/components/AttributeHeader';
import type { Attribute } from '../../src/hooks/useAttributes';

describe('AttributeHeader', () => {
  const mockAttribute: Attribute = {
    attribute_id: 'test_attr',
    label: 'Test Attribute',
    data_type: 'string',
    status: 'active',
  };

  it('shows empty state when no attribute selected', () => {
    render(<AttributeHeader attribute={null} />);

    expect(screen.getByTestId('attribute-header-empty')).toBeInTheDocument();
    expect(screen.getByText('Select an attribute or create New Attribute')).toBeInTheDocument();
  });

  it('shows attribute label and ID', () => {
    render(<AttributeHeader attribute={mockAttribute} />);

    expect(screen.getByTestId('header-label')).toHaveTextContent('Test Attribute');
    expect(screen.getByTestId('header-id')).toHaveTextContent('test_attr');
  });

  it('shows status pill with correct status', () => {
    render(<AttributeHeader attribute={mockAttribute} />);

    const statusPill = screen.getByTestId('header-status');
    expect(statusPill).toHaveTextContent('active');
    expect(statusPill).toHaveAttribute('aria-label', 'Status: active');
  });

  it('shows deprecated status correctly', () => {
    const deprecatedAttr = { ...mockAttribute, status: 'deprecated' as const };
    render(<AttributeHeader attribute={deprecatedAttr} />);

    expect(screen.getByTestId('header-status')).toHaveTextContent('deprecated');
  });

  it('renders Cancel, Sync, and Save buttons', () => {
    render(<AttributeHeader attribute={mockAttribute} />);

    expect(screen.getByTestId('btn-cancel')).toBeInTheDocument();
    expect(screen.getByTestId('btn-sync')).toBeInTheDocument();
    expect(screen.getByTestId('btn-save')).toBeInTheDocument();
  });

  it('Save button is disabled when not dirty', () => {
    render(<AttributeHeader attribute={mockAttribute} isDirty={false} />);

    expect(screen.getByTestId('btn-save')).toBeDisabled();
  });

  it('Save button is enabled when dirty', () => {
    render(<AttributeHeader attribute={mockAttribute} isDirty={true} />);

    expect(screen.getByTestId('btn-save')).not.toBeDisabled();
  });

  it('Save button shows saving state', () => {
    render(<AttributeHeader attribute={mockAttribute} isDirty={true} saving={true} />);

    expect(screen.getByTestId('btn-save')).toHaveTextContent('Saving...');
    expect(screen.getByTestId('btn-save')).toBeDisabled();
  });

  it('calls onCancel when Cancel clicked', () => {
    const onCancel = vi.fn();
    render(<AttributeHeader attribute={mockAttribute} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('btn-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSync when Sync clicked', () => {
    const onSync = vi.fn();
    render(<AttributeHeader attribute={mockAttribute} onSync={onSync} />);

    fireEvent.click(screen.getByTestId('btn-sync'));
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('calls onSave when Save clicked', () => {
    const onSave = vi.fn();
    render(<AttributeHeader attribute={mockAttribute} isDirty={true} onSave={onSave} />);

    fireEvent.click(screen.getByTestId('btn-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('has correct aria labels for accessibility', () => {
    render(<AttributeHeader attribute={mockAttribute} />);

    expect(screen.getByTestId('btn-cancel')).toHaveAttribute('aria-label', 'Cancel changes');
    expect(screen.getByTestId('btn-sync')).toHaveAttribute('aria-label', 'Sync attribute from server');
    expect(screen.getByTestId('btn-save')).toHaveAttribute('aria-label', 'Save changes');
  });

  it('uses attribute_id as title when label is missing', () => {
    const attrWithoutLabel = { ...mockAttribute, label: '' };
    render(<AttributeHeader attribute={attrWithoutLabel} />);

    expect(screen.getByTestId('header-label')).toHaveTextContent('test_attr');
  });

  // Kebab menu tests (PVS-0.2.6)
  describe('Kebab Menu', () => {
    it('renders kebab button', () => {
      render(<AttributeHeader attribute={mockAttribute} />);
      
      expect(screen.getByTestId('kebab-button')).toBeInTheDocument();
    });

    it('opens kebab menu when clicked', () => {
      render(
        <AttributeHeader 
          attribute={mockAttribute} 
          onDeprecate={vi.fn()} 
          onDelete={vi.fn()} 
        />
      );
      
      fireEvent.click(screen.getByTestId('kebab-button'));
      expect(screen.getByTestId('kebab-menu')).toBeInTheDocument();
    });

    it('shows Deprecate option for active attributes', () => {
      const onDeprecate = vi.fn();
      render(
        <AttributeHeader 
          attribute={mockAttribute} 
          onDeprecate={onDeprecate}
        />
      );
      
      fireEvent.click(screen.getByTestId('kebab-button'));
      expect(screen.getByTestId('menu-deprecate')).toBeInTheDocument();
    });

    it('calls onDeprecate when Deprecate clicked', () => {
      const onDeprecate = vi.fn();
      render(
        <AttributeHeader 
          attribute={mockAttribute} 
          onDeprecate={onDeprecate}
        />
      );
      
      fireEvent.click(screen.getByTestId('kebab-button'));
      fireEvent.click(screen.getByTestId('menu-deprecate'));
      expect(onDeprecate).toHaveBeenCalledTimes(1);
    });

    it('shows Already Deprecated for deprecated attributes', () => {
      const deprecatedAttr = { ...mockAttribute, status: 'deprecated' as const };
      render(
        <AttributeHeader 
          attribute={deprecatedAttr} 
          onDeprecate={vi.fn()}
        />
      );
      
      fireEvent.click(screen.getByTestId('kebab-button'));
      expect(screen.getByText('✓ Already Deprecated')).toBeInTheDocument();
    });

    it('shows Delete option when onDelete provided', () => {
      const onDelete = vi.fn();
      render(
        <AttributeHeader 
          attribute={mockAttribute} 
          onDelete={onDelete}
        />
      );
      
      fireEvent.click(screen.getByTestId('kebab-button'));
      expect(screen.getByTestId('menu-delete')).toBeInTheDocument();
    });

    it('calls onDelete when Delete clicked', () => {
      const onDelete = vi.fn();
      render(
        <AttributeHeader 
          attribute={mockAttribute} 
          onDelete={onDelete}
        />
      );
      
      fireEvent.click(screen.getByTestId('kebab-button'));
      fireEvent.click(screen.getByTestId('menu-delete'));
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
  });
});
