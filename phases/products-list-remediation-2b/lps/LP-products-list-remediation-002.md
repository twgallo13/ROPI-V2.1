# LP-products-list-remediation-002: Column Configuration

## LP Metadata
- **LP ID**: LP-products-list-remediation-002
- **LP Name**: Column Configuration
- **Phase**: Products List Remediation (products-list-remediation-2b)
- **Status**: Not Started
- **Priority**: P0 (Critical)
- **Estimated Effort**: 4-6 hours
- **Dependencies**: None (can run parallel with LP-001)

## Objective

Configure the Products List table to display exactly seven columns in the specified order: MPN, Brand, Name, Department, Status, Updated (Date), and Import Date (createdAt). Ensure all columns display correct data from Firestore with proper formatting and responsive design.

## Current State Analysis

### Issues with Current Implementation
1. Columns may not match required specification
2. Column order may be incorrect
3. Date formatting may be inconsistent
4. Some required columns may be missing
5. Extraneous columns may be present
6. Responsive layout may not work properly

### Technical Debt
- Column definitions may be scattered across components
- Date formatting logic may be duplicated
- Column configuration may not be centralized

## Requirements

### Functional Requirements

#### FR-1: Exact Column Order
Display columns in this exact order:
1. MPN (Manufacturer Part Number)
2. Brand
3. Name
4. Department
5. Status
6. Updated (Date)
7. Import Date (createdAt)

#### FR-2: Data Mapping
- **MPN**: Map to `product.mpn` or `product.sku` (clarify which)
- **Brand**: Map to `product.brand`
- **Name**: Map to `product.name` or `product.title`
- **Department**: Map to `product.department` or `product.category`
- **Status**: Map to `product.status` (e.g., "Active", "Inactive", "Draft")
- **Updated**: Map to `product.updatedAt` timestamp
- **Import Date**: Map to `product.createdAt` timestamp

#### FR-3: Date Formatting
- Format dates consistently across both date columns
- Use locale-appropriate format or ISO 8601 (YYYY-MM-DD)
- Display date only (no time) for cleaner UI
- Handle null/undefined dates gracefully

#### FR-4: Column Headers
- Clear, unambiguous header labels
- Proper capitalization
- No technical jargon
- Tooltips for clarification (optional)

#### FR-5: Data Display
- Truncate long text values with ellipsis
- Show full value on hover (tooltip)
- Handle missing/null values ("—" or "N/A")
- Proper text alignment (left for text, right for dates)

### Non-Functional Requirements

#### NFR-1: Responsive Design
- Table remains usable on tablets (768px+)
- Horizontal scroll on smaller screens if needed
- Sticky headers (optional enhancement)
- Minimum column widths to prevent crushing

#### NFR-2: Performance
- No performance degradation from current implementation
- Efficient rendering for 50-100 rows
- Virtual scrolling consideration for future (not required)

#### NFR-3: Accessibility
- Column headers use `<th>` with proper scope
- Semantic HTML table structure
- Screen reader friendly
- Keyboard navigable

#### NFR-4: Maintainability
- Centralized column configuration
- Reusable date formatting utility
- Type-safe column definitions (TypeScript)
- Clear documentation

## Technical Implementation

### Architecture

#### Column Definition Structure
```typescript
interface ColumnConfig {
  id: string;
  label: string;
  field: keyof Product | string; // Firestore field path
  type: 'text' | 'date' | 'status';
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  format?: (value: any) => string;
  sortable?: boolean;
}

const PRODUCT_COLUMNS: ColumnConfig[] = [
  {
    id: 'mpn',
    label: 'MPN',
    field: 'mpn',
    type: 'text',
    width: 120,
    align: 'left',
    sortable: true
  },
  {
    id: 'brand',
    label: 'Brand',
    field: 'brand',
    type: 'text',
    width: 120,
    align: 'left',
    sortable: true
  },
  {
    id: 'name',
    label: 'Name',
    field: 'name',
    type: 'text',
    width: 250,
    align: 'left',
    sortable: true
  },
  {
    id: 'department',
    label: 'Department',
    field: 'department',
    type: 'text',
    width: 120,
    align: 'left',
    sortable: true
  },
  {
    id: 'status',
    label: 'Status',
    field: 'status',
    type: 'status',
    width: 100,
    align: 'left',
    sortable: true
  },
  {
    id: 'updated',
    label: 'Updated',
    field: 'updatedAt',
    type: 'date',
    width: 110,
    align: 'right',
    format: formatDate,
    sortable: true
  },
  {
    id: 'importDate',
    label: 'Import Date',
    field: 'createdAt',
    type: 'date',
    width: 110,
    align: 'right',
    format: formatDate,
    sortable: true
  }
];
```

