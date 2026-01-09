# LP-products-list-remediation-005: Data Refresh and Testing

## LP Metadata
- **LP ID**: LP-products-list-remediation-005
- **LP Name**: Data Refresh and Testing
- **Phase**: Products List Remediation (products-list-remediation-2b)
- **Status**: Not Started
- **Priority**: P0 (Critical)
- **Estimated Effort**: 12-18 hours
- **Dependencies**: LP-001, LP-002, LP-003, LP-004 (All previous LPs)

## Objective

Implement real-time or near-real-time data refresh mechanisms so the Products List automatically reflects imports and edits without manual refresh. Develop comprehensive unit, integration, and E2E test coverage for all Products List features. Ensure CI passes with green tests and all acceptance criteria are met with evidence.

## Current State Analysis

### Issues with Current Implementation
1. Products list may not update after imports
2. Edits to products may not reflect in list
3. May require manual page refresh to see changes
4. No real-time listeners implemented
5. Test coverage may be insufficient
6. E2E tests may not cover critical flows

### Technical Debt
- Real-time listener infrastructure may not exist
- Test framework may need setup/configuration
- CI pipeline may need updates for new tests
- Performance monitoring not implemented

## Requirements

### Part A: Data Refresh Requirements

#### FR-1: Real-Time Product Updates
- Products list updates automatically when products are edited
- Updates appear without full page reload
- Only affected products re-render (optimize performance)
- Works across browser tabs
- Graceful degradation if real-time connection lost

#### FR-2: New Product Detection
- Newly imported products appear in list automatically
- List updates within 5 seconds of import completion
- Pagination updates to reflect new count
- New products appear in correct sort order

#### FR-3: Deletion Sync
- Deleted products removed from list immediately
- Deletion synced across browser tabs
- Pagination updates after deletion
- Graceful handling if user viewing deleted product

#### FR-4: Status Changes
- Product status changes reflect immediately in list
- Status badge updates without refresh
- Works for single and bulk status changes

#### FR-5: Performance Optimization
- Real-time listeners scoped to visible/relevant products
- Efficient listener management (add/remove)
- Debounced batch updates if multiple changes
- Memory leak prevention (cleanup on unmount)

### Part B: Testing Requirements

#### FR-6: Unit Tests
- Test coverage >80% for all new code
- All hooks thoroughly unit tested
- All utility functions tested
- Component unit tests for logic
- Mock Firestore operations appropriately

#### FR-7: Integration Tests
- Test interactions between components
- Test data flow from Firestore to UI
- Test pagination + search integration
- Test delete + refresh integration
- Test real-time updates end-to-end

#### FR-8: E2E Tests
- Full user journey tests
- Pagination beyond 25 items
- Bulk delete workflow
- Search functionality
- Real-time refresh scenarios
- Cross-browser compatibility (Chrome, Firefox)

#### FR-9: CI/CD Integration
- All tests run in CI pipeline
- Tests must pass before merge
- Coverage reports generated
- Performance benchmarks tracked
- No flaky tests

### Non-Functional Requirements

#### NFR-1: Performance
- Real-time updates don't cause UI lag
- Memory usage stable over long sessions
- Listener count limited and monitored
- Page remains responsive during updates

#### NFR-2: Reliability
- Handles Firestore connection issues gracefully
- Automatic reconnection after network loss
- No data inconsistencies
- Error boundaries prevent crashes

#### NFR-3: Testability
- All components easily testable
- Mocks and test utilities provided
- Test data generators available
- E2E tests stable and deterministic

#### NFR-4: Maintainability
- Test code is clean and readable
- Tests serve as documentation
- Easy to add new tests
- Test helpers are reusable

## Technical Implementation

### Part A: Data Refresh Implementation

#### Real-Time Strategy: Firestore onSnapshot

```typescript
// useProductsRealTime.ts
interface UseProductsRealTimeOptions {
  limit: number;
  startAfter?: DocumentSnapshot;
  searchTerm?: string;
}

export function useProductsRealTime({
  limit,
  startAfter,
  searchTerm
}: UseProductsRealTimeOptions) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let query = db.collection('products')
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    // Set up real-time listener
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const productList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Product));
        
        // Apply client-side search if needed
        const filtered = searchTerm 
          ? searchProducts(productList, searchTerm)
          : productList;
        
        setProducts(filtered);
        setLoading(false);
      },
      (err) => {
        console.error('Real-time listener error:', err);
        setError(err);
        setLoading(false);
      }
    );
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [limit, startAfter, searchTerm]);
  
  return { products, loading, error };
}
```

