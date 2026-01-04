# LP-completion-operator-explainability-1.2.0
## DRAFT — Forward Execution Preparation

**Status:** DRAFT (awaiting formal relay from Lisa)  
**Phase:** Completion Model → Export Gate  
**Sequence:** LP-1.2.0 (follows LP-1.0.0 & LP-1.1.0)  
**Type:** Backend + Frontend API alignment  
**Merge Dependencies:** PR #433 + PR #434 (must land before merge)

---

## 1. LP Intent (Locked)

**Objective:** Ensure operator-visible completion explanations are **consistent, complete, and aligned** across all API payloads (export gate responses, product detail endpoints) and UI surfaces (Product Editor, Export Modal).

**Outcome:** Operators receive clear, actionable explanations for:
- Why an export is blocked (catalog-level)
- Which products are blocking export (and why)
- What's missing to unblock each product
- Site-specific blocking reasons
- Per-segment completion breakdown

**Scope:**
- Backend payload alignment (export endpoint, product endpoint)
- Frontend UI consistency (ProductEditor, ExportModal)
- Test coverage for explanation quality

**Non-Scope:**
- Completion rules configuration UI (LP-1.3.0)
- User-facing explanations (LP-1.4.0)

---

## 2. Audit Findings — Explanation Gaps

### Gap 1: Missing Product Completion Endpoint ❌

**Location:** Backend API  
**Issue:** Frontend component `CompletionExportGatePanel.tsx` calls `GET /api/products/{productId}/completion`, but **this endpoint doesn't exist**.

**Impact:**
- Panel renders as loading/error state
- Operators cannot see product-level blocking reasons in Product Editor
- Explanation data cannot be fetched for individual products

**Evidence:**
```typescript
// In CompletionExportGatePanel.tsx (L57):
const response = await fetch(`/api/products/${productId}/completion`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
// Returns 404 (endpoint not implemented)
```

**Required Implementation:**
```typescript
// GET /api/products/:productId/completion
// Returns: CompletionDrivenExportReadiness for single product
// Response schema: Same as export endpoint 423 payload
```

---

### Gap 2: Incomplete Explanation Payload in Export Endpoint ❌

**Location:** Backend API → `export.ts`  
**Issue:** Export endpoint returns `readiness.operatorExplanation`, but structure doesn't fully match test fixtures.

**Current Payload (export.ts L79):**
```typescript
res.status(423).json({
  success: false,
  error: 'EXPORT_BLOCKED_COMPLETION_GATE',
  message: 'Export blocked by completion requirements',
  readiness: readinessResult  // <-- Contains operatorExplanation
});
```

**Expected Payload (from tests):**
```json
{
  "success": false,
  "error": "EXPORT_BLOCKED_COMPLETION_GATE",
  "message": "Export blocked by completion requirements",
  "readiness": {
    "ready": false,
    "completionPct": 75,
    "threshold": 80,
    "blockingReasons": [...],
    "operatorExplanation": {
      "summary": "Export blocked: 250 products below 80% completion",
      "blockingIssues": [
        "Product ABC: 45% complete (threshold 80%)",
        "Product DEF: 60% complete (threshold 80%)",
        ...
      ],
      "completionBreakdown": [
        {
          "segmentId": "description-seo",
          "segmentName": "Description/SEO",
          "score": 50,
          "weightPct": 25,
          "missingAttributes": ["title", "description"]
        },
        ...
      ],
      "siteStatus": [
        {
          "site": "us",
          "blocked": false,
          "reason": null
        },
        {
          "site": "uk",
          "blocked": true,
          "reason": "Missing Description/SEO for site 'uk'",
          "missingAttributes": ["title_uk", "description_uk"]
        }
      ],
      "actionRequired": [
        "Complete Description/SEO segment for 250 products",
        "Complete Pricing segment for 180 products",
        "Fix site-specific Description/SEO attributes for uk site"
      ]
    },
    "catalogStats": {
      "totalProducts": 1000,
      "blockedByCompletionCount": 250,
      "blockedBySiteCount": 50,
      "readyCount": 700
    }
  }
}
```

