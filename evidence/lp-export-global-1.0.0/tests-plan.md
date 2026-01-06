# Tests Plan: RetailOps Global Export Mode
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready

---

## Test Matrix

| Layer | Test Type | Coverage Target | Tools |
|-------|-----------|-----------------|-------|
| Unit | Function-level | 90%+ | Jest |
| Integration | API endpoints | 100% critical paths | Jest + Supertest |
| E2E | UI workflows | 100% user flows | Cypress/Playwright |

---

## 1. Unit Tests

### 1.1 Backend: Mode Detection
**File:** `packages/api/src/services/__tests__/completionDrivenExportReadiness.test.ts`

**Test:** `detectExportMode()`
```typescript
describe('detectExportMode', () => {
  it('returns GLOBAL when Firestore config = GLOBAL', async () => {
    mockFirestore.get.mockResolvedValue({ data: () => ({ mode: 'GLOBAL' }) });
    const result = await detectExportMode('tenant1');
    expect(result).toBe('GLOBAL');
  });

  it('returns SITE_SCOPED when Firestore config = SITE_SCOPED', async () => {
    mockFirestore.get.mockResolvedValue({ data: () => ({ mode: 'SITE_SCOPED' }) });
    const result = await detectExportMode('tenant1');
    expect(result).toBe('SITE_SCOPED');
  });

  it('defaults to SITE_SCOPED when Firestore doc missing', async () => {
    mockFirestore.get.mockResolvedValue({ data: () => null });
    const result = await detectExportMode('tenant1');
    expect(result).toBe('SITE_SCOPED');
  });

  it('defaults to SITE_SCOPED on Firestore error', async () => {
    mockFirestore.get.mockRejectedValue(new Error('Permission denied'));
    const result = await detectExportMode('tenant1');
    expect(result).toBe('SITE_SCOPED');
  });
});
```

**Pass Criteria:** All 4 tests pass, 100% branch coverage.

---

### 1.2 Backend: Product-Level Aggregation
**File:** `packages/api/src/services/__tests__/completionDrivenExportReadiness.test.ts`

**Test:** `aggregateProductLevelReadiness()`
```typescript
describe('aggregateProductLevelReadiness', () => {
  it('takes BEST score per segment across sites', async () => {
    const product = {
      id: 'test-product',
      attributes: {
        sku: '123',
        name: 'Test',
        brand: 'Brand',
        category: 'Apparel',
        // class and department missing
      },
      websites: ['site1', 'site2']
    };

    const result = await aggregateProductLevelReadiness(
      product,
      mockCompletionRules,
      mockRegistry,
      '2026-01-06T00:00:00Z'
    );

    expect(result.aggregatedCompletionPct).toBeGreaterThan(0);
    expect(result.segmentScores).toHaveLength(2); // core + classification
    expect(result.missingGlobalAttributes).toContain('class');
    expect(result.missingGlobalAttributes).toContain('department');
    expect(result.sitesEvaluated).toEqual(['site1', 'site2']);
  });

  it('handles product with no websites (website optional)', async () => {
    const product = {
      id: 'test-product',
      attributes: { sku: '123', name: 'Test' },
      websites: []
    };

    const result = await aggregateProductLevelReadiness(
      product,
      mockCompletionRules,
      mockRegistry,
      '2026-01-06T00:00:00Z'
    );

    expect(result.websiteOptional).toBe(true);
    expect(result.sitesEvaluated).toEqual(['__GLOBAL__']);
  });

  it('excludes Description/SEO segment (site-specific)', async () => {
    const product = mockProductWithAllAttributes();
    const result = await aggregateProductLevelReadiness(
      product,
      mockCompletionRules,
      mockRegistry,
      '2026-01-06T00:00:00Z'
    );

    const segmentIds = result.segmentScores.map(s => s.segmentId);
    expect(segmentIds).not.toContain('description-seo');
  });
});
```

**Pass Criteria:** All 3 tests pass, 85%+ coverage of aggregation logic.

---

### 1.3 Frontend: Mode State Management
**File:** `packages/web/src/pages/__tests__/ExportPage.test.tsx`

**Test:** Mode detection and conditional rendering
```typescript
describe('ExportPage mode handling', () => {
  it('fetches mode on mount', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ mode: 'GLOBAL' }) });
    render(<ExportPage />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledWith('/api/admin/exports/config'));
  });

  it('hides site dropdown in GLOBAL mode', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ mode: 'GLOBAL' }) });
    const { queryByLabelText } = render(<ExportPage />);
    await waitFor(() => expect(queryByLabelText('Website:')).not.toBeInTheDocument());
  });

  it('shows site dropdown in SITE_SCOPED mode', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ mode: 'SITE_SCOPED' }) });
    const { getByLabelText } = render(<ExportPage />);
    await waitFor(() => expect(getByLabelText('Website:')).toBeInTheDocument());
  });

  it('defaults to SITE_SCOPED on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    const { getByLabelText } = render(<ExportPage />);
    await waitFor(() => expect(getByLabelText('Website:')).toBeInTheDocument());
  });
});
```

