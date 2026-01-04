/**
 * CompletionExportGatePanel — LP-completion-user-visibility-ui-1.4.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompletionExportGatePanel } from '../CompletionExportGatePanel';

declare const global: { fetch: typeof fetch };

const mockFetch = vi.spyOn(global, 'fetch');

const readyPayload = {
  ready: true,
  completionPct: 92,
  threshold: 80,
  hasBlockingSites: false,
  blockingReasons: [],
  operatorExplanation: {
    summary: 'All good',
    blockingIssues: [],
    completionBreakdown: [
      {
        segmentId: 'desc',
        segmentName: 'Description',
        score: 95,
        weightPct: 60,
        missingAttributes: [],
      },
    ],
    siteStatus: [
      { site: 'us', blocked: false, reason: 'OK', missingAttributes: [] },
    ],
    actionRequired: [],
  },
};

const blockedPayload = {
  ready: false,
  completionPct: 40,
  threshold: 80,
  hasBlockingSites: true,
  blockingReasons: [
    {
      type: 'SITE_BLOCK',
      severity: 'ERROR',
      message: 'Missing localized attributes',
      details: { missingAttributes: ['title_us'] },
    },
  ],
  operatorExplanation: {
    summary: 'Site blocking detected',
    blockingIssues: ['US site missing title'],
    completionBreakdown: [
      {
        segmentId: 'desc',
        segmentName: 'Description',
        score: 0,
        weightPct: 60,
        missingAttributes: ['title_us'],
      },
    ],
    siteStatus: [
      { site: 'us', blocked: true, reason: 'title_us missing', missingAttributes: ['title_us'] },
    ],
    actionRequired: ['Fill title for US'],
  },
};

function renderPanel() {
  return render(
    <MemoryRouter>
      <CompletionExportGatePanel productId="prod-1" />
    </MemoryRouter>
  );
}

describe('CompletionExportGatePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('renders ready state using payload flags (no inference)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => readyPayload } as Response);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/Ready for export/i)).toBeInTheDocument();
    });
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText(/Export threshold:/i)).toHaveTextContent('80%');
  });

  it('renders blocked details with issues, site status, segment breakdown, and actions', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => blockedPayload } as Response);

    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/Blocked from export/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Blocking issues/i)).toBeInTheDocument();
    expect(screen.getByText('US site missing title')).toBeInTheDocument();
    expect(screen.getByText(/Site Status/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText('us'));
    expect(screen.getByText(/title_us missing/i)).toBeInTheDocument();
    expect(screen.getByText(/Completion by Segment/i)).toBeInTheDocument();
    expect(screen.getByText(/What to do next/i)).toBeInTheDocument();
  });

  it('shows empty state when payload is null and allows retry', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => null } as Response);
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/No completion data returned/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });

  it('shows error state when fetch fails and offers retry', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network fail'));
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText(/network fail/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