**Gap Details:**
- ✅ operatorExplanation exists in type definition
- ✅ operatorExplanation populated in completionDrivenExportReadiness.ts
- ⚠️ But: Not all fields consistently populated (sampledBlockingIssues might be truncated)
- ⚠️ But: actionRequired might not cover all blocking scenarios

---

### Gap 3: UI Surface Missing Explanation Display ❌

**Location:** `packages/web/src/components/export/ExportBlockedModal.tsx`  
**Issue:** Modal receives operatorExplanation but doesn't display all explanation components.

**Current Rendering (L1-120):**
```tsx
// Shows:
- Modal header with "Export Blocked"
- Summary (if provided)
- Operator explanation section (expandable)
  - Blocking issues (if expanded)
  - Site status
  - Completion breakdown
  - Action required

// Missing:
- Clear distinction between blocking vs. informational items
- Segment-level action items (which segment to complete first?)
- Interactive navigation (link from blocked reason to product editor?)
- Copy-to-clipboard for blocked product IDs
```

**Expected Behavior (LP-1.2.0 Spec):**
```
Modal Layout:
├── Header: "Export Blocked by Completion Requirements"
├── Summary: Human-readable blocking reason
├── Severity Indicator: "🚫 2 blocking issues across 250 products"
├── Quick Stats: 
│   ├── "250 products below 80% completion"
│   ├── "50 products missing site-specific attributes (uk)"
│   └── "Estimated effort: 3-5 days to resolve"
├── Blocking Issues Section:
│   ├── Expandable list of first 5 blocking products
│   ├── Each item shows: product ID, current %, missing attributes
│   └── "View in Editor" link per product
├── Site Status Section:
│   ├── Green ✅ for unblocked sites
│   ├── Red 🚫 for blocked sites with reason
│   └── Specific missing attributes per site
├── Completion Breakdown Section:
│   ├── Segment name, current %, target weight
│   ├── Missing attributes list
│   └── % of products affected
└── Action Items Section:
    ├── Prioritized list of next steps
    └── "Go to completion rules" link
```

---

### Gap 4: Product Editor Panel Not Receiving Explanations ✅ Partially

**Location:** `packages/web/src/components/product/CompletionExportGatePanel.tsx`  
**Issue:** Component exists and has explanation rendering code, **but endpoint doesn't exist** (Gap #1 root cause).

**Current Implementation Status:**
- ✅ Renders blockingReasons (if fetched)
- ✅ Renders operatorExplanation.siteStatus
- ✅ Renders operatorExplanation.completionBreakdown
- ✅ Renders operatorExplanation.actionRequired
- ❌ Cannot render because endpoint returns 404

**Expected Behavior (once endpoint exists):**
```
[Product Editor Sidebar]
├── Completion Status: 75% (RED: Below 80% threshold)
├── Why Blocked:
│   ├── "This product is 5% below export threshold"
│   ├── Missing attributes per segment:
│   │   ├── "Description/SEO: title, description (50% of weight)"
│   │   └── "Pricing: price_usd, cost (25% of weight)"
│   └── Site issues (if any):
│       └── "uk: Missing title_uk, description_uk"
├── What to Complete:
│   ├── [ ] Add title and description
│   ├── [ ] Translate for uk site
│   └── [ ] Set price_usd
└── "View Completion Rules" link
```

---

### Gap 5: Explanation Consistency Across UI Surfaces ⚠️

**Issue:** Export Modal and Product Editor Panel might display same data differently.

**Current State:**
- Export Modal: Shows first 5 blocking products (sampled)
- Product Editor Panel: Shows only current product completion
- No cross-surface consistency enforcement

**Expected Alignment:**
```
CONSISTENCY PRINCIPLE:
- Same operatorExplanation format in both surfaces
- Same missing attribute presentation
- Same site-specific blocking format
- Same action item prioritization
```

---

