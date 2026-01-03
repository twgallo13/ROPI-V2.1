# Catalog-Level Export Readiness - Conservative Blocking Contract

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts`  
**Function:** `evaluateCatalogCompletion()`  
**Contract Type:** GOVERNANCE-ENFORCED CONSERVATIVE POLICY

---

## Contract Definition

When `calculateCompletionDrivenExportReadiness()` is called with **no product parameter**, it evaluates catalog-level readiness using conservative blocking semantics:

### Policy Rules (Priority Order)

1. **Site Blocking Takes Precedence**
   - If **ANY** product has site Description/SEO blocking → entire export blocked
   - `completionPct` forced to `0` when site-blocked
   - `hasBlockingSites = true`

2. **Threshold Blocking (Secondary)**
   - If no site blocking AND **ANY** product below `exportUnlockThresholdPct` → export blocked
   - Only shown if NO site blocking exists

3. **Ready State**
   - Export ready only if **ALL** products pass both gates

### No Averaging - Conservative Minimum

- ❌ **FORBIDDEN:** `avgCompletion = sum(completionPct) / productCount`
- ✅ **REQUIRED:** `minCompletionPct = min(productCompletionPct)`
- **Rationale:** Averaging masks failing products (governance violation)

### Operator Visibility - Deterministic Samples

- **Sample Limit:** `N = 5` (explicit, hard-coded)
- **Ordering:** Products ordered by `id` (deterministic)
- **Blocking Reasons:** First 5 failing products with exact details
- **Overflow Indicator:** If more than 5 blocked, add summary reason

### Catalog Statistics (Required Fields)

```typescript
catalogStats: {
  totalProducts: number;          // Total evaluated (may be limited to 1000)
  blockedByCompletionCount: number; // Below threshold (no site blocking)
  blockedBySiteCount: number;      // Site Description/SEO missing
  readyCount: number;              // Passing both gates
}
```

---

## Acceptance Evidence (Manual Verification)

### Test 1: One Failing Product Blocks Export

**Setup:**
- Catalog with 10 products
- 9 products at 100% completion
- 1 product at 75% completion (below 80% threshold)

**Expected:**
- ✅ `ready = false`
- ✅ `completionPct = 75` (minimum, not average of 97.5%)
- ✅ `blockingReasons[0].type = 'COMPLETION_BELOW_THRESHOLD'`
- ✅ `blockingReasons[0].details.productId = 'prod-75'`
- ✅ `catalogStats.blockedByCompletionCount = 1`
- ✅ `catalogStats.readyCount = 9`

### Test 2: One Site-Blocked Product Blocks Export (No Threshold Duplicate)

**Setup:**
- Catalog with 10 products
- 9 products at 100% completion
- 1 product missing `title_uk` (site blocking)

**Expected:**
- ✅ `ready = false`
- ✅ `completionPct = 0` (forced when site-blocked)
- ✅ `hasBlockingSites = true`
- ✅ `blockingReasons[0].type = 'SITE_DESCRIPTION_SEO_MISSING'`
- ✅ `blockingReasons[0].details.productId = 'prod-blocked'`
- ✅ `blockingReasons[0].details.site = 'uk'`
- ✅ `blockingReasons` has NO threshold reason (single canonical gate)
- ✅ `catalogStats.blockedBySiteCount = 1`
- ✅ `catalogStats.readyCount = 9`

### Test 3: All Passing Products Allows Export

**Setup:**
- Catalog with 10 products
- All products at 100% completion
- No site blocking

**Expected:**
- ✅ `ready = true`
- ✅ `completionPct = 100` (minimum is 100%)
- ✅ `hasBlockingSites = false`
- ✅ `blockingReasons = []`
- ✅ `catalogStats.readyCount = 10`
- ✅ `catalogStats.blockedByCompletionCount = 0`
- ✅ `catalogStats.blockedBySiteCount = 0`

---

## Implementation Verification Checklist

### Code Audit Points

1. **Line ~115:** Firestore query uses `.orderBy('id').limit(1000)`
   - ✅ Deterministic ordering
   - ✅ Explicit limit (no hidden default)

2. **Line ~170:** Conservative blocking logic
   ```typescript
   const blockedBySite = evaluations.filter(e => e.hasBlockingSites);
   const blockedByThreshold = evaluations.filter(e => !e.hasBlockingSites && e.isBelowThreshold);
   const ready = evaluations.filter(e => !e.hasBlockingSites && !e.isBelowThreshold);
   
   const hasAnyBlocking = blockedBySite.length > 0 || blockedByThreshold.length > 0;
   ```
   - ✅ ANY product blocked → export blocked
   - ✅ No averaging

3. **Line ~173:** Minimum completion percentage
   ```typescript
   const minCompletionPct = evaluations.length > 0 
     ? Math.min(...evaluations.map(e => e.completionPct))
     : 0;
   ```
   - ✅ Uses `Math.min()`, not average
   - ✅ Represents worst-case product

4. **Line ~178:** Deterministic sample limit
   ```typescript
   const SAMPLE_LIMIT = 5; // Explicit, deterministic sample size
   const sampleProducts = blockedBySite.slice(0, SAMPLE_LIMIT);
   ```
   - ✅ Hard-coded limit (no magic numbers)
   - ✅ Deterministic slice

5. **Line ~197:** Overflow indicator
   ```typescript
   if (blockedBySite.length > SAMPLE_LIMIT) {
     blockingReasons.push({
       message: `${blockedBySite.length - SAMPLE_LIMIT} additional products also blocked...`,
     });
   }
   ```
   - ✅ Operator visibility into scale

6. **Line ~249:** Force completion to 0 when site-blocked
   ```typescript
   completionPct: blockedBySite.length > 0 ? 0 : minCompletionPct,
   ```
   - ✅ Single canonical gate semantics

---

## Forbidden Patterns (Code Review)

### ❌ FORBIDDEN: Averaging
```typescript
// WRONG - creates inferred policy
const avgCompletion = totalCompletion / productCount;
```

### ❌ FORBIDDEN: Hidden Limits
```typescript
// WRONG - no explicit limit
const productsSnapshot = await db.collection('products').get();
```

### ❌ FORBIDDEN: Non-Deterministic Ordering
```typescript
// WRONG - undefined order
const productsSnapshot = await db.collection('products').limit(1000).get();
```

### ✅ CORRECT: Conservative Minimum
```typescript
const minCompletionPct = Math.min(...evaluations.map(e => e.completionPct));
```

### ✅ CORRECT: Explicit Limit with Ordering
```typescript
const productsSnapshot = await db
  .collection('products')
  .orderBy('id')
  .limit(1000)
  .get();
