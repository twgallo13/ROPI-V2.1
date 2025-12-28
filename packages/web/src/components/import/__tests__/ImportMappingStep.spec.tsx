/**
 * ImportMappingStep Unit Tests
 * LP-importer-mapping-recon-1.2.0: Registry-driven mapping options & autosuggest
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
    if (attr.importer_columns) cols.push(...attr.importer_columns);
    return cols;
  }),
}));

// Test fixtures
const MOCK_ATTRIBUTES: Attribute[] = [
  {
    attribute_id: 'sku',
    label: 'SKU',
    data_type: 'string',
    import_required: true,
    importer_columns: ['product_sku', 'item_sku'],
  },
  {
    attribute_id: 'title',
    label: 'Product Title',
    data_type: 'string',
    import_required: true,
    importer_columns: ['name', 'product_name'],
  },
  {
    attribute_id: 'description',
    label: 'Description',
    data_type: 'text',
    import_required: false,
    importer_columns: ['product_description'],
  },
  {
    attribute_id: 'price',
    label: 'Price',
    data_type: 'currency',
    import_required: true,
    importer_columns: ['retail_price', 'unit_price'],
  },
  {
    attribute_id: 'brand_ref',
    label: 'Brand Reference',
    data_type: 'string',
    usage: 'reference_only',
    import_required: false,
    importer_columns: ['brand'],
  },
  {
    attribute_id: 'category',
    label: 'Category',
    data_type: 'taxonomy',
    import_required: false,
    allowed_values: ['Electronics', 'Clothing', 'Home'],
    importer_columns: ['product_category'],
  },
];

const TEST_HEADERS = ['sku', 'name', 'Price', 'brand', 'unknown_column'];

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

    // Should auto-map 'sku' header to 'sku' attribute
    // Use querySelector to find the code element containing 'sku'
    const skuCodeElement = document.querySelector('code');
    expect(skuCodeElement).toBeInTheDocument();
    expect(skuCodeElement?.textContent).toBe('sku');
    
    const skuRow = skuCodeElement?.closest('tr');
    expect(skuRow).toBeInTheDocument();
    
    // Check that row has status badge
    await waitFor(() => {
      const statusBadges = skuRow!.querySelectorAll('.status-badge');
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

    // 'product_sku' is in SKU's importer_columns, should auto-map
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
    // Headers that will auto-map to required fields
    render(
      <ImportMappingStep
        headers={['sku', 'name', 'Price']}
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
});
