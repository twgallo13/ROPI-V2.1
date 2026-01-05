/**
 * ExportPage Tests
 * LP-export-unlock-1.0.0
 *
 * Tests the three gating behaviors:
 * 1. Loading state → export controls disabled + loading indicator
 * 2. completion.ready === true → export enabled, UI interactive
 * 3. completion.ready === false → blocked modal showing reasons
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ExportPage from '../../pages/ExportPage';

// Mock the useExportCompletion hook
vi.mock('../../hooks/useExportCompletion', () => ({
  useExportCompletion: vi.fn(),
}));

// Mock fetch for export API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the mocked hook
import { useExportCompletion } from '../../hooks/useExportCompletion';
const mockedUseExportCompletion = vi.mocked(useExportCompletion);

// Wrapper component for router context
function Wrapper({ children }: { children: React.ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>;
}

describe('ExportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading indicator when completion is loading', () => {
      mockedUseExportCompletion.mockReturnValue({
        loading: true,
        error: null,
        completion: null,
        exportReady: false,
        exportBlocked: false,
        refresh: vi.fn(),
      });

      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('export-loading')).toBeInTheDocument();
      expect(screen.getByText(/checking export readiness/i)).toBeInTheDocument();
    });

    it('should not show export controls when loading', () => {
      mockedUseExportCompletion.mockReturnValue({
        loading: true,
        error: null,
        completion: null,
        exportReady: false,
        exportBlocked: false,
        refresh: vi.fn(),
      });

      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.queryByTestId('export-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('export-site-select')).not.toBeInTheDocument();
    });
  });

  describe('Export Ready State (completion.ready === true)', () => {
    const mockReadyCompletion = {
      ready: true,
      completionPct: 95,
      threshold: 80,
      hasBlockingSites: false,
      blockingReasons: [],
      operatorExplanation: {
        summary: 'All requirements met',
        blockingIssues: [],
        actionRequired: [],
      },
    };

    beforeEach(() => {
      mockedUseExportCompletion.mockReturnValue({
        loading: false,
        error: null,
        completion: mockReadyCompletion,
        exportReady: true,
        exportBlocked: false,
        refresh: vi.fn(),
      });
    });

    it('should show export ready state with green indicator', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('export-ready')).toBeInTheDocument();
      expect(screen.getByText(/export ready/i)).toBeInTheDocument();
      expect(screen.getByText(/✅/)).toBeInTheDocument();
    });

    it('should show enabled export button', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      const exportButton = screen.getByTestId('export-button');
      expect(exportButton).toBeInTheDocument();
      expect(exportButton).not.toBeDisabled();
      expect(exportButton).toHaveTextContent(/start export/i);
    });

    it('should show export options (site and format selects)', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('export-site-select')).toBeInTheDocument();
      expect(screen.getByTestId('export-format-select')).toBeInTheDocument();
    });

    it('should show completion percentage', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByText(/95%/)).toBeInTheDocument();
      expect(screen.getByText(/80%/)).toBeInTheDocument();
    });

    it('should not show blocked modal', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.queryByText(/export blocked/i)).not.toBeInTheDocument();
    });
  });

  describe('Export Blocked State (completion.ready === false)', () => {
    const mockBlockedCompletion = {
      ready: false,
      completionPct: 65,
      threshold: 80,
      hasBlockingSites: true,
      blockingReasons: [
        {
          type: 'COMPLETION_BELOW_THRESHOLD',
          severity: 'critical' as const,
          message: 'Completion at 65% is below 80% threshold',
        },
        {
          type: 'SITE_BLOCKED',
          severity: 'critical' as const,
          message: 'Site ropi-web is blocked',
          details: { site: 'ropi-web' },
        },
      ],
      operatorExplanation: {
        summary: 'Export is blocked due to completion requirements',
        blockingIssues: [
          'Completion at 65% is below 80% threshold',
          'Site ropi-web is blocked',
        ],
        actionRequired: ['Fill missing required attributes', 'Resolve site blocking issues'],
      },
      catalogStats: {
        totalProducts: 100,
        blockedByCompletionCount: 35,
        blockedBySiteCount: 10,
        readyCount: 55,
      },
    };

    beforeEach(() => {
      mockedUseExportCompletion.mockReturnValue({
        loading: false,
        error: null,
        completion: mockBlockedCompletion,
        exportReady: false,
        exportBlocked: true,
        refresh: vi.fn(),
      });
    });

    it('should show export blocked state with warning indicator', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('export-blocked')).toBeInTheDocument();
      expect(screen.getByText(/🚫/)).toBeInTheDocument();
    });

    it('should show blocked modal with reasons', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      // The ExportBlockedModal should be open
      expect(screen.getByText(/export is blocked due to completion requirements/i)).toBeInTheDocument();
    });

    it('should show completion percentage below threshold', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByText(/65%/)).toBeInTheDocument();
    });

    it('should not show export options when blocked', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.queryByTestId('export-button')).not.toBeInTheDocument();
    });

    it('should show refresh button', () => {
      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByText(/refresh status/i)).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message and retry button', () => {
      mockedUseExportCompletion.mockReturnValue({
        loading: false,
        error: 'Failed to fetch export readiness',
        completion: null,
        exportReady: false,
        exportBlocked: false,
        refresh: vi.fn(),
      });

      render(<ExportPage />, { wrapper: Wrapper });

      expect(screen.getByTestId('export-error')).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch export readiness/i)).toBeInTheDocument();
      expect(screen.getByText(/retry/i)).toBeInTheDocument();
    });

    it('should call refresh when retry is clicked', async () => {
      const mockRefresh = vi.fn();
      mockedUseExportCompletion.mockReturnValue({
        loading: false,
        error: 'Network error',
        completion: null,
        exportReady: false,
        exportBlocked: false,
        refresh: mockRefresh,
      });

      render(<ExportPage />, { wrapper: Wrapper });

      fireEvent.click(screen.getByText(/retry/i));
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