#### Optimized Listener Management

```typescript
// useOptimizedProductListener.ts
export function useOptimizedProductListener(
  productIds: string[]
) {
  const [updates, setUpdates] = useState<Map<string, Product>>(new Map());
  
  useEffect(() => {
    if (productIds.length === 0) return;
    
    // Limit listeners to visible products only
    const MAX_LISTENERS = 50;
    const idsToWatch = productIds.slice(0, MAX_LISTENERS);
    
    const unsubscribes = idsToWatch.map(id => {
      return db.collection('products').doc(id).onSnapshot(
        (doc) => {
          if (doc.exists) {
            setUpdates(prev => {
              const next = new Map(prev);
              next.set(id, { id: doc.id, ...doc.data() } as Product);
              return next;
            });
          }
        },
        (error) => {
          console.error(`Listener error for product ${id}:`, error);
        }
      );
    });
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [productIds]);
  
  return updates;
}
```

#### Cross-Tab Synchronization

```typescript
// useCrossTabSync.ts
export function useCrossTabSync() {
  const [syncEvent, setSyncEvent] = useState<string | null>(null);
  
  useEffect(() => {
    const channel = new BroadcastChannel('product-sync');
    
    channel.onmessage = (event) => {
      // Handle sync events from other tabs
      if (event.data.type === 'PRODUCT_UPDATED' ||
          event.data.type === 'PRODUCT_DELETED' ||
          event.data.type === 'PRODUCT_CREATED') {
        setSyncEvent(event.data);
      }
    };
    
    return () => channel.close();
  }, []);
  
  const broadcastSync = useCallback((type: string, data: any) => {
    const channel = new BroadcastChannel('product-sync');
    channel.postMessage({ type, data, timestamp: Date.now() });
    channel.close();
  }, []);
  
  return { syncEvent, broadcastSync };
}
```

### Part B: Testing Implementation

#### Test Structure
```
src/
├── hooks/
│   ├── __tests__/
│   │   ├── usePagination.test.ts
│   │   ├── useProductDelete.test.ts
│   │   ├── useProductSearch.test.ts
│   │   └── useProductsRealTime.test.ts
├── components/
│   └── Products/
│       └── __tests__/
│           ├── ProductTable.test.tsx
│           ├── ProductSearchBar.test.tsx
│           ├── PaginationControls.test.tsx
│           └── DeleteConfirmationDialog.test.tsx
├── utils/
│   └── __tests__/
│       ├── searchUtils.test.ts
│       ├── dateFormatting.test.ts
│       └── pagination.test.ts
└── __tests__/
    ├── integration/
    │   ├── productList.integration.test.tsx
    │   ├── productSearch.integration.test.tsx
    │   └── productDelete.integration.test.tsx
    └── e2e/
        ├── productList.e2e.test.ts
        ├── productPagination.e2e.test.ts
        ├── productDelete.e2e.test.ts
        └── productSearch.e2e.test.ts
```

#### Unit Test Examples

```typescript
// usePagination.test.ts
describe('usePagination', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination({
      totalItems: 100,
      initialRowsPerPage: 25
    }));
    
    expect(result.current.currentPage).toBe(1);
    expect(result.current.rowsPerPage).toBe(25);
    expect(result.current.totalPages).toBe(4);
  });
  
  it('should navigate to next page', () => {
    const { result } = renderHook(() => usePagination({
      totalItems: 100,
      initialRowsPerPage: 25
    }));
    
    act(() => {
      result.current.nextPage();
    });
    
    expect(result.current.currentPage).toBe(2);
    expect(result.current.hasPreviousPage).toBe(true);
  });
  
  it('should change rows per page and reset to first page', () => {
    const { result } = renderHook(() => usePagination({
      totalItems: 100,
      initialRowsPerPage: 25
    }));
    
    act(() => {
      result.current.nextPage();
      result.current.setRowsPerPage(50);
    });
    
    expect(result.current.currentPage).toBe(1);
    expect(result.current.rowsPerPage).toBe(50);
    expect(result.current.totalPages).toBe(2);
  });
});
```