#### Date Formatting Utility
```typescript
// src/utils/dateFormatting.ts
export function formatDate(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '—';
  
  const date = timestamp instanceof Timestamp 
    ? timestamp.toDate() 
    : timestamp;
  
  // ISO 8601 format: YYYY-MM-DD
  return date.toISOString().split('T')[0];
  
  // Alternative: Locale-specific
  // return date.toLocaleDateString('en-US', {
  //   year: 'numeric',
  //   month: 'short',
  //   day: 'numeric'
  // });
}

export function formatDateTime(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '—';
  
  const date = timestamp instanceof Timestamp 
    ? timestamp.toDate() 
    : timestamp;
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
```

### Implementation Steps

#### Step 1: Create Column Configuration
- Create `columnConfig.ts` with complete column definitions
- Define TypeScript interfaces for type safety
- Export column configuration as constant

#### Step 2: Create Date Formatting Utilities
- Create `dateFormatting.ts` with reusable date formatters
- Handle Firestore Timestamp conversion
- Add null/undefined handling
- Write unit tests for formatters

#### Step 3: Update Product Table Component
- Import column configuration
- Refactor to use configuration-driven rendering
- Remove any hardcoded column definitions
- Ensure column order matches specification

#### Step 4: Implement Cell Rendering
- Create reusable cell renderer based on column type
- Implement text truncation with tooltips
- Add null value handling
- Style dates with right alignment

#### Step 5: Update Table Headers
- Render headers from column configuration
- Ensure proper semantic HTML (`<th>`)
- Add sort indicators (if sorting implemented)
- Verify accessibility attributes

#### Step 6: Responsive Styling
- Add responsive CSS/styling
- Test on tablet and desktop breakpoints
- Implement horizontal scroll for small screens
- Verify column widths work as expected

#### Step 7: Field Mapping Verification
- Verify each Firestore field mapping in staging
- Confirm data displays correctly for all columns
- Test with products that have missing fields
- Document any field name discrepancies

### Files to Modify

```
src/
├── config/
│   └── productColumns.ts (CREATE)
├── utils/
│   ├── dateFormatting.ts (CREATE)
│   └── dateFormatting.test.ts (CREATE)
├── components/
│   ├── Products/
│   │   ├── ProductTable.tsx (MODIFY)
│   │   ├── ProductTableHeader.tsx (MODIFY/CREATE)
│   │   ├── ProductTableRow.tsx (MODIFY/CREATE)
│   │   └── ProductTableCell.tsx (CREATE)
│   └── common/
│       └── Tooltip.tsx (USE EXISTING or CREATE)
└── types/
    └── product.ts (VERIFY/UPDATE)
```

### Styling Requirements

```css
/* ProductTable.module.css */
.productTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.productTable th {
  text-align: left;
  padding: 12px 8px;
  background-color: #f5f5f5;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
}

.productTable td {
  padding: 12px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.cellTruncate {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.alignRight {
  text-align: right;
}

.statusBadge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.statusActive {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.statusInactive {
  background-color: #fce4ec;
  color: #c62828;
}

.statusDraft {
  background-color: #fff3e0;
  color: #e65100;
}

@media (max-width: 768px) {
  .productTable {
    display: block;
    overflow-x: auto;
  }
}
```

## Acceptance Criteria

### AC-1: Column Order
- [ ] Columns appear in exact order: MPN, Brand, Name, Department, Status, Updated, Import Date
- [ ] No additional columns present
- [ ] All seven required columns present

### AC-2: Data Mapping
- [ ] MPN displays correct value from Firestore
- [ ] Brand displays correct value from Firestore
- [ ] Name displays correct value from Firestore
- [ ] Department displays correct value from Firestore
- [ ] Status displays correct value from Firestore
- [ ] Updated displays correct date from updatedAt
- [ ] Import Date displays correct date from createdAt

### AC-3: Date Formatting
- [ ] Both date columns use same format
- [ ] Dates are readable and unambiguous
- [ ] Null dates display as "—" or "N/A"
- [ ] Format is consistent across all rows

