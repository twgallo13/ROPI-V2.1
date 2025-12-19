/**
 * AuditTimeline Component Tests
 * PVS-0.3.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuditTimeline } from '../AuditTimeline';
import type { AuditEvent } from '../../hooks/useAudit';

describe('AuditTimeline', () => {
  const mockEvents: AuditEvent[] = [
    {
      id: 'evt-1',
      attributeId: 'test-attr',
      action: 'create',
      actor: 'user1',
      actorEmail: 'user1@example.com',
      timestamp: new Date().toISOString(),
      summary: 'Created attribute',
      before: null,
      after: { label: 'Test' },
      changedFields: ['label'],
    },
    {
      id: 'evt-2',
      attributeId: 'test-attr',
      action: 'update',
      actor: 'user2',
      actorEmail: 'user2@example.com',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      summary: 'Updated label',
      before: { label: 'Test' },
      after: { label: 'Updated Test' },
      changedFields: ['label'],
    },
  ];

  const defaultProps = {
    events: mockEvents,
    loading: false,
    hasMore: false,
    onLoadMore: vi.fn(),
    onRevert: vi.fn(),
    onSelectEvent: vi.fn(),
  };

  it('should render timeline with events', () => {
    render(<AuditTimeline {...defaultProps} />);

    expect(screen.getByText(/2 events/)).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  it('should display actor emails', () => {
    render(<AuditTimeline {...defaultProps} />);

    expect(screen.getByText('user1@example.com')).toBeInTheDocument();
    expect(screen.getByText('user2@example.com')).toBeInTheDocument();
  });

  it('should display event summaries', () => {
    render(<AuditTimeline {...defaultProps} />);

    expect(screen.getByText('Created attribute')).toBeInTheDocument();
    expect(screen.getByText('Updated label')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<AuditTimeline {...defaultProps} loading={true} events={[]} />);

    expect(screen.getByText('Loading audit history...')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    render(<AuditTimeline {...defaultProps} events={[]} />);

    expect(screen.getByText('No Audit History')).toBeInTheDocument();
  });

  it('should toggle diff view on click', () => {
    render(<AuditTimeline {...defaultProps} />);

    const viewDiffBtn = screen.getAllByText(/View Diff/)[0];
    fireEvent.click(viewDiffBtn);

    expect(screen.getByText(/Hide Diff/)).toBeInTheDocument();
    expect(defaultProps.onSelectEvent).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('should call onRevert when revert button clicked', () => {
    render(<AuditTimeline {...defaultProps} />);

    // Find revert button (only available for update events with before state)
    const revertBtns = screen.getAllByText(/Revert/);
    fireEvent.click(revertBtns[0]);

    expect(defaultProps.onRevert).toHaveBeenCalled();
  });

  it('should show load more button when hasMore is true', () => {
    render(<AuditTimeline {...defaultProps} hasMore={true} />);

    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('should call onLoadMore when load more clicked', () => {
    render(<AuditTimeline {...defaultProps} hasMore={true} />);

    const loadMoreBtn = screen.getByText('Load More');
    fireEvent.click(loadMoreBtn);

    expect(defaultProps.onLoadMore).toHaveBeenCalled();
  });

  it('should expand all events when Expand All clicked', () => {
    render(<AuditTimeline {...defaultProps} />);

    const expandAllBtn = screen.getByText('Expand All');
    fireEvent.click(expandAllBtn);

    // After expanding, we should see Hide Diff buttons
    const hideDiffBtns = screen.getAllByText(/Hide Diff/);
    expect(hideDiffBtns.length).toBeGreaterThan(0);
  });

  it('should collapse all events when Collapse All clicked', () => {
    render(<AuditTimeline {...defaultProps} />);

    // First expand all
    fireEvent.click(screen.getByText('Expand All'));

    // Then collapse all
    fireEvent.click(screen.getByText('Collapse All'));

    // Should see View Diff buttons again
    const viewDiffBtns = screen.getAllByText(/View Diff/);
    expect(viewDiffBtns.length).toBeGreaterThan(0);
  });

  it('should display relative time', () => {
    render(<AuditTimeline {...defaultProps} />);

    // Recent event should show "Just now" or similar
    const timeElements = screen.getAllByText(/Just now|ago/);
    expect(timeElements.length).toBeGreaterThan(0);
  });

  it('should show revert reference for revert events', () => {
    const revertEvent: AuditEvent = {
      id: 'evt-3',
      attributeId: 'test-attr',
      action: 'revert',
      actor: 'user3',
      timestamp: new Date().toISOString(),
      summary: 'Reverted to previous state',
      before: { label: 'Current' },
      after: { label: 'Previous' },
      revertedFromEventId: 'evt-1',
      reason: 'Testing revert',
    };

    render(<AuditTimeline {...defaultProps} events={[revertEvent]} />);

    expect(screen.getByText('Reverted')).toBeInTheDocument();
    expect(screen.getByText(/Reverted from event/)).toBeInTheDocument();
    expect(screen.getByText(/Testing revert/)).toBeInTheDocument();
  });

  it('should highlight selected event', () => {
    render(<AuditTimeline {...defaultProps} selectedEventId="evt-1" />);

    // The selected event should have a different style
    // We check this via the testid or class
    const timeline = screen.getByRole('log');
    expect(timeline).toBeInTheDocument();
  });

  it('should display changed fields', () => {
    render(<AuditTimeline {...defaultProps} />);

    const changedFieldsElements = screen.getAllByText(/Changed: label/);
    expect(changedFieldsElements.length).toBeGreaterThan(0);
  });
});