## 3. Backend Implementation Requirements

### Requirement 1: Implement GET /api/products/{productId}/completion

**Endpoint:** `GET /api/products/{productId}/completion`  
**Auth:** Requires admin token  
**Response Code:** 200 (ready) or 200 with ready=false (blocked)  
**Response Body:** `CompletionDrivenExportReadiness`

**Implementation:**
```typescript
// In packages/api/src/endpoints/products.ts

export async function getProductCompletionHandler(
  req: Request,
  res: Response
): Promise<void> {
  await requireAdmin(req, res, async () => {
    const { productId } = req.params;
    
    if (!productId) {
      res.status(400).json({ error: 'MISSING_PRODUCT_ID' });
      return;
    }

    try {
      // Load product from Firestore
      const db = admin.firestore();
      const productDoc = await db.collection('products').doc(productId).get();
      
      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND',
          message: `Product '${productId}' not found`
        });
        return;
      }

      // Evaluate completion for this product
      const readiness = await calculateCompletionDrivenExportReadiness(
        productDoc.data() as ProductDocument
      );

      // Return readiness (ready=true or ready=false, both return 200)
      res.status(200).json(readiness);
    } catch (error) {
      console.error('[Products] Error fetching product completion:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch product completion'
      });
    }
  });
}
```

**Tests:** Verify against fixtures:
- ✅ Product 75% complete (below 80% threshold) → ready=false
- ✅ Product 95% complete (above threshold) → ready=true
- ✅ Product with site blocking (missing title_uk) → ready=false
- ✅ operatorExplanation populated for all cases

---

### Requirement 2: Ensure Explanation Fields Always Populated

**Current Issue:** operatorExplanation might have undefined/empty fields in edge cases.

**Requirements:**
- ✅ `summary` always populated (one-liner explaining why blocked)
- ✅ `blockingIssues` always populated (array, may be empty if not blocked)
- ✅ `completionBreakdown` always populated (all segments listed)
- ✅ `siteStatus` always populated (all sites in product listed)
- ✅ `actionRequired` always populated (may be empty if not blocked)

**Type Definition (validate in tests):**
```typescript
interface OperatorExplanation {
  summary: string;                    // Never null, always human-readable
  blockingIssues: string[];           // May be empty []
  completionBreakdown: Array<{
    segmentId: string;
    segmentName: string;
    score: number;
    weightPct: number;
    missingAttributes: string[];      // May be empty []
  }>;
  siteStatus: Array<{
    site: string;
    blocked: boolean;
    reason?: string;                  // Populated if blocked=true
    missingAttributes?: string[];      // Populated if blocked=true
  }>;
  actionRequired: string[];           // May be empty []
}
```

---

## 4. Frontend Implementation Requirements

### Requirement 1: ExportBlockedModal Enhancement

**Current File:** `packages/web/src/components/export/ExportBlockedModal.tsx`  
**Change Type:** Display enhancements (no API changes)

**Changes:**
1. Add section header for "Why Blocked" (distinct from "What to Do")
2. Add product count badges ("250 products affected")
3. Add clickable "View in Editor" links for blocking products
4. Improve site status visualization (color indicators)
5. Add copy-to-clipboard for product IDs

**Test Requirements:**
- ✅ Renders summary correctly
- ✅ Displays site status with colors (red/green)
- ✅ Lists completion breakdown with missing attributes
- ✅ Shows prioritized action items
- ✅ Links navigate to product editor (mocked in unit tests)

---

### Requirement 2: CompletionExportGatePanel Activation

**Current File:** `packages/web/src/components/product/CompletionExportGatePanel.tsx`  
**Change Type:** Endpoint integration (component logic already correct)

**Changes:**
1. Verify endpoint call matches `/api/products/{productId}/completion`
2. Ensure error handling for 404 (product not found)
3. Ensure loading state displays while fetching
4. Ensure explanation is rendered once loaded