```

---

## Governance Verification Log

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No averaging | ✅ PASS | Line 173: `Math.min()` used |
| Conservative blocking | ✅ PASS | Line 170-172: ANY product blocks |
| Deterministic samples | ✅ PASS | Line 178: `SAMPLE_LIMIT = 5` |
| Explicit limits | ✅ PASS | Line 115: `.limit(1000)` |
| Deterministic ordering | ✅ PASS | Line 115: `.orderBy('id')` |
| catalogStats required | ✅ PASS | Line 245-250: All fields present |
| Force 0 when site-blocked | ✅ PASS | Line 249: `? 0 : minCompletionPct` |

---

## Change Log

**2026-01-03:** GOVERNANCE FIX - Removed averaging, implemented conservative min-based blocking per PROMPT 1

**Previous Implementation (VIOLATION):**
```typescript
const avgCompletion = Math.round(totalCompletion / productCount);
const isReady = !hasSiteBlocking && avgCompletion >= threshold;
```

**Current Implementation (COMPLIANT):**
```typescript
const minCompletionPct = Math.min(...evaluations.map(e => e.completionPct));
const hasAnyBlocking = blockedBySite.length > 0 || blockedByThreshold.length > 0;
const ready = !hasAnyBlocking;
```

---

## Integration Test Recommendations

Due to Firestore mocking complexity, catalog-level tests should be executed as **integration tests** with real Firestore (or emulator):

1. Seed catalog with known product set
2. Call `calculateCompletionDrivenExportReadiness()` (no product parameter)
3. Assert conservative blocking behavior
4. Verify `catalogStats` counts
5. Verify no averaging in `completionPct`

**Test Environment:** Firestore emulator with controlled product data
**Test Suite:** `packages/api/src/services/completionDrivenExportReadiness.integration.test.ts`