#### Integration Test Examples

```typescript
// productList.integration.test.tsx
describe('Product List Integration', () => {
  beforeEach(async () => {
    // Seed test data
    await seedTestProducts(50);
  });
  
  afterEach(async () => {
    await clearTestData();
  });
  
  it('should load and display products with pagination', async () => {
    render(<ProductListPage />);
    
    // Wait for products to load
    await waitFor(() => {
      expect(screen.getByText(/1-25 of 50/)).toBeInTheDocument();
    });
    
    // Check products are displayed
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBe(26); // 25 products + 1 header
  });
  
  it('should paginate to second page', async () => {
    render(<ProductListPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/1-25 of 50/)).toBeInTheDocument();
    });
    
    // Click next button
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(screen.getByText(/26-50 of 50/)).toBeInTheDocument();
    });
  });
  
  it('should search and filter products', async () => {
    render(<ProductListPage />);
    
    await waitFor(() => {
      expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
    });
    
    // Type in search
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'TEST-MPN' } });
    
    await waitFor(() => {
      expect(screen.getByText(/results for/i)).toBeInTheDocument();
    });
  });
});
```

#### E2E Test Examples

```typescript
// productPagination.e2e.test.ts
describe('Product Pagination E2E', () => {
  beforeAll(async () => {
    // Setup E2E environment
    await setupE2EEnvironment();
    await seedE2EProducts(100);
  });
  
  afterAll(async () => {
    await teardownE2EEnvironment();
  });
  
  it('should paginate beyond 25 items and show 50 rows', async () => {
    await page.goto('http://localhost:3000/products');
    
    // Wait for products to load
    await page.waitForSelector('[data-testid="product-table"]');
    
    // Verify initial state (25 rows)
    let rows = await page.$$('[data-testid="product-row"]');
    expect(rows.length).toBe(25);
    
    // Change to 50 rows per page
    await page.selectOption('[data-testid="rows-per-page"]', '50');
    
    // Wait for reload
    await page.waitForTimeout(500);
    
    // Verify 50 rows displayed
    rows = await page.$$('[data-testid="product-row"]');
    expect(rows.length).toBe(50);
    
    // Navigate to page 2
    await page.click('[data-testid="next-button"]');
    await page.waitForTimeout(500);
    
    // Verify page 2 indicator
    await expect(page.locator('text=/51-100/')).toBeVisible();
    
    // Navigate to page 3
    await page.click('[data-testid="next-button"]');
    await page.waitForTimeout(500);
    
    // Verify can navigate beyond 50 items
    await expect(page.locator('[data-testid="product-row"]')).toHaveCount(0);
  });
});

// productDelete.e2e.test.ts
describe('Product Delete E2E', () => {
  it('should complete bulk delete flow with confirmation', async () => {
    await page.goto('http://localhost:3000/products');
    
    // Select multiple products
    const checkboxes = await page.$$('[data-testid="product-checkbox"]');
    await checkboxes[0].click();
    await checkboxes[1].click();
    await checkboxes[2].click();
    
    // Click delete selected
    await page.click('[data-testid="delete-selected-button"]');
    
    // Wait for confirmation dialog
    await page.waitForSelector('[data-testid="delete-confirmation-dialog"]');
    
    // Verify dialog content
    await expect(page.locator('text=/Delete 3 products/i')).toBeVisible();
    
    // Confirm delete
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Wait for success message
    await page.waitForSelector('[data-testid="success-toast"]');
    await expect(page.locator('text=/deleted successfully/i')).toBeVisible();
    
    // Verify products removed from list
    await page.waitForTimeout(1000);
    const rowsAfter = await page.$$('[data-testid="product-row"]');
    expect(rowsAfter.length).toBe(22); // 25 - 3 = 22
  });
});
```

### Implementation Steps

#### Step 1: Implement Real-Time Listeners
- Create `useProductsRealTime` hook
- Implement onSnapshot listeners
- Add error handling and reconnection logic
- Test with manual Firestore updates