**Status:** Code is ready, just needs endpoint (Gap #1) to function.

---

### Requirement 3: UI Consistency Validation

**Requirements:**
- ✅ Both modals use same operatorExplanation schema
- ✅ Both modals render missing attributes identically
- ✅ Both modals show site status identically
- ✅ Both modals prioritize action items consistently

**Test Coverage:**
```typescript
// Consistency test: Same explanation renders identically in both surfaces
describe('Explanation Consistency', () => {
  it('ExportBlockedModal and CompletionPanel display same explanation identically', () => {
    const explanation = { /* fixture */ };
    
    const modalOutput = renderModal(explanation);
    const panelOutput = renderPanel(explanation);
    
    expect(modalOutput.blockingIssues).toEqual(panelOutput.blockingIssues);
    expect(modalOutput.siteStatus).toEqual(panelOutput.siteStatus);
    expect(modalOutput.completionBreakdown).toEqual(panelOutput.completionBreakdown);
  });
});
```

---

## 5. Acceptance Criteria (Evidence-Bound)

| Criterion | Type | Evidence |
|-----------|------|----------|
| **Product completion endpoint exists and returns correct schema** | Backend | GET /api/products/{productId}/completion returns 200 with CompletionDrivenExportReadiness |
| **All operatorExplanation fields always populated (never null/undefined)** | Backend | Test fixtures verify all fields present |
| **Export endpoint payload matches test expectations** | Backend | Test: export 423 response includes complete operatorExplanation |
| **Product Editor panel displays explanation correctly** | Frontend | Test: CompletionExportGatePanel renders blocking reasons, site status, breakdown |
| **Export Modal displays explanation correctly** | Frontend | Test: ExportBlockedModal renders same explanation fields |
| **UI consistency: Both surfaces display identically** | Frontend | Test: Explanation rendering identical in both components |
| **Links work: "View in Editor" navigates to product** | Frontend | E2E test or integration test |
| **All explanation data accessible without manual API calls** | Integration | User can fetch product completion without triggering export |
| **No missing attributes in breakdown display** | Frontend | UI renders empty array as "—" or "No issues in this segment" |

---

## 6. Implementation Roadmap

### Phase A: Backend API Implementation
1. Implement `GET /api/products/{productId}/completion` endpoint
2. Add route to express app
3. Integrate with `calculateCompletionDrivenExportReadiness`
4. Test with product fixtures (ready, blocked, site-blocked)

### Phase B: Frontend Enhancements
1. Enhance ExportBlockedModal visualization
2. Verify CompletionExportGatePanel can receive endpoint data
3. Add UI tests for explanation rendering
4. Add consistency tests between surfaces

### Phase C: Integration Testing
1. End-to-end test: Product blocked → modal shows explanation → link to editor
2. Cross-surface consistency test
3. Performance test: response time < 500ms

---

## 7. Test Expectations

### Backend Tests

```typescript
// test: GET /api/products/{productId}/completion returns correct schema
describe('GET /api/products/{productId}/completion', () => {
  it('returns 200 with CompletionDrivenExportReadiness schema', async () => {
    const response = await request(app)
      .get('/api/products/test-product-id/completion')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ready');
    expect(response.body).toHaveProperty('completionPct');
    expect(response.body).toHaveProperty('operatorExplanation');
    expect(response.body.operatorExplanation).toHaveProperty('summary');
    expect(response.body.operatorExplanation).toHaveProperty('completionBreakdown');
    expect(response.body.operatorExplanation).toHaveProperty('siteStatus');
    expect(response.body.operatorExplanation).toHaveProperty('actionRequired');
  });

  it('returns 404 for non-existent product', async () => {
    const response = await request(app)
      .get('/api/products/nonexistent/completion')
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('PRODUCT_NOT_FOUND');
  });

  it('returns explanation with all fields populated', async () => {
    const response = await request(app)
      .get('/api/products/blocked-product/completion')
      .set('Authorization', `Bearer ${adminToken}`);
    
    const explanation = response.body.operatorExplanation;
    expect(explanation.summary).toBeDefined();
    expect(Array.isArray(explanation.blockingIssues)).toBe(true);
    expect(Array.isArray(explanation.completionBreakdown)).toBe(true);
    expect(Array.isArray(explanation.siteStatus)).toBe(true);
    expect(Array.isArray(explanation.actionRequired)).toBe(true);
  });
});
```

### Frontend Tests

```typescript
// test: CompletionExportGatePanel renders explanation
describe('CompletionExportGatePanel', () => {
  it('displays blockingReasons when product is blocked', async () => {
    const explanation = {
      completionPct: 75,
      blockingReasons: [{
        type: 'COMPLETION_BELOW_THRESHOLD',
        message: 'Product 5% below threshold'
      }]
    };
    
    mockFetch.mockResolvedValue({ ok: true, json: () => explanation });
    
    const { getByText } = render(
      <CompletionExportGatePanel productId="test-product" />
    );
    
    await waitFor(() => {
      expect(getByText(/Why blocked/i)).toBeInTheDocument();
      expect(getByText(/5% below threshold/i)).toBeInTheDocument();
    });
  });
});

// test: ExportBlockedModal renders explanation
describe('ExportBlockedModal', () => {
  it('displays operatorExplanation with site status', () => {
    const explanation = {
      summary: 'Export blocked: 250 products below 80%',
      siteStatus: [
        { site: 'us', blocked: false },
        { site: 'uk', blocked: true, reason: 'Missing title_uk' }
      ],
      completionBreakdown: [...]
    };
    
    const { getByText } = render(
      <ExportBlockedModal
        open={true}
        operatorExplanation={explanation}
      />
    );
    
    expect(getByText(/250 products/i)).toBeInTheDocument();
    expect(getByText(/Missing title_uk/i)).toBeInTheDocument();
  });
});

// test: Consistency between surfaces
describe('Explanation Consistency', () => {
  it('renders identically in modal and panel', () => {
    const explanation = { /* fixture */ };
    
    const modalRender = render(<ExportBlockedModal explanation={explanation} />);
    const panelRender = render(<CompletionExportGatePanel explanation={explanation} />);
    
    // Both should show same summary, site status, breakdown
    expect(modalRender.getByText(explanation.summary))
      .toHaveTextContent(panelRender.getByText(explanation.summary).textContent);
  });
});
```

---

## 8. Merge-Blocking Markers

**This PR will include:**
```markdown
## MERGE BLOCKED — depends on PR #433 and PR #434

This PR is **merge-blocked** and awaits the landing of:
- [PR #433](https://github.com/twgallo13/ROPI-V2.1/pull/433) (LP-1.0.0 documentation)
- [PR #434](https://github.com/twgallo13/ROPI-V2.1/pull/434) (LP-1.1.0 backend enforcement)

Both must merge to `aoss-main` before this PR can merge.
```

---

## 9. Governance Compliance

**Constraints (Locked):**
- ✅ No changes to completion rules config schema (locked by LP-1.0.0)
- ✅ No UI for editing completion rules (LP-1.3.0 only)
- ✅ No changes to user-facing explanations (LP-1.4.0 only)
- ✅ operatorExplanation format matches backend config spec
- ✅ All changes driven by locked documentation
- ✅ Merge-blocked by upstream PR dependencies

---

## 10. Summary

**Explanation Gaps Identified:** 5
1. ❌ Missing product completion endpoint
2. ❌ Incomplete explanation payload coverage
3. ❌ UI surface not displaying all explanation components
4. ✅ Partial: Product Editor Panel code ready but endpoint missing
5. ⚠️ Need: UI consistency validation

**Implementation Scope:** 
- 1 backend endpoint (product completion)
- 2 frontend enhancements (modal display, consistency tests)
- 8+ test cases (backend schema, frontend rendering, cross-surface consistency)

**Expected Outcome:** Operators see complete, consistent explanations across all surfaces for why exports are blocked and what actions to take.

---

**Status:** DRAFT ready for formal relay