### AC-4: Column Headers
- [ ] Headers match specification exactly
- [ ] Headers are properly capitalized
- [ ] Headers use semantic `<th>` elements
- [ ] Headers have proper ARIA attributes

### AC-5: Text Display
- [ ] Long text values truncate with ellipsis
- [ ] Full text visible on hover (tooltip)
- [ ] Null values display as "—" or "N/A"
- [ ] Text alignment appropriate for data type

### AC-6: Responsive Design
- [ ] Table usable on 768px width screen
- [ ] Horizontal scroll works on smaller screens
- [ ] Column widths appropriate for content
- [ ] No layout breaking or overlap

### AC-7: Status Display
- [ ] Status values display with appropriate styling
- [ ] Different statuses visually distinguishable
- [ ] Status badge/pill format (optional but nice)

## Testing Strategy

### Unit Tests
```typescript
describe('dateFormatting', () => {
  it('should format Firestore Timestamp correctly');
  it('should format Date object correctly');
  it('should return "—" for null');
  it('should return "—" for undefined');
  it('should handle invalid dates gracefully');
});

describe('ProductTableCell', () => {
  it('should render text cell correctly');
  it('should render date cell with formatted date');
  it('should render status cell with badge');
  it('should truncate long text');
  it('should show tooltip on hover');
  it('should handle null values');
});

describe('PRODUCT_COLUMNS', () => {
  it('should have exactly 7 columns');
  it('should have columns in correct order');
  it('should have all required fields defined');
});
```

### Integration Tests
```typescript
describe('ProductTable Column Integration', () => {
  it('should render all columns in correct order');
  it('should display product data in correct columns');
  it('should format dates consistently');
  it('should handle products with missing fields');
});
```

### Visual Regression Tests
```typescript
describe('ProductTable Visual', () => {
  it('should match column layout snapshot');
  it('should match date formatting snapshot');
  it('should match status badge snapshot');
});
```

## Evidence Requirements

### Screenshots
1. Product table showing all 7 columns in correct order with headers visible
2. Close-up of date columns showing consistent formatting
3. Product row with all fields populated
4. Product row with some null fields showing "—"
5. Status column showing different status values
6. Long text truncation with ellipsis
7. Responsive view on tablet width

### Code Evidence
- Link to PR with column configuration implementation
- Test coverage report for dateFormatting utility
- Screenshot of TypeScript types/interfaces

### Data Verification
- Console log or screenshot showing Firestore field mapping
- Confirmation that all 7 fields exist in Firestore schema

## Risks and Mitigations

### Risk 1: Field Name Mismatch
**Risk**: Firestore field names may not match assumptions (e.g., "title" vs "name").

**Mitigation**:
- Audit existing Firestore documents in staging
- Create field mapping documentation
- Use defensive coding for missing fields
- Add data migration if needed

### Risk 2: Date Conversion Issues
**Risk**: Firestore Timestamps may not convert correctly to dates.

**Mitigation**:
- Thoroughly test Timestamp conversion
- Handle both Timestamp and Date objects
- Add error boundaries for date rendering
- Log date conversion errors to console

### Risk 3: Responsive Layout Breaking
**Risk**: Table may break on small screens or with many columns.

**Mitigation**:
- Test on multiple screen sizes
- Implement graceful horizontal scroll
- Consider alternative layouts for mobile (future)
- Set minimum column widths

### Risk 4: Performance with Text Truncation
**Risk**: Tooltip/truncation logic could slow rendering with many rows.

**Mitigation**:
- Use CSS-only truncation where possible
- Lazy-load tooltips on hover
- Profile performance with 100 rows
- Optimize tooltip implementation

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests for date formatting passing (>90% coverage)
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] Evidence artifacts captured (screenshots)
- [ ] No visual regressions
- [ ] Documentation updated with field mappings
- [ ] Ledger updated with completion status

## Success Metrics

- **Accuracy**: 100% correct column order and data mapping
- **Consistency**: All dates use same format
- **Coverage**: Test coverage > 90% for formatting utilities
- **Accessibility**: 0 WCAG violations for table

## Dependencies and Coordination

- Can be implemented in parallel with LP-001 (Pagination)
- Should be completed before LP-003 (Delete) to ensure delete UI shows correct columns
- Date formatting utilities will be reused in other components

---

**LP Version**: 1.0  
**Created**: 2026-01-09  
**Last Updated**: 2026-01-09  
**Status**: Ready for Implementation
