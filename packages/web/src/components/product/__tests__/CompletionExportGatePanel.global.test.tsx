/**
 * CompletionExportGatePanel Tests for GLOBAL Mode
 * LP-export-global-impl-2b | HES B/C Implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletionExportGatePanel, CompletionEvaluationResult } from '../CompletionExportGatePanel';

// Mock fetch
global.fetch = vi.fn();

// Mock authHeaders
vi.mock('../../lib/authHeaders', () => ({
  getAuthHeaders: vi.fn().mockResolvedValue({ 'Authorization': 'Bearer token' }),
}));

describe('CompletionExportGatePanel - GLOBAL Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const globalModeCompletion: CompletionEvaluationResult = {
    ready: true,
    completionPct: 85,
    threshold: 80,
    hasBlockingSites: false,
    mode: 'GLOBAL',
    productLevelReadiness: {
      aggregatedCompletionPct: 85,
      segmentScores: [
        {
          segmentId: 'core-attributes',
          score: 100,
          weightPct: 50,
          segmentName: 'Core Attributes',
        },
        {
          segmentId: 'product-classification',
          score: 67,
          weightPct: 20,
          missingAttributes: ['department'],
          segmentName: 'Product Classification',
        },
      ],
      missingGlobalAttributes: ['department'],
      blockingSegments: [],
      sitesEvaluated: ['ropi-web', 'ropi-app'],
    },
    blockingReasons: [],
    operatorExplanation: {
      summary: 'Product ready for global export (85% / 80% threshold)',
      blockingIssues: [],
      actionRequired: [],
      siteStatus: [
        {
          site: 'ropi-web',
          blocked: false,
          reason: 'Site ready',
        },
        {
          site: 'ropi-app',
          blocked: false,
          reason: 'Site ready',
        },
      ],
    },
  };

  it('should render GlobalModeCard when mode is GLOBAL', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => globalModeCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      expect(screen.getByText(/Global Mode/i)).toBeInTheDocument();
    });
  });

  it('should show completion gauge for SITE_SCOPED mode', async () => {
    const siteScopedCompletion: CompletionEvaluationResult = {
      ...globalModeCompletion,
      mode: 'SITE_SCOPED',
      productLevelReadiness: undefined,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => siteScopedCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      expect(screen.getByText('Export threshold:')).toBeInTheDocument();
    });
  });

  it('should show Advanced toggle for GLOBAL mode with siteStatus', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => globalModeCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      const advancedButton = screen.getByRole('button', {
        name: /Advanced: Site-Level Details/i,
      });
      expect(advancedButton).toBeInTheDocument();
    });
  });

  it('should toggle Advanced section on click', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => globalModeCompletion,
    });

    const user = userEvent.setup();
    render(<CompletionExportGatePanel productId="test-product" />);

    const advancedButton = await screen.findByRole('button', {
      name: /Advanced: Site-Level Details/i,
    });

    // Initially collapsed
    expect(advancedButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    await user.click(advancedButton);
    expect(advancedButton).toHaveAttribute('aria-expanded', 'true');

    // Site status should be visible
    expect(screen.getByText('ropi-web')).toBeInTheDocument();
    expect(screen.getByText('ropi-app')).toBeInTheDocument();
  });

  it('should not show site accordion in GLOBAL mode (sites in Advanced only)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => globalModeCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      // Check that main "Site Status" section is NOT present (should only be in Advanced)
      const siteStatusHeaders = screen.queryAllByText('Site Status');
      expect(siteStatusHeaders).toHaveLength(0);
    });
  });

  it('should show site accordion in SITE_SCOPED mode (not in Advanced)', async () => {
    const siteScopedCompletion: CompletionEvaluationResult = {
      ...globalModeCompletion,
      mode: 'SITE_SCOPED',
      productLevelReadiness: undefined,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => siteScopedCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      // Site Status header should be visible in SITE_SCOPED mode
      expect(screen.getByText('Site Status')).toBeInTheDocument();
    });
  });

  it('should not show Advanced toggle when no siteStatus', async () => {
    const completionNoSites: CompletionEvaluationResult = {
      ...globalModeCompletion,
      operatorExplanation: {
        ...globalModeCompletion.operatorExplanation!,
        siteStatus: [],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => completionNoSites,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      const advancedButton = screen.queryByRole('button', {
        name: /Advanced/i,
      });
      expect(advancedButton).not.toBeInTheDocument();
    });
  });

  it('should handle null productLevelReadiness gracefully', async () => {
    const noProductLevelCompletion: CompletionEvaluationResult = {
      ...globalModeCompletion,
      mode: 'GLOBAL',
      productLevelReadiness: undefined,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => noProductLevelCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    // Should not crash, but GlobalModeCard returns null
    await waitFor(() => {
      expect(screen.getByText(/Ready for export/i)).toBeInTheDocument();
    });
  });

  it('should default to SITE_SCOPED when mode is not specified', async () => {
    const noModeCompletion: CompletionEvaluationResult = {
      ...globalModeCompletion,
      mode: undefined,
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => noModeCompletion,
    });

    render(<CompletionExportGatePanel productId="test-product" />);

    await waitFor(() => {
      // Should show SITE_SCOPED UI (completion gauge, not GlobalModeCard)
      expect(screen.getByText('Export threshold:')).toBeInTheDocument();
    });
  });
});
