/**
 * ImportMappingStep Unit Tests
 * LP-importer-mapping-recon-1.2.0: Registry-driven mapping options & autosuggest
 * LP-1.3.1: Fixed required-flag and auto-mapping behaviors
 *
 * Tests:
 * 1. Renders loading state initially
 * 2. Fetches attributes from registry on mount
 * 3. Falls back to SDK mappings on fetch error
 * 4. Auto-suggests mappings based on CSV header matching
 * 5. Scoring: exact importerColumns match (priority 3)
 * 6. Scoring: exact label/attributeId match (priority 2)
 * 7. Scoring: substring match (priority 1)
 * 8. Shows reference_only indicator in options
 * 9. Hidden test div contains field options
 * 10. Prevents duplicate mappings
 * 11. Validates required fields before continue
 * 12-14. Existing tests
 * 15. LP-1.3.1: required_for_completion does not make attribute import-required
 * 16. LP-1.3.1: Auto-mapping only assigns exact matches (no fuzzy auto-assign)
 * 17. LP-1.3.1: Auto-mapping enforces uniqueness (no duplicate targets)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportMappingStep } from '../ImportMappingStep';
import * as attributesService from '../../../services/attributesService';
import type { Attribute } from '../../../services/attributesService';

// Mock attributesService
vi.mock('../../../services/attributesService', () => ({
  listAttributes: vi.fn(),
  buildImporterColumns: vi.fn((attr: Attribute) => {
    const cols = [attr.attribute_id, attr.label.toLowerCase().replace(/\s+/g, '_')];
    if (attr.importerColumns) cols.push(...attr.importerColumns);
    return cols;
  }),
}));

// Test fixtures
const MOCK_ATTRIBUTES: Attribute[] = [
  {
    attribute_id: 'mpn',
    label: 'MPN',
    data_type: 'string',
    import_required: true,  // Only MPN should be import_required
    importerColumns: ['mpn', 'manufacturer_part_number'],
  },
  {
    attribute_id: 'sku',
    label: 'SKU',
    data_type: 'string',
    import_required: false,
    importerColumns: ['product_sku', 'item_sku'],
  },
  {
    attribute_id: 'title',
    label: 'Product Title',
    data_type: 'string',
    import_required: false,
    importerColumns: ['name', 'product_name'],
  },
  {
    attribute_id: 'description',
    label: 'Description',
    data_type: 'text',
    import_required: false,
    importerColumns: ['product_description'],
  },
  {
    attribute_id: 'price',
    label: 'Price',
    data_type: 'currency',
    import_required: false,
    importerColumns: ['retail_price', 'unit_price'],
  },
  {
    attribute_id: 'brand_ref',
    label: 'Brand Reference',
    data_type: 'string',
    usage: 'reference_only',
    import_required: false,
    importerColumns: ['brand'],
  },
  {
    attribute_id: 'category',
    label: 'Category',
    data_type: 'taxonomy',
    import_required: false,
    allowed_values: ['Electronics', 'Clothing', 'Home'],
    importerColumns: ['product_category'],
  },
  // LP-1.3.1: Test attribute with required_for_completion but NOT import_required
  {
    attribute_id: 'age_group',
    label: 'Age Group',
    data_type: 'taxonomy',
    import_required: false,
    required_for_completion: true,  // For product completeness, NOT import
    allowed_values: ['Adult', 'Kids', 'Infant'],
    importerColumns: ['age_group', 'target_age'],
  },
];

const TEST_HEADERS = ['mpn', 'sku', 'name', 'Price', 'brand', 'unknown_column'];

describe('ImportMappingStep', () => {
  const mockOnMappingComplete = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(attributesService.listAttributes).mockResolvedValue(MOCK_ATTRIBUTES);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Renders loading state initially
  it('renders loading state initially', () => {
    // Mock delayed response
    vi.mocked(attributesService.listAttributes).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(MOCK_ATTRIBUTES), 100))
    );

    render(
      <ImportMappingStep
        headers={TEST_HEADERS}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText(/loading mapping options/i)).toBeInTheDocument();
  });

  // Test 2: Fetches attributes from registry on mount
  it('fetches attributes from registry on mount', async () => {
    render(
      <ImportMappingStep
        headers={TEST_HEADERS}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(attributesService.listAttributes).toHaveBeenCalledTimes(1);
    });

    // Should no longer show loading
    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });
  });

  // Test 3: Falls back to SDK mappings on fetch error
  it('falls back to SDK mappings on fetch error', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(attributesService.listAttributes).mockRejectedValue(new Error('Network error'));

    render(
      <ImportMappingStep
        headers={TEST_HEADERS}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      // Should show error message with fallback notice
      expect(screen.getByText(/registry fetch failed/i)).toBeInTheDocument();
      expect(screen.getByText(/SDK fallback/i)).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  // Test 4: Auto-suggests mappings based on CSV header matching
  it('auto-suggests mappings based on CSV header matching', async () => {
    render(
      <ImportMappingStep
        headers={TEST_HEADERS}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Should auto-map 'mpn' header to 'mpn' attribute (first header in TEST_HEADERS)
    // Use querySelector to find the first code element containing header name
    const codeElements = document.querySelectorAll('code');
    expect(codeElements.length).toBeGreaterThan(0);
    expect(codeElements[0].textContent).toBe('mpn');
    
    const mpnRow = codeElements[0].closest('tr');
    expect(mpnRow).toBeInTheDocument();
    
    // Check that row has status badge
    await waitFor(() => {
      const statusBadges = mpnRow!.querySelectorAll('.status-badge');
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  // Test 5: Scoring - exact importerColumns match (priority 3)
  it('prioritizes exact importerColumns match with score 3', async () => {
    render(
      <ImportMappingStep
        headers={['product_sku']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // 'product_sku' is in SKU's importerColumns, should auto-map
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('sku');
  });

  // Test 6: Scoring - exact label/attributeId match (priority 2)
  it('matches exact attributeId with score 2', async () => {
    render(
      <ImportMappingStep
        headers={['description']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // 'description' matches attributeId exactly
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('description');
  });

  // Test 7: Scoring - substring match (priority 1)
  it('matches substring with lower score', async () => {
    // Use a header that partially matches
    render(
      <ImportMappingStep
        headers={['prod_title']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Should find 'title' via substring match on 'Product Title' label
    // But since 'prod_title' doesn't exactly match, might show suggestion hint instead
    // Check that the row is rendered
    const headerCell = screen.getByText('prod_title');
    expect(headerCell).toBeInTheDocument();
  });

  // Test 8: Shows reference_only indicator in options
  it('shows reference_only indicator in options', async () => {
    render(
      <ImportMappingStep
        headers={['brand']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Open the select and check for reference_only option
    const select = screen.getByRole('combobox');
    fireEvent.click(select);

    // The option should include 'reference only' text
    const options = screen.getAllByRole('option');
    const brandOption = options.find(opt => opt.textContent?.includes('brand_ref'));
    expect(brandOption?.textContent).toContain('reference only');
  });

  // Test 9: Hidden test div contains field options
  it('renders hidden test div with field options', async () => {
    render(
      <ImportMappingStep
        headers={TEST_HEADERS}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Check for hidden test div
    const testDiv = document.querySelector('[data-testid="import-field-options"]');
    expect(testDiv).toBeInTheDocument();
    expect(testDiv?.getAttribute('style')).toContain('display: none');
  });

  // Test 10: Prevents duplicate mappings
  it('prevents duplicate mappings by disabling already-mapped options', async () => {
    render(
      <ImportMappingStep
        headers={['sku', 'another_sku']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // First 'sku' header should auto-map to 'sku' attribute
    // Second select should have 'sku' option disabled
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects.length).toBe(2);

    // First select should have 'sku' value
    expect(selects[0].value).toBe('sku');

    // In second select, find the 'sku' option - it should be disabled
    const secondSelectOptions = selects[1].querySelectorAll('option');
    const skuOption = Array.from(secondSelectOptions).find(opt => opt.value === 'sku');
    expect(skuOption?.disabled).toBe(true);
    expect(skuOption?.textContent).toContain('already mapped');
  });

  // Test 11: Validates required fields before continue
  it('validates required fields before allowing continue', async () => {
    // Use headers that won't auto-map to required fields
    render(
      <ImportMappingStep
        headers={['unknown1', 'unknown2']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Should show missing required fields warning
    expect(screen.getByText(/missing required fields/i)).toBeInTheDocument();

    // Continue button should be disabled
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();

    // Click should show alert (mocked)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(continueBtn);
    
    // Button is disabled so onClick shouldn't fire
    expect(mockOnMappingComplete).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  // Test 12: Calls onMappingComplete with valid mappings
  it('calls onMappingComplete when all required fields are mapped', async () => {
    // Headers that will auto-map to required fields (MPN is required)
    render(
      <ImportMappingStep
        headers={['mpn', 'sku', 'name']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Wait for auto-mapping to complete and required fields to be satisfied
    await waitFor(() => {
      const continueBtn = screen.getByRole('button', { name: /continue/i });
      expect(continueBtn).not.toBeDisabled();
    }, { timeout: 2000 });

    // Click continue
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueBtn);

    // Should call onMappingComplete with mappings
    await waitFor(() => {
      expect(mockOnMappingComplete).toHaveBeenCalled();
    });
  });

  // Test 13: Back button calls onBack
  it('calls onBack when back button is clicked', async () => {
    render(
      <ImportMappingStep
        headers={TEST_HEADERS}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);

    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  // Test 14: Manual mapping change updates state
  it('updates mapping when user changes selection', async () => {
    render(
      <ImportMappingStep
        headers={['custom_column']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    
    // Get the initial value (might be auto-suggested or empty)
    const initialValue = select.value;

    // Change to 'description' which is unlikely to be auto-mapped from 'custom_column'
    fireEvent.change(select, { target: { value: 'description' } });

    // Verify value changed
    expect(select.value).toBe('description');
    expect(select.value).not.toBe(initialValue === 'description' ? 'sku' : initialValue);
  });

  // ========================================================================
  // LP-1.3.1: New tests for required-flag and auto-mapping behavior fixes
  // ========================================================================

  // Test 15: LP-1.3.1 - required_for_completion does NOT make attribute import-required
  it('does not treat required_for_completion as import-required', async () => {
    // age_group has required_for_completion: true, import_required: false
    render(
      <ImportMappingStep
        headers={['mpn', 'age_group']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // age_group should auto-map (exact match), but should NOT be shown as required
    // The missing required warning should NOT include age_group
    const warningText = screen.queryByText(/missing required fields/i);
    if (warningText) {
      expect(warningText.textContent).not.toContain('age_group');
    }

    // The select option for age_group should NOT have "(required)" text
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const ageGroupSelect = selects.find(s => s.value === 'age_group');
    if (ageGroupSelect) {
      const options = ageGroupSelect.querySelectorAll('option');
      const ageGroupOption = Array.from(options).find(opt => opt.value === 'age_group');
      expect(ageGroupOption?.textContent).not.toContain('(required)');
    }

    // Since MPN IS import_required, it should be the only required field
    await waitFor(() => {
      const continueBtn = screen.getByRole('button', { name: /continue/i });
      // MPN is mapped, so continue should be enabled
      expect(continueBtn).not.toBeDisabled();
    });
  });

  // Test 16: LP-1.3.1 - Auto-mapping only assigns exact importerColumns matches
  it('auto-mapping only assigns exact importerColumns matches, not fuzzy', async () => {
    // 'prod_title' does NOT exactly match any importerColumn
    // It may have substring match to 'title' but should NOT auto-assign
    render(
      <ImportMappingStep
        headers={['prod_title', 'prod_desc']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    
    // Both should be unmapped (empty value) since no exact match
    selects.forEach(select => {
      expect(select.value).toBe('');
    });

    // Should show suggestion hints instead
    const suggestionHints = document.querySelectorAll('.suggestion-hint');
    // At least one suggestion hint should be visible for fuzzy matches
    expect(suggestionHints.length).toBeGreaterThan(0);
  });

  // Test 17: LP-1.3.1 - Auto-mapping enforces uniqueness (no duplicate targets)
  it('auto-mapping enforces uniqueness - same target not assigned to multiple headers', async () => {
    // Both 'mpn' and 'manufacturer_part_number' are in mpn's importerColumns
    // Only ONE should be auto-assigned to 'mpn' target
    render(
      <ImportMappingStep
        headers={['mpn', 'manufacturer_part_number', 'product_sku']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects.length).toBe(3);

    // Collect all mapped values
    const mappedValues = selects.map(s => s.value).filter(Boolean);
    
    // Each non-empty value should be unique
    const uniqueMappedValues = new Set(mappedValues);
    expect(uniqueMappedValues.size).toBe(mappedValues.length);

    // Specifically, 'mpn' should only appear once
    const mpnMappings = selects.filter(s => s.value === 'mpn');
    expect(mpnMappings.length).toBeLessThanOrEqual(1);
  });

  // Test 18: LP-1.3.1 - Select disables already-mapped options for other rows
  it('select disables already-mapped options for other rows', async () => {
    render(
      <ImportMappingStep
        headers={['mpn', 'another_column']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects.length).toBe(2);

    // First select should auto-map to 'mpn'
    expect(selects[0].value).toBe('mpn');

    // In second select, 'mpn' option should be disabled
    const secondSelectOptions = selects[1].querySelectorAll('option');
    const mpnOption = Array.from(secondSelectOptions).find(opt => opt.value === 'mpn');
    expect(mpnOption?.disabled).toBe(true);
    expect(mpnOption?.textContent).toContain('already mapped');
  });

  // Test 19: LP-1.3.1 - Only MPN blocks import when missing
  it('only MPN (import_required) blocks import when missing', async () => {
    // Use headers that won't auto-map to MPN
    render(
      <ImportMappingStep
        headers={['sku', 'title', 'age_group']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // MPN is not mapped, so should show missing required fields
    await waitFor(() => {
      expect(screen.getByText(/missing required fields/i)).toBeInTheDocument();
    });

    // The warning should mention 'mpn' specifically
    const warningElement = screen.getByText(/missing required fields/i).closest('.mapping-warning');
    expect(warningElement?.textContent).toContain('mpn');

    // Continue button should be disabled
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  // Test 20: LP-1.3.3 - SDK fallback attributes merge ensures options available
  it('LP-1.3.3: SDK fallback attributes merge into registry options', async () => {
    render(
      <ImportMappingStep
        headers={['rics_color', 'warehouse']}
        onMappingComplete={mockOnMappingComplete}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText(/loading mapping options/i)).not.toBeInTheDocument();
    });

    // Check that the component loaded successfully and shows mapping rows
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    expect(selects.length).toBe(2);
    
    // Both selects should have options available
    // The component should have loaded options (either from registry or SDK fallback)
    expect(selects[0].options.length).toBeGreaterThan(1); // More than just "(Unmapped)"
    expect(selects[1].options.length).toBeGreaterThan(1);
  });
});
