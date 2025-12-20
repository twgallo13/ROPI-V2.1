/**
 * DiffViewer Component Tests
 * PVS-0.3.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffViewer } from '../DiffViewer';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('DiffViewer', () => {
  const mockBefore = {
    label: 'Old Label',
    data_type: 'string',
    status: 'active',
  };

  const mockAfter = {
    label: 'New Label',
    data_type: 'string',
    status: 'deprecated',
  };

  it('should render before and after columns', () => {
    render(<DiffViewer before={mockBefore} after={mockAfter} />);

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });

  it('should display changed fields count', () => {
    render(<DiffViewer before={mockBefore} after={mockAfter} />);

    // label and status changed = 2 fields
    expect(screen.getByText(/2 fields? changed/)).toBeInTheDocument();
  });

  it('should highlight modified values', () => {
    render(<DiffViewer before={mockBefore} after={mockAfter} />);

    // Check label values are rendered
    expect(screen.getByText('"Old Label"')).toBeInTheDocument();
    expect(screen.getByText('"New Label"')).toBeInTheDocument();
  });

  it('should show added fields', () => {
    const before = { existing: 'value' };
    const after = { existing: 'value', newField: 'new value' };

    render(<DiffViewer before={before} after={after} />);

    expect(screen.getByText('"new value"')).toBeInTheDocument();
  });

  it('should show removed fields', () => {
    const before = { existing: 'value', removedField: 'old value' };
    const after = { existing: 'value' };

    render(<DiffViewer before={before} after={after} />);

    expect(screen.getByText('"old value"')).toBeInTheDocument();
  });

  it('should handle null before (create event)', () => {
    render(<DiffViewer before={null} after={mockAfter} />);

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('"New Label"')).toBeInTheDocument();
  });

  it('should handle null after (delete event)', () => {
    render(<DiffViewer before={mockBefore} after={null} />);

    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('"Old Label"')).toBeInTheDocument();
  });

  it('should render empty state when both null', () => {
    render(<DiffViewer before={null} after={null} />);

    expect(screen.getByText('No changes to display')).toBeInTheDocument();
  });

  it('should copy diff to clipboard', async () => {
    const onCopy = vi.fn();
    render(<DiffViewer before={mockBefore} after={mockAfter} onCopy={onCopy} />);

    const copyBtn = screen.getByLabelText('Copy changes as text');
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(onCopy).toHaveBeenCalled();
  });

  it('should copy JSON to clipboard', async () => {
    const onCopy = vi.fn();
    render(<DiffViewer before={mockBefore} after={mockAfter} onCopy={onCopy} />);

    const jsonBtn = screen.getByLabelText('Copy as JSON');
    fireEvent.click(jsonBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    expect(onCopy).toHaveBeenCalled();
  });

  it('should filter to changedFields if provided', () => {
    render(
      <DiffViewer 
        before={mockBefore} 
        after={mockAfter} 
        changedFields={['label']} 
      />
    );

    // Only label change should be highlighted
    expect(screen.getByText('"Old Label"')).toBeInTheDocument();
    expect(screen.getByText('"New Label"')).toBeInTheDocument();
  });

  it('should display custom title', () => {
    render(
      <DiffViewer 
        before={mockBefore} 
        after={mockAfter} 
        title="Custom Diff Title" 
      />
    );

    expect(screen.getByText('Custom Diff Title')).toBeInTheDocument();
  });

  it('should render legend', () => {
    render(<DiffViewer before={mockBefore} after={mockAfter} />);

    expect(screen.getByText('+ Added')).toBeInTheDocument();
    expect(screen.getByText('− Removed')).toBeInTheDocument();
    expect(screen.getByText('~ Modified')).toBeInTheDocument();
  });
});
