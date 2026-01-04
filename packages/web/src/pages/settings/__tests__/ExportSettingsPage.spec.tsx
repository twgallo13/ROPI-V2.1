/**
 * Export Settings Page — Completion Rules Editor
 * LP-completion-admin-rules-ui-1.3.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ExportSettingsPage from '../ExportSettingsPage';
import {
  fetchCompletionRules,
  saveCompletionRules,
  type CompletionRulesConfig,
} from '@/services/completionRulesClient';

const baseRules: CompletionRulesConfig = {
  schemaVersion: '1.0',
  rulesVersion: 42,
  updatedAt: '2026-01-04T15:45:00Z',
  updatedBy: 'user@example.com',
  exportUnlockThresholdPct: 80,
  builtInSegments: {
    description: { segmentId: 'desc', lockedSemantics: true },
  },
  exclusions: {
    media: { affectsCompletion: false, reason: 'Media excluded by governance' },
    pricing: { affectsCompletion: false, reason: 'Pricing excluded by governance' },
  },
  segments: [
    {
      id: 'desc',
      name: 'Description & SEO',
      enabled: true,
      weightPct: 60,
      ruleType: 'ALL_REQUIRED',
      appliesTo: { mode: 'ALL_PRODUCTS', sites: [] },
      attributeSelector: {
        source: 'REGISTRY',
        categories: ['description', 'seo'],
        requirementFlag: 'required_for_completion',
        siteAware: true,
        includeInternalOnly: false,
        excludeAttributeIds: [],
        staticAttributeIds: [],
      },
    },
    {
      id: 'tech',
      name: 'Technical Specs',
      enabled: true,
      weightPct: 40,
      ruleType: 'ANY_REQUIRED',
      appliesTo: { mode: 'CONDITIONAL', sites: ['shiekh'] },
      attributeSelector: {
        source: 'STATIC',
        categories: [],
        requirementFlag: 'required_for_completion',
        siteAware: false,
        includeInternalOnly: false,
        excludeAttributeIds: [],
        staticAttributeIds: ['attr.color', 'attr.size'],
      },
    },
  ],
};

const cloneRules = (): CompletionRulesConfig =>
  JSON.parse(JSON.stringify(baseRules)) as CompletionRulesConfig;

vi.mock('@/services/completionRulesClient', () => ({
  fetchCompletionRules: vi.fn(() => Promise.resolve(cloneRules())),
  saveCompletionRules: vi.fn(() => Promise.resolve()),
}));

const mockedFetch = vi.mocked(fetchCompletionRules);
const mockedSave = vi.mocked(saveCompletionRules);

async function renderPage() {
  render(
    <MemoryRouter>
      <ExportSettingsPage />
    </MemoryRouter>
  );
  await waitFor(() => {
    expect(screen.getByText('Completion Rules Configuration')).toBeInTheDocument();
  });
}

describe('ExportSettingsPage — Completion Rules Editor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFetch.mockResolvedValue(cloneRules());
  });

  it('shows applies-to mode and attribute selector fields per spec', async () => {
    await renderPage();

    expect(screen.getAllByLabelText(/Applies To Mode/i)[0]).toHaveDisplayValue('All products');
    const attributeSources = screen.getAllByLabelText(/Attribute Source/i);
    expect(attributeSources.length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Categories/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Requirement Flag/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Static Attribute IDs/i)).toBeInTheDocument();
  });

  it('disables save when weights are invalid via live validation', async () => {
    await renderPage();
    const user = userEvent.setup();

    const weightInputs = screen.getAllByLabelText(/Weight/);
    await user.clear(weightInputs[0]);
    await user.type(weightInputs[0], '10');

    await waitFor(() => {
      expect(screen.getByText(/Enabled segment weights must sum to 100%/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });

  it('requires sites when appliesTo is conditional', async () => {
    await renderPage();
    const user = userEvent.setup();

    const appliesSelectors = screen.getAllByLabelText(/Applies To Mode/i);
    await user.selectOptions(appliesSelectors[0], 'CONDITIONAL');

    await waitFor(() => {
      expect(screen.getByText(/is enabled but no sites selected/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
  });

  it('preserves metadata and protected fields on save', async () => {
    await renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockedSave).toHaveBeenCalled();
    });

    const payload = mockedSave.mock.calls[0][0] as CompletionRulesConfig;
    expect(payload.rulesVersion).toBe(baseRules.rulesVersion);
    expect(payload.updatedAt).toBe(baseRules.updatedAt);
    expect(payload.updatedBy).toBe(baseRules.updatedBy);
    expect(payload.builtInSegments).toEqual(baseRules.builtInSegments);
    expect(payload.exclusions).toEqual(baseRules.exclusions);
  });
});