#### Step 2: Optimize Listener Management
- Implement scoped listeners (visible products only)
- Add listener cleanup on unmount
- Prevent memory leaks
- Profile memory usage

#### Step 3: Add Cross-Tab Sync
- Implement BroadcastChannel for tab communication
- Sync delete operations across tabs
- Sync product updates across tabs
- Test with multiple browser tabs

#### Step 4: Write Unit Tests
- Write tests for all hooks
- Write tests for all utility functions
- Write component unit tests
- Achieve >80% coverage

#### Step 5: Write Integration Tests
- Test component interactions
- Test data flow from Firestore
- Test pagination + search integration
- Test delete + refresh integration

#### Step 6: Write E2E Tests
- Set up E2E test framework (Playwright/Cypress)
- Write critical user journey tests
- Test pagination beyond 25 items
- Test delete workflows
- Test search functionality

#### Step 7: Set Up CI/CD
- Configure test runs in CI
- Add coverage reporting
- Set up test result tracking
- Configure required checks

#### Step 8: Performance Testing
- Benchmark real-time update performance
- Profile memory usage over time
- Test with 100+ simultaneous listeners
- Optimize bottlenecks

### Files to Create/Modify

```
src/
├── hooks/
│   ├── useProductsRealTime.ts (CREATE)
│   ├── useOptimizedProductListener.ts (CREATE)
│   ├── useCrossTabSync.ts (CREATE)
│   └── __tests__/ (CREATE - all test files)
├── components/
│   └── Products/
│       └── __tests__/ (CREATE - all test files)
├── utils/
│   └── __tests__/ (CREATE - all test files)
├── __tests__/
│   ├── integration/ (CREATE)
│   ├── e2e/ (CREATE)
│   └── setup/ (CREATE)
│       ├── testSetup.ts
│       ├── testData.ts
│       └── firebaseMocks.ts
└── test-utils/
    ├── renderWithProviders.tsx (CREATE)
    ├── mockFirestore.ts (CREATE)
    └── testHelpers.ts (CREATE)

.github/
└── workflows/
    └── test.yml (MODIFY - add new test jobs)

playwright.config.ts (CREATE - if using Playwright)
cypress.config.ts (CREATE - if using Cypress)
jest.config.js (MODIFY - update coverage thresholds)
```

## Acceptance Criteria

### Part A: Data Refresh

#### AC-1: Real-Time Product Updates
- [ ] Editing a product updates the list automatically
- [ ] Updates appear within 2 seconds
- [ ] Only changed product re-renders
- [ ] Works across browser tabs

#### AC-2: New Product Detection
- [ ] Importing products updates list automatically
- [ ] New products appear within 5 seconds
- [ ] Pagination count updates
- [ ] New products in correct sort order

#### AC-3: Delete Sync
- [ ] Deleted products removed immediately
- [ ] Deletion synced across tabs
- [ ] Pagination updates correctly

#### AC-4: Performance
- [ ] No UI lag during updates
- [ ] Memory usage stable over 30-minute session
- [ ] Listener count limited (<100)
- [ ] No memory leaks

### Part B: Testing

#### AC-5: Unit Test Coverage
- [ ] Overall test coverage >80%
- [ ] All hooks have unit tests
- [ ] All utils have unit tests
- [ ] All tests passing locally and in CI

#### AC-6: Integration Tests
- [ ] Pagination integration tests passing
- [ ] Search integration tests passing
- [ ] Delete integration tests passing
- [ ] Real-time update tests passing

#### AC-7: E2E Tests
- [ ] E2E test for pagination beyond 25 items
- [ ] E2E test for bulk delete flow
- [ ] E2E test for search functionality
- [ ] E2E test for real-time refresh
- [ ] All E2E tests passing in CI

#### AC-8: CI/CD
- [ ] All tests run on every PR
- [ ] Tests must pass before merge
- [ ] Coverage reports generated
- [ ] No flaky tests (>95% pass rate)

## Testing Strategy

### Test Pyramid
- **Unit Tests** (70%): Fast, isolated, many
- **Integration Tests** (20%): Component interactions
- **E2E Tests** (10%): Critical user journeys

### Test Categories

#### Unit Tests (Target: 250+ tests)
- Hook logic
- Utility functions
- Component logic
- State management
- Data transformations

