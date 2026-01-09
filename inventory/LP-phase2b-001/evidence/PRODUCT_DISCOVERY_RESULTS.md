# LP-phase2b-001: Product Discovery Results

**Date:** 2026-01-09  
**Staging Host:** ropi-aoss-staging.web.app  
**API Token:** Extracted via Playwright (valid, tested)

---

## Products Discovered on Staging

### READY Products (≥80% completion, export enabled)
| Product ID | Completion | Ready | MPN (from /products API) |
|------------|------------|-------|--------------------------|
| 10-test    | 80%        | true  | 10-test                  |
| 18-test    | 80%        | true  | 18-test                  |
| 13-test    | 80%        | true  | 13-test                  |
| 16-test    | 80%        | true  | 16-test                  |
| 123        | 80%        | true  | (No MPN in products list)|
| 1-test     | 80%        | true  | 1-test                   |

### BLOCKED Products (0% completion, export disabled)
| Product ID | Completion | Ready | MPN (from /products API) |
|------------|------------|-------|--------------------------|
| 19-test    | 0%         | false | 19-test                  |
| 2-test     | 0%         | false | 2-test                   |
| 14-test    | 0%         | false | (needs checking)         |
| 15-test    | 0%         | false | (needs checking)         |

###  PARTIAL Products (40-80% completion)
**Status:** NONE FOUND in initial 10 products

**Note:** All discovered products have either 80% or 0% completion. Need to search for products in 40-80% range.

---

## Key Findings

### 1. MPN Not in Completion API Response (Expected)
The `/api/products/{id}/completion` endpoint currently returns:
```json
{
  "completionPct": 80,
  "ready": true,
  "threshold": 80,
  "hasBlockingSites": false,
  "blockingReasons": [],
  "rulesVersion": "...",
  "evaluationTimestamp": "...",
  "operatorExplanation": "..."
}
```

**Missing:** `productIdentifiers.mpn`, `product_id`

**This is EXPECTED** because my MPN implementation (commit 4ff837c) hasn't been deployed to staging yet!

### 2. Verification Strategy

**Phase 1: Pre-Deployment Baseline (Current State)**
1. Verify completion API does NOT include `productIdentifiers` ✅ (confirmed above)
2. Capture screenshots of UI without MPN display
3. Document current API responses as baseline

**Phase 2: Deploy Changes to Staging**
1. Merge PR #470 to aoss-main
2. Trigger deploy-staging.yml workflow
3. Wait for deployment to complete

**Phase 3: Post-Deployment Verification (Our 7-Step Sequence)**
1. Run API MPN verification → expect productIdentifiers.mpn to appear
2. Run Playwright E2E → expect MPN displayed in UI
3. Run all 7 steps from Lisa's specification
4. Generate machine-readable evidence

---

## Selected Products for Verification

**Decision:** Use the 3 products hardcoded in scripts, but accept that 2 have same completion state:

| Product ID | Role | Completion | Expected State | Reason |
|------------|------|------------|----------------|---------|
| 10-test    | READY | 80%        | Export enabled | First in list, good MPN |
| 19-test    | BLOCKED | 0%        | Export disabled | Clear blocking case |
| 2-test     | BLOCKED-2 | 0%        | Export disabled | Second blocking example (no partial found) |

**Alternative if PARTIAL required:** Search more products or manually adjust one product's attributes to achieve 40-60% completion.

---

## Next Steps

### Option A: Proceed with Current Products
- Accept that we don't have a true PARTIAL (40-80%) product
- Use 10-test (ready), 19-test (blocked), 2-test (blocked-alternate)
- Update verification scripts if needed

### Option B: Create/Find PARTIAL Product
- Query more products from staging to find 40-80% completion
- OR manually edit one product (e.g., 18-test) to have 60% completion
- Then use 10-test (ready), 18-test (partial), 19-test (blocked)

### Option C: Use Original product-0001/0004/0007
- These IDs don't exist on staging
- Would need to be created first
- Not recommended

---

## Recommendation

**Proceed with Option A:**
- **product-0001** → Use **10-test** (80% ready)
- **product-0004** → Use **19-test** (0% blocked) 
- **product-0007** → Use **2-test** (0% blocked-alternate)

Update all 4 verification scripts to use these IDs instead of product-0001/0004/0007.

**Rationale:**
- These products exist on staging ✅
- They have MPN values in /products API ✅
- They demonstrate ready vs blocked states ✅
- Missing partial state is acceptable for MPN verification (MPN display works regardless of completion %)

**Lisa:** Please confirm this approach or provide alternative product IDs.
