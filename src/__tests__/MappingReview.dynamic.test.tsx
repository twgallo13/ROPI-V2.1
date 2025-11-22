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
    { csvHeader: 'Group', targetField: null, confidence: 'Unmapped' },
    { csvHeader: 'Primary Color', targetField: null, confidence: 'Unmapped' },
    { csvHeader: 'Variant Count', targetField: null, confidence: 'Unmapped' },
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
      // Wait for registry to load
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check dropdown contains the option (case-insensitive partial match)
    const options = document.querySelectorAll('option');
    const genderOption = Array.from(options).find(opt => 
      opt.textContent?.toLowerCase().includes('gender') && 
      opt.textContent?.includes('descriptive.gender')
    );
    expect(genderOption).toBeDefined();
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
      // Wait for loading to finish
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check that technical.variantCount is NOT in dropdown options
    const options = document.querySelectorAll('option');
    const variantCountOption = Array.from(options).find(opt => 
      opt.textContent?.includes('technical.variantCount')
    );
    expect(variantCountOption).toBeUndefined();

    // Check gender option exists in dropdown
    const genderOption = Array.from(options).find(opt => 
      opt.textContent?.includes('Gender') && opt.textContent?.includes('descriptive.gender')
    );
    expect(genderOption).toBeDefined();
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
      // Wait for loading to complete
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Check that optgroups exist (category grouping)
    await waitFor(() => {
      const optgroups = document.querySelectorAll('optgroup');
      expect(optgroups.length).toBeGreaterThan(0);
      
      // Verify both categories exist
      const categories = Array.from(optgroups).map(og => og.getAttribute('label'));
      expect(categories).toContain('Descriptive');
      expect(categories).toContain('SKU Core');
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
      // Multiple "Registry error" texts exist (one in header, one per row), use getAllByText
      const errorTexts = screen.getAllByText(/Registry error/i);
      expect(errorTexts.length).toBeGreaterThan(0);
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