#### Integration Tests (Target: 30+ tests)
- Feature workflows
- Component interactions
- Data flow
- Error scenarios

#### E2E Tests (Target: 10+ tests)
- Critical user paths
- Cross-browser compatibility
- Performance scenarios
- Real-world usage

## Evidence Requirements

### Screenshots
1. Real-time update happening (before/after)
2. Cross-tab sync demonstration
3. Test coverage report showing >80%
4. CI pipeline with all tests green
5. E2E test results dashboard

### Video
- Screen recording (90-120 seconds) demonstrating:
  - Importing products and list auto-updating
  - Editing product and seeing change in list
  - Deleting product and list refresh
  - Cross-tab synchronization (two browser windows)
  - Running test suite with passing results

### Code Evidence
- Link to PR with real-time implementation
- Test coverage report (HTML)
- CI build logs with passing tests
- Performance profiling results

### Test Evidence
- Jest coverage report
- E2E test recording/screenshots
- CI test execution logs
- Performance benchmark results

## Risks and Mitigations

### Risk 1: Real-Time Listener Costs
**Risk**: Many real-time listeners could significantly increase Firestore costs.

**Mitigation**:
- Scope listeners to visible products only
- Implement smart listener management
- Monitor Firestore usage closely
- Set up cost alerts
- Consider polling as alternative for large datasets

### Risk 2: Memory Leaks
**Risk**: Improper listener cleanup could cause memory leaks.

**Mitigation**:
- Thoroughly test listener cleanup
- Use useEffect cleanup functions correctly
- Profile memory usage over time
- Implement automated memory leak detection
- Add monitoring in production

### Risk 3: Test Flakiness
**Risk**: E2E tests may be flaky, causing false failures.

**Mitigation**:
- Use deterministic test data
- Implement proper waits (not arbitrary timeouts)
- Retry logic for transient failures
- Isolate tests properly
- Monitor flaky test rate

### Risk 4: Real-Time Connection Issues
**Risk**: Poor network connectivity could break real-time updates.

**Mitigation**:
- Implement graceful degradation
- Add reconnection logic
- Show connection status to user
- Fall back to polling if needed
- Handle offline scenarios

### Risk 5: Test Maintenance Burden
**Risk**: Large test suite could become difficult to maintain.

**Mitigation**:
- Keep tests simple and focused
- Use reusable test utilities
- Document test patterns
- Refactor tests regularly
- Automate test maintenance where possible

## Definition of Done

- [ ] All acceptance criteria met (Parts A and B)
- [ ] Real-time listeners implemented and tested
- [ ] Cross-tab sync working
- [ ] Unit test coverage >80%
- [ ] All integration tests passing
- [ ] All E2E tests passing
- [ ] CI configured and green
- [ ] Performance benchmarks established
- [ ] No memory leaks detected
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] Evidence artifacts captured (screenshots, videos)
- [ ] Documentation updated
- [ ] Ledger updated with completion status
- [ ] All LP-001 through LP-005 features verified end-to-end

## Success Metrics

- **Coverage**: Test coverage >80%
- **Reliability**: <5% test flakiness rate
- **Performance**: Real-time updates < 2 seconds
- **Stability**: No memory leaks in 1-hour session
- **CI**: 100% green builds for 3 consecutive days

## Phase Completion Verification

This LP marks the completion of the entire phase. Final verification includes:

### Cross-LP Verification
- [ ] Pagination works with all features
- [ ] Columns display correctly in all scenarios
- [ ] Delete works with pagination and search
- [ ] Search works with pagination
- [ ] Real-time updates work with all features

### Staging Verification
- [ ] All features deployed to staging
- [ ] Staging URL accessible: https://ropi-aoss-staging.web.app/products
- [ ] All user journeys tested in staging
- [ ] No critical bugs found in staging
- [ ] Performance acceptable in staging

### Documentation and Evidence
- [ ] All evidence artifacts collected
- [ ] HES JSON generated
- [ ] Phase PRD updated with results
- [ ] Ledger updated with final status
- [ ] Lessons learned documented

---

**LP Version**: 1.0  
**Created**: 2026-01-09  
**Last Updated**: 2026-01-09  
**Status**: Ready for Implementation
