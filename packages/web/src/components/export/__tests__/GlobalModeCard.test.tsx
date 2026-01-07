/**
 * GlobalModeCard Unit Tests
 * LP-export-global-impl-2b | HES B/C Implementation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GlobalModeCard, ProductLevelReadiness } from '../GlobalModeCard';

describe('GlobalModeCard Component', () => {
  const mockReadiness: ProductLevelReadiness = {
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
  };

  it('should render GlobalModeCard with basic information', () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={false}
      />
    );

    // Check title
    expect(screen.getByText(/Global Mode/i)).toBeInTheDocument();

    // Check completion percentage
    expect(screen.getByText('85%')).toBeInTheDocument();

    // Check status badge
    expect(screen.getByText('✅ Ready')).toBeInTheDocument();
  });

  it('should show threshold info when provided', () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={false}
      />
    );

    expect(screen.getByText(/Threshold:/)).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('should render segment breakdown table', () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={false}
      />
    );

    // Check table headers
    expect(screen.getByText('Segment')).toBeInTheDocument();
    expect(screen.getByText('Score')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();

    // Check segment data
    expect(screen.getByText('Core Attributes')).toBeInTheDocument();
    expect(screen.getByText('Product Classification')).toBeInTheDocument();
  });

  it('should show missing global attributes', () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={false}
      />
    );

    expect(screen.getByText(/Missing Global Attributes/i)).toBeInTheDocument();
    // Check specifically in the missing list
    const missingList = screen.getByRole('list', {
      hidden: false,
    });
    expect(missingList).toHaveTextContent('department');
  });

  it('should render sites evaluated section as collapsible', async () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={false}
      />
    );

    const toggleButton = screen.getByRole('button', {
      name: /Sites Evaluated/i,
    });

    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    await userEvent.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');

    // Check sites are visible
    expect(screen.getByText('ropi-web')).toBeInTheDocument();
    expect(screen.getByText('ropi-app')).toBeInTheDocument();
  });

  it('should show blocked status when isBlocked is true', () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={true}
      />
    );

    expect(screen.getByText('❌ Blocked')).toBeInTheDocument();
  });

  it('should display blocking segments when present', () => {
    const readinessWithBlocking: ProductLevelReadiness = {
      ...mockReadiness,
      blockingSegments: ['Product Classification', 'Pricing'],
    };

    render(
      <GlobalModeCard
        productLevelReadiness={readinessWithBlocking}
        threshold={80}
        isBlocked={true}
      />
    );

    expect(screen.getByText(/Blocking Segments/i)).toBeInTheDocument();
    // Check that both blocking items are in the DOM
    const blockingSection = screen.getByText(/Blocking Segments/i).closest('.blocking-section');
    expect(blockingSection).toHaveTextContent('Product Classification');
    expect(blockingSection).toHaveTextContent('Pricing');
  });

  it('should handle completion below threshold', () => {
    const lowReadiness: ProductLevelReadiness = {
      ...mockReadiness,
      aggregatedCompletionPct: 60,
    };

    render(
      <GlobalModeCard
        productLevelReadiness={lowReadiness}
        threshold={80}
        isBlocked={true}
      />
    );

    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('should render null when productLevelReadiness is missing', () => {
    const { container } = render(
      <GlobalModeCard productLevelReadiness={null as any} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should have proper accessibility attributes', () => {
    render(
      <GlobalModeCard
        productLevelReadiness={mockReadiness}
        threshold={80}
        isBlocked={false}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '85');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });
});
