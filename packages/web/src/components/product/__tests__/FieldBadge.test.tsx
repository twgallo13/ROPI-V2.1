/**
 * FieldBadge Component Tests
 * S5 — Product UI: Provenance UX & Edit Behavior
 * LP-smart-rules-ui-provenance-1.0.0
 * 
 * Tests:
 * 1. Badge rendering - Shows badge only for Smart Rule provenance
 * 2. Tooltip content - Displays rule name, ID, reason, etc.
 * 3. Accessibility - Keyboard navigation, ARIA labels
 * 4. Edge cases - Missing provenance, different source types
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldBadge } from '../FieldBadge';
import type { FieldProvenance } from '../../../types/product';

describe('FieldBadge', () => {
  const mockSmartRuleProvenance: FieldProvenance = {
    source: 'smartRule',
    ruleId: 'rule_gender_from_rics',
    ruleName: 'Gender from RICS Category',
    appliedAt: '2025-01-15T10:30:00.000Z',
    input: {
      ricsCategory: "Men's Footwear",
    },
    reason: 'Matched RICS category pattern for Men',
  };

  const mockHumanProvenance: FieldProvenance = {
    source: 'human',
    appliedAt: '2025-01-15T11:00:00.000Z',
    actor: 'user@example.com',
  };

  describe('Rendering', () => {
    it('renders badge for Smart Rule provenance', () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('field-badge', 'field-badge--smart-rule');
    });

    it('renders nothing when provenance is undefined', () => {
      const { container } = render(
        <FieldBadge
          provenance={undefined}
          fieldPath="attributes.gender"
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when provenance source is human', () => {
      const { container } = render(
        <FieldBadge
          provenance={mockHumanProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when provenance source is import', () => {
      const importProvenance: FieldProvenance = {
        source: 'import',
        appliedAt: '2025-01-15T10:00:00.000Z',
      };
      
      const { container } = render(
        <FieldBadge
          provenance={importProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('displays lightning bolt icon as SVG', () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      // The lightning bolt is an SVG, check for the svg element with class field-badge__icon
      const icon = document.querySelector('.field-badge__icon');
      expect(icon).toBeInTheDocument();
      expect(icon?.tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('Tooltip Content', () => {
    it('shows tooltip on click', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('displays rule name in tooltip', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByText('Gender from RICS Category')).toBeInTheDocument();
      });
    });

    it('displays rule ID in tooltip', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByText('rule_gender_from_rics')).toBeInTheDocument();
      });
    });

    it('displays reason in tooltip', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByText('Matched RICS category pattern for Men')).toBeInTheDocument();
      });
    });

    it('displays input RICS category in tooltip', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByText("Men's Footwear")).toBeInTheDocument();
      });
    });

    it('displays field path in tooltip', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByText('attributes.gender')).toBeInTheDocument();
      });
    });

    it('displays formatted date in tooltip', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        // Should show a formatted date like "Jan 15, 2025"
        expect(screen.getByText(/Jan 15, 2025/i)).toBeInTheDocument();
      });
    });

    it('hides tooltip on second click', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      
      // First click - show tooltip
      fireEvent.click(badge);
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      // Second click - hide tooltip
      fireEvent.click(badge);
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Accessibility', () => {
    it('opens tooltip on Enter key', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      badge.focus();
      fireEvent.keyDown(badge, { key: 'Enter' });
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('opens tooltip on Space key', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      badge.focus();
      fireEvent.keyDown(badge, { key: ' ' });
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('closes tooltip on Escape key', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(badge, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('has correct ARIA attributes', () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      expect(badge).toHaveAttribute('aria-expanded', 'false');
      expect(badge).toHaveAttribute('aria-label');
    });

    it('updates aria-expanded when tooltip is open', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      expect(badge).toHaveAttribute('aria-expanded', 'false');
      
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(badge).toHaveAttribute('aria-expanded', 'true');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles provenance without optional fields', async () => {
      const minimalProvenance: FieldProvenance = {
        source: 'smartRule',
        ruleId: 'rule_minimal',
        appliedAt: '2025-01-15T10:30:00.000Z',
      };
      
      render(
        <FieldBadge
          provenance={minimalProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText('rule_minimal')).toBeInTheDocument();
      });
    });

    it('handles empty input object', async () => {
      const provenanceWithEmptyInput: FieldProvenance = {
        source: 'smartRule',
        ruleId: 'rule_test',
        appliedAt: '2025-01-15T10:30:00.000Z',
        input: {},
      };
      
      render(
        <FieldBadge
          provenance={provenanceWithEmptyInput}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('handles invalid date string gracefully', async () => {
      const provenanceWithBadDate: FieldProvenance = {
        source: 'smartRule',
        ruleId: 'rule_test',
        appliedAt: 'not-a-date',
      };
      
      render(
        <FieldBadge
          provenance={provenanceWithBadDate}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        // Should still render tooltip without crashing
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('handles very long rule names', async () => {
      const longNameProvenance: FieldProvenance = {
        source: 'smartRule',
        ruleId: 'rule_test',
        ruleName: 'This is a very long rule name that should be handled gracefully without breaking the layout or causing overflow issues',
        appliedAt: '2025-01-15T10:30:00.000Z',
      };
      
      render(
        <FieldBadge
          provenance={longNameProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
        expect(screen.getByText(/This is a very long rule name/)).toBeInTheDocument();
      });
    });
  });

  describe('Admin Link', () => {
    it('renders link to admin rule view when ruleId is present', async () => {
      render(
        <FieldBadge
          provenance={mockSmartRuleProvenance}
          fieldPath="attributes.gender"
        />
      );
      
      const badge = screen.getByRole('button', { name: /smart rule/i });
      fireEvent.click(badge);
      
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /view rule/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', expect.stringContaining('rule_gender_from_rics'));
      });
    });
  });
});