**Pass Criteria:** All 4 tests pass, UI renders correctly per mode.

---

## 2. Integration Tests

### 2.1 API Endpoint: GET /api/products/:id/completion
**File:** `packages/api/src/routes/__tests__/completionRoutes.integration.test.ts`

**Test Suite:**
```typescript
describe('GET /api/products/:id/completion', () => {
  beforeAll(async () => {
    // Set Firestore config to GLOBAL mode
    await mockFirestore.collection('settings').doc('default')
      .collection('exportSettings').doc('config')
      .set({ mode: 'GLOBAL' });
  });

  it('returns GLOBAL mode structure for configured tenant', async () => {
    const response = await request(app)
      .get('/api/products/18/completion')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(response.body.mode).toBe('GLOBAL');
    expect(response.body.productLevelReadiness).toBeDefined();
    expect(response.body.productLevelReadiness.aggregatedCompletionPct).toBeGreaterThan(0);
    expect(response.body.operatorExplanation.siteStatus).toEqual([]);
  });

  it('returns SITE_SCOPED when config = SITE_SCOPED', async () => {
    await mockFirestore.collection('settings').doc('default')
      .collection('exportSettings').doc('config')
      .set({ mode: 'SITE_SCOPED' });

    const response = await request(app)
      .get('/api/products/18/completion')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(response.body.mode).toBe('SITE_SCOPED');
    expect(response.body.operatorExplanation.siteStatus.length).toBeGreaterThan(0);
  });

  it('handles product with no websites in GLOBAL mode', async () => {
    const productNoSites = { id: 'test-no-sites', attributes: {}, websites: [] };
    await mockFirestore.collection('products').doc('test-no-sites').set(productNoSites);

    const response = await request(app)
      .get('/api/products/test-no-sites/completion')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(response.body.productLevelReadiness.websiteOptional).toBe(true);
    expect(response.body.productLevelReadiness.sitesEvaluated).toEqual(['__GLOBAL__']);
  });
});
```

**Pass Criteria:** All 3 tests pass, API returns correct structure per mode.

---

### 2.2 API Endpoint: GET /api/admin/exports/config
**File:** `packages/api/src/routes/__tests__/exportConfigRoutes.integration.test.ts`

**Test Suite:**
```typescript
describe('GET /api/admin/exports/config', () => {
  it('returns mode from Firestore config', async () => {
    await mockFirestore.collection('settings').doc('tenant1')
      .collection('exportSettings').doc('config')
      .set({ mode: 'GLOBAL' });

    const response = await request(app)
      .get('/api/admin/exports/config')
      .set('Authorization', `Bearer ${testToken}`)
      .expect(200);

    expect(response.body.mode).toBe('GLOBAL');
    expect(response.body.timestamp).toBeDefined();
  });

  it('defaults to SITE_SCOPED when config missing', async () => {
    const response = await request(app)
      .get('/api/admin/exports/config')
      .set('Authorization', `Bearer ${testTokenNoConfig}`)
      .expect(200);

    expect(response.body.mode).toBe('SITE_SCOPED');
  });
});
```

**Pass Criteria:** All 2 tests pass, endpoint returns correct mode.

---

## 3. End-to-End Tests

### 3.1 Export Page: GLOBAL Mode UI
**File:** `cypress/e2e/export-global-mode.cy.ts`

**Test:**
```typescript
describe('Export Page - GLOBAL Mode', () => {
  before(() => {
    // Set Firestore config to GLOBAL
    cy.task('setFirestoreConfig', { mode: 'GLOBAL' });
  });

  it('hides site dropdown and shows GLOBAL badge', () => {
    cy.login('admin@example.com', 'password');
    cy.visit('/export');

    cy.get('[data-testid="mode-badge-global"]').should('be.visible');
    cy.get('[data-testid="mode-badge-global"]').should('contain', 'Global Export Mode');
    cy.get('[data-testid="site-select"]').should('not.exist');
  });

  it('export request excludes site parameter', () => {
    cy.intercept('POST', '/api/admin/exports/dry-run').as('exportRequest');

    cy.visit('/export');
    cy.get('[data-testid="format-select"]').select('csv');
    cy.get('[data-testid="export-button"]').click();

    cy.wait('@exportRequest').its('request.body').should((body) => {
      expect(body).to.not.have.property('site');
      expect(body).to.have.property('format', 'csv');
    });
  });
});
```

**Pass Criteria:** UI behaves correctly, API request excludes `site` field.

---

### 3.2 Export Page: Mode Toggle (Rollback Test)
**File:** `cypress/e2e/export-mode-toggle.cy.ts`

