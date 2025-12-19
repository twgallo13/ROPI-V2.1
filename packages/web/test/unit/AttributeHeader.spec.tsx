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
});
