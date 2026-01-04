/**
 * ExportBlockedModal — LP-completion-user-visibility-ui-1.4.0
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExportBlockedModal } from '../ExportBlockedModal';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ExportBlockedModal', () => {
  it('renders operator explanation and allows navigating to blocked product', () => {
    render(
      <MemoryRouter>
        <ExportBlockedModal
          open
          onClose={() => {}}
          summary="Export blocked by completion"
          blockingReasons={[
            {
              type: 'SITE_BLOCK',
              severity: 'ERROR',
              message: 'US site missing title',
              details: { productId: 'prod-123', site: 'us', currentCompletion: 40, requiredCompletion: 80 },
            },
          ]}
          catalogStats={{ totalProducts: 10, readyCount: 5, blockedByCompletionCount: 3, blockedBySiteCount: 2 }}
          operatorExplanation={{
            summary: 'Missing US title',
            blockingIssues: ['US title missing'],
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
            actionRequired: ['Fill US title'],
          }}
        />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/Export Blocked/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/Missing US title/i)).toBeInTheDocument();
    expect(screen.getByText(/Completion by Segment/i)).toBeInTheDocument();
    expect(screen.getByText(/What to do next/i)).toBeInTheDocument();

    const viewButtons = screen.getAllByText(/View/i);
    fireEvent.click(viewButtons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/products/prod-123');
  });
});