**Test:**
```typescript
describe('Export Page - Mode Toggle', () => {
  it('switches UI when mode toggled via Firestore', () => {
    cy.login('admin@example.com', 'password');

    // Start with GLOBAL mode
    cy.task('setFirestoreConfig', { mode: 'GLOBAL' });
    cy.visit('/export');
    cy.get('[data-testid="mode-badge-global"]').should('be.visible');
    cy.get('[data-testid="site-select"]').should('not.exist');

    // Toggle to SITE_SCOPED
    cy.task('setFirestoreConfig', { mode: 'SITE_SCOPED' });
    cy.reload();
    cy.get('[data-testid="mode-badge-global"]').should('not.exist');
    cy.get('[data-testid="site-select"]').should('be.visible');

    // Toggle back to GLOBAL
    cy.task('setFirestoreConfig', { mode: 'GLOBAL' });
    cy.reload();
    cy.get('[data-testid="mode-badge-global"]').should('be.visible');
  });
});
```

**Pass Criteria:** UI switches within 5 minutes of Firestore update (no code deploy).

---

### 3.3 Product Detail: CompletionExportGatePanel
**File:** `cypress/e2e/completion-panel-global.cy.ts`

**Test:**
```typescript
describe('CompletionExportGatePanel - GLOBAL Mode', () => {
  before(() => {
    cy.task('setFirestoreConfig', { mode: 'GLOBAL' });
  });

  it('shows product-level completion, no site accordion', () => {
    cy.login('admin@example.com', 'password');
    cy.visit('/products/18');

    // Panel should show GLOBAL mode
    cy.get('[data-testid="completion-panel-header"]').should('contain', 'GLOBAL');

    // No per-site accordion
    cy.get('[data-testid="site-accordion"]').should('not.exist');

    // Product-level missing attributes visible
    cy.get('[data-testid="missing-global-attrs"]').should('be.visible');
    cy.get('[data-testid="missing-global-attrs"]').should('contain', 'class');
    cy.get('[data-testid="missing-global-attrs"]').should('contain', 'department');
  });
});
```

**Pass Criteria:** Product-level view displayed, no site breakdown.

---

## 4. Regression Tests

### 4.1 Existing Clients (Backward Compatibility)
**Goal:** Verify existing clients ignoring new fields continue working.

**Test:**
```typescript
it('legacy client can parse response ignoring new fields', async () => {
  const response = await request(app)
    .get('/api/products/18/completion')
    .set('Authorization', `Bearer ${testToken}`)
    .expect(200);

  // Legacy client only uses these fields
  const { ready, completionPct, threshold } = response.body;
  expect(typeof ready).toBe('boolean');
  expect(typeof completionPct).toBe('number');
  expect(typeof threshold).toBe('number');

  // New fields are optional (ignored by legacy clients)
  // No error should occur
});
```

**Pass Criteria:** Legacy field structure preserved, no breaking changes.

---

### 4.2 SITE_SCOPED Mode (Unchanged Behavior)
**Goal:** Verify SITE_SCOPED mode works exactly as before.

**Test Suite:** Run ALL existing export/completion tests with Firestore config = `SITE_SCOPED`.

**Pass Criteria:** 100% of existing tests pass unchanged.

---

## 5. Performance Tests

### 5.1 Product-Level Aggregation Performance
**Goal:** Verify aggregation logic doesn't degrade API response time.

**Benchmark:**
- Product with 2 sites: < 200ms response time
- Product with 5 sites: < 500ms response time

**Test:**
```typescript
it('aggregates 5 sites within 500ms', async () => {
  const start = Date.now();
  const response = await request(app)
    .get('/api/products/multi-site-product/completion')
    .expect(200);
  const duration = Date.now() - start;

  expect(duration).toBeLessThan(500);
  expect(response.body.productLevelReadiness.sitesEvaluated).toHaveLength(5);
});
```

**Pass Criteria:** Response time within SLA (< 500ms for 5 sites).

---

## 6. Test Execution Checklist

### Phase 1 Tests
- [ ] Unit: `detectExportMode()` (4 tests)
- [ ] Integration: TypeScript compilation (no runtime tests yet)
- [ ] Regression: Existing API tests pass

### Phase 2 Tests
- [ ] Unit: `aggregateProductLevelReadiness()` (3 tests)
- [ ] Integration: `/api/products/:id/completion` GLOBAL mode (3 tests)
- [ ] Integration: `/api/admin/exports/config` (2 tests)
- [ ] Performance: Aggregation benchmark (< 500ms)
- [ ] Regression: SITE_SCOPED mode unchanged

### Phase 3 Tests
- [ ] Unit: Frontend mode state management (4 tests)
- [ ] E2E: Export page GLOBAL UI (2 tests)
- [ ] E2E: Mode toggle (1 test)
- [ ] E2E: CompletionExportGatePanel (1 test)

### Phase 4 Tests
- [ ] Integration: Classification segment enforcement (2 tests)
- [ ] E2E: Product 18 completion drops to 72%
- [ ] E2E: Product 211737-90h1-8 completion 100%

---

## 7. Test Data Requirements

**Test Products:**
- Product 18 (mpn `18-test`): Partial classification
- Product 211737-90h1-8: Full classification
- Test product with NO websites: Website optional test

**Firestore Config:**
- `settings/default/exportSettings/config`: Mode toggle tests
- `settings/default/completionRules/config`: Segment tests

---

**Document Status:** ✅ Ready for Test Implementation  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** risk-assessment.md
