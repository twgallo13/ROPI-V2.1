/**
 * Unit Tests for Dynamic MappingReview Component
 * Lisa v2.0 - Phase 2 Dynamic Importer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MappingReview from '../components/MappingReview';
import type { ColumnMapping } from '../utils/csvParser';
import * as attributeRegistry from '../utils/attributeRegistry';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  collection: vi.fn(),
  getDocs: vi.fn(),
}));

describe('MappingReview - Dynamic Registry Integration', () => {
  const mockMappings: ColumnMapping[] = [
    { csvHeader: 'Group', targetField: null, confidence: 'unmapped' },
    { csvHeader: 'Primary Color', targetField: null, confidence: 'unmapped' },
    { csvHeader: 'Variant Count', targetField: null, confidence: 'unmapped' },
  ];

  const mockOnMappingChange = vi.fn();
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load attribute registry on mount', async () => {
    const mockAttributes = [
      {
        key: 'gender',
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'Descriptive',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Gender category',
        importerColumns: ['Gender', 'Group', 'Sex'],
        legacyPaths: [],
      },
      {
        key: 'primaryColor',
        canonicalPath: 'descriptive.primaryColor',
        label: 'Primary Color',
        category: 'Descriptive',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Primary product color',
        importerColumns: ['Primary Color', 'Color Primary'],
        legacyPaths: [],
      },
    ];

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttributes);

    render(
      <MappingReview
        mappings={mockMappings}
        onMappingChange={mockOnMappingChange}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(attributeRegistry.getImportableAttributes).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  });

  it('should display dropdown with descriptive.gender option', async () => {
    const mockAttributes = [
      {
        key: 'gender',
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'Descriptive',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Gender category',
        importerColumns: ['Gender', 'Group', 'Sex'],
        legacyPaths: [],
      },
    ];

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttributes);

    render(
      <MappingReview
        mappings={mockMappings}
        onMappingChange={mockOnMappingChange}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Gender \(descriptive.gender\)/i)).toBeInTheDocument();
    });
  });

  it('should exclude technical.variantCount from options (empty importerColumns)', async () => {
    const mockAttributes = [
      {
        key: 'gender',
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'Descriptive',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Gender category',
        importerColumns: ['Gender', 'Group'],
        legacyPaths: [],
      },
      {
        key: 'variantCount',
        canonicalPath: 'technical.variantCount',
        label: 'Variant Count',
        category: 'Technical',
        dataType: 'number',
        required: false,
        export: false,
        description: 'Calculated variant count',
        importerColumns: [], // EMPTY - non-importable
        legacyPaths: [],
      },
    ];

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue([mockAttributes[0]]); // Only importable

    render(
      <MappingReview
        mappings={mockMappings}
        onMappingChange={mockOnMappingChange}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/Variant Count/i)).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Gender \(descriptive.gender\)/i)).toBeInTheDocument();
    });
  });

  it('should display attributes grouped by category', async () => {
    const mockAttributes = [
      {
        key: 'gender',
        canonicalPath: 'descriptive.gender',
        label: 'Gender',
        category: 'Descriptive',
        dataType: 'string',
        required: false,
        export: true,
        description: 'Gender category',
        importerColumns: ['Gender'],
        legacyPaths: [],
      },
      {
        key: 'mpn',
        canonicalPath: 'sku_core.mpn',
        label: 'MPN',
        category: 'SKU Core',
        dataType: 'string',
        required: true,
        export: true,
        description: 'Manufacturer Part Number',
        importerColumns: ['MPN', 'Mpn'],
        legacyPaths: [],
      },
    ];

    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockResolvedValue(mockAttributes);

    render(
      <MappingReview
        mappings={mockMappings}
        onMappingChange={mockOnMappingChange}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      const select = screen.getAllByRole('combobox')[0];
      expect(select).toBeInTheDocument();
    });

    // Check that optgroups exist (category grouping)
    await waitFor(() => {
      const optgroups = document.querySelectorAll('optgroup');
      expect(optgroups.length).toBeGreaterThan(0);
    });
  });

  it('should handle registry load error gracefully', async () => {
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockRejectedValue(
      new Error('Firestore connection failed')
    );

    render(
      <MappingReview
        mappings={mockMappings}
        onMappingChange={mockOnMappingChange}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Registry error/i)).toBeInTheDocument();
    });
  });

  it('should display loading state initially', () => {
    vi.spyOn(attributeRegistry, 'getImportableAttributes').mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <MappingReview
        mappings={mockMappings}
        onMappingChange={mockOnMappingChange}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getAllByText(/loading/i).length).toBeGreaterThan(0);
  });
});
