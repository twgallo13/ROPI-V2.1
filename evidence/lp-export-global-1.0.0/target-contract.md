# Target Contract — RetailOps Global Export Readiness

**LP:** LP-export-global-1.0.0 HES A  
**Version:** 1.0.0  
**Date:** 2026-01-06

---

## Overview

This document defines the **target API contract** for RetailOps global export mode. The contract decouples product-level readiness from per-site evaluation, enabling a single global export flow while maintaining backward compatibility for other tenants.

---

## Design Principles

1. **Product-level readiness primary:** RetailOps export decisions are based on product-level completeness (core + classification attributes), not site-specific attributes
2. **Backward compatible:** Non-RetailOps tenants continue to receive `siteStatus[]` and per-site evaluation
3. **Mode-driven behavior:** A `mode` field signals which contract the client should consume
4. **No breaking changes:** Existing UI and API clients continue to work without modification

---

## Target API Response Structure

### Endpoint

```
GET /api/products/:id/completion
GET /api/admin/exports/readiness
```

### Response Schema (RetailOps Mode)

```typescript
interface CompletionDrivenExportReadiness {
  // NEW: Mode indicator
  mode: "GLOBAL" | "SITE_SCOPED";
  
  // NEW: Product-level readiness (RetailOps primary field)
  productLevelReadiness: {
    ready: boolean;              // true if product is export-ready (ignores site-specific attrs)
    completionPct: number;       // 0-100, product-level completion score
    threshold: number;           // threshold from config (e.g., 80)
    blockingReasons: string[];   // Array of human-readable blocking reasons
    missingAttributes: string[]; // Array of attribute IDs missing at product level
  };
  
  // EXISTING: Overall readiness (backward compatibility)
  ready: boolean;                // Derived from productLevelReadiness.ready in GLOBAL mode
  completionPct: number;         // Same as productLevelReadiness.completionPct in GLOBAL mode
  threshold: number;             // Same as productLevelReadiness.threshold
  hasBlockingSites: boolean;     // Always false in GLOBAL mode
  
  // EXISTING: Detailed explanation
  operatorExplanation: {
    summary: string;             // e.g., "Product is export-ready (85% complete)"
    mode: "GLOBAL" | "SITE_SCOPED";  // NEW: Redundant for clarity
    blockingIssues: string[];    // Populated from productLevelReadiness.blockingReasons
    
    // NEW: Product-level breakdown (RetailOps primary field)
    productCompletionBreakdown: Array<{
      segmentId: string;
      segmentName: string;
      score: number;             // 0-100
      weightPct: number;         // Segment weight
      missingAttributes: string[];
    }>;
    
    // EXISTING: Segment breakdown (backward compat, same as productCompletionBreakdown in GLOBAL)
    completionBreakdown: Array<{
      segmentId: string;
      segmentName: string;
      score: number;
      weightPct: number;
      missingAttributes: string[];
    }>;
    
    // EXISTING/MODIFIED: Per-site status (empty or omitted in GLOBAL mode)
    siteStatus?: Array<{
      site: string;
      blocked: boolean;
      reason?: string;
      missingAttributes?: string[];
    }>;
    
    actionRequired: string[];    // e.g., ["Add category attribute", "Add department"]
  };
  
  // EXISTING: Timestamps and versioning
  evaluationTimestamp: string;   // ISO 8601
  rulesVersion: number;          // Completion rules version
  
  // OPTIONAL: Catalog stats (catalog-level readiness only)
  catalogStats?: {
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;  // Always 0 in GLOBAL mode
    readyCount: number;
  };
}
```

---

## Field Semantics

### mode: "GLOBAL" | "SITE_SCOPED"

- **GLOBAL:** Product-level readiness only; `siteStatus[]` is empty or omitted
- **SITE_SCOPED:** Per-site evaluation; `siteStatus[]` is populated

**Determination logic:**
- If tenant config `exportMode = "GLOBAL"` → mode = "GLOBAL"
- Otherwise → mode = "SITE_SCOPED"

**UI consumption:**
```typescript
if (response.mode === "GLOBAL") {
  // Render product-level readiness only
  // Hide per-site dropdown and site-specific panels
  const ready = response.productLevelReadiness.ready;
  const pct = response.productLevelReadiness.completionPct;
} else {
  // Render per-site UI (current behavior)
  const siteStatus = response.operatorExplanation.siteStatus;
}
```

---

### productLevelReadiness

**Purpose:** Primary field for RetailOps (GLOBAL mode) that contains product-level export readiness.

**Calculation (GLOBAL mode):**
1. Evaluate product using **only** product-level segments (no site-specific attributes)
2. Ignore segments with `siteAware: true` (e.g., Description/SEO)
3. Compute completion score from enabled product-level segments:
   - Core Information (sku, mpn, name, brand, website)
   - Classification (category, class, department)
   - Identity/Demographic (gender, age_group)
   - Color (primary_color, descriptive_color)
   - Materials/Construction (material, fit)
4. Compare to threshold (e.g., 80%)
5. Set `ready: true` if `completionPct >= threshold`

**Fields:**
- `ready`: Boolean indicating if product can be exported
- `completionPct`: 0-100 score based on product-level segments only
- `threshold`: Export unlock threshold from config
- `blockingReasons`: Array of human-readable reasons (e.g., `["Missing category attribute"]`)
- `missingAttributes`: Array of attribute IDs that are missing (e.g., `["category", "department"]`)

---

### siteStatus (SITE_SCOPED mode only)

**Purpose:** Per-site blocking details for tenants that use site-specific attributes.

**Behavior in GLOBAL mode:**
- `siteStatus` is either:
  - An empty array `[]`
  - Omitted entirely (preferred)

**Behavior in SITE_SCOPED mode:**
- Populated as today (per-site blocking reasons, missing site-specific attributes)

---

### completionBreakdown vs productCompletionBreakdown

**completionBreakdown:**
- Existing field (backward compatibility)
- In GLOBAL mode: Same as `productCompletionBreakdown`
- In SITE_SCOPED mode: Includes all segments (product-level + site-specific)

**productCompletionBreakdown:**
- NEW field
- In GLOBAL mode: Contains only product-level segments (no site-specific)
- Omitted or empty in SITE_SCOPED mode

**Rationale:** Provide explicit product-level breakdown for RetailOps UI without breaking existing clients.

---

## UI Implications

### ExportPage.tsx (Export Manager)

**Current behavior:**
- Renders per-site dropdown (ropi-web, shiekh, karmaloop, mltd)
- Export API requires `site` parameter

**Target behavior (GLOBAL mode):**
- **Hide** per-site dropdown
- Export API call **omits** `site` parameter (or sends synthetic `site: "global"`)
- Show product-level readiness card:
  ```
  ✅ Export Ready
  Product Completion: 85% (threshold: 80%)
  [Start Export] button
  ```

**Target behavior (SITE_SCOPED mode):**
- Keep current UI (per-site dropdown, per-site evaluation)

**Implementation:**
```typescript
const mode = completion.mode;

if (mode === "GLOBAL") {
  // Render global export UI
  const ready = completion.productLevelReadiness.ready;
  const pct = completion.productLevelReadiness.completionPct;
  // Hide site dropdown
} else {
  // Render per-site UI (current code path)
  const siteStatus = completion.operatorExplanation.siteStatus;
}
```

---

### CompletionExportGatePanel.tsx (Product Editor)

**Current behavior:**
- Renders per-site accordion with ✅/❌ status per site
- Shows `siteStatus[]` details

**Target behavior (GLOBAL mode):**
- **Hide** per-site accordion
- Render product-level completion card:
  ```
  ✅ Product is Export-Ready
  Completion: 85% / 80% threshold
  
  Completion by Segment:
  - Core Information: 100% (20% weight)
  - Classification: 67% (20% weight) — Missing: department
  - Identity/Demographic: 100% (15% weight)
  ...
  ```

**Target behavior (SITE_SCOPED mode):**
- Keep current UI (per-site accordion)

---

## Migration Strategy

### Phase 1: Add `mode` and `productLevelReadiness` Fields (Non-Breaking)

1. Extend backend response to include:
   - `mode` field (default to `"SITE_SCOPED"` for all tenants initially)
   - `productLevelReadiness` object (computed even in SITE_SCOPED mode, but not used by UI)
   - `productCompletionBreakdown` array
2. Existing UI ignores new fields (backward compatible)
3. Deploy to staging, verify no regressions

### Phase 2: Enable GLOBAL Mode for RetailOps Tenant

1. Add tenant-level config: `exportMode: "GLOBAL"`
2. Backend checks tenant config and sets `response.mode = "GLOBAL"` for RetailOps
3. UI checks `mode` field:
   - If `"GLOBAL"` → render new product-level UI
   - If `"SITE_SCOPED"` → render current per-site UI
4. Deploy to staging, test with RetailOps tenant

### Phase 3: Adjust Segment Configuration (Data Migration)

1. Update `settings/exportSettings/completionRules`:
   - Add or enable "Product Classification" segment (category, class, department)
   - Ensure product-level segments have `siteAware: false`
   - Keep Description/SEO segment but mark as `appliesTo.mode: "CONDITIONAL"` with `sites: ["ropi-web", "shiekh"]` (exclude from GLOBAL mode)
2. Test with `mpn 18-test` and `211737-90h1-8` to verify classification enforcement

---

## Rollback Plan

**If GLOBAL mode causes issues:**

1. Set tenant config `exportMode: "SITE_SCOPED"` (immediate rollback)
2. UI reverts to per-site rendering (no code change needed)
3. Backend still computes `productLevelReadiness` but UI doesn't use it

**If backend changes cause errors:**

1. Revert backend PR (restore previous completion evaluation logic)
2. Remove `mode`, `productLevelReadiness`, `productCompletionBreakdown` fields
3. UI continues to work (ignores missing fields)

---

## Validation & Testing

### Unit Tests

- Backend: Test `mode` determination logic
- Backend: Test `productLevelReadiness` calculation with mock product data
- Backend: Verify `siteStatus` is empty in GLOBAL mode
- UI: Test conditional rendering based on `mode` field

### Integration Tests

- Call `/api/products/:id/completion` with RetailOps tenant → verify `mode: "GLOBAL"`
- Call same endpoint with non-RetailOps tenant → verify `mode: "SITE_SCOPED"`
- Verify `productLevelReadiness.ready` is true when product has all core/classification attributes
- Verify `productLevelReadiness.ready` is false when missing classification attributes

### E2E Tests

- Load ExportPage with RetailOps tenant → verify no per-site dropdown
- Load ExportPage with non-RetailOps tenant → verify per-site dropdown present
- Load product editor with RetailOps tenant → verify product-level completion card
- Click "Start Export" in GLOBAL mode → verify export API call omits `site` parameter

---

## Open Questions

1. **Should `website` remain required in GLOBAL mode?**
   - Current: Products without `website` field are blocked (extractSelectedSites returns `[]`)
   - Proposal: In GLOBAL mode, treat `website` as optional or synthetic (set to `["global"]` if missing)

2. **How to handle catalog-level readiness in GLOBAL mode?**
   - Current: Catalog evaluation iterates over all products and checks per-site blocking
   - Proposal: In GLOBAL mode, skip site-gating logic and evaluate product-level completion only

3. **Should GLOBAL mode be tenant-scoped or user-scoped?**
   - Proposal: Tenant-scoped (all users in RetailOps tenant see GLOBAL mode)

4. **Should we version the API response or use feature detection?**
   - Proposal: Use `mode` field for feature detection (no API versioning needed)

---

## Files That Will Change (Implementation Phase)

**Backend:**
- `packages/api/src/services/completionDrivenExportReadiness.ts` — Add mode logic, productLevelReadiness calculation
- `packages/api/src/services/completionEvaluationEngine.ts` — Filter segments by `appliesTo` in GLOBAL mode
- `packages/api/src/routes/export.ts` — Handle GLOBAL mode export requests (omit site parameter)

**Frontend:**
- `packages/web/src/pages/ExportPage.tsx` — Conditional rendering based on `mode`
- `packages/web/src/components/product/CompletionExportGatePanel.tsx` — Conditional rendering based on `mode`

**Config:**
- `settings/exportSettings/completionRules` — Add/enable classification segment, adjust `appliesTo` for Description/SEO

---

## Summary

**Target contract provides:**
- ✅ Product-level readiness field (`productLevelReadiness`) for RetailOps
- ✅ Mode indicator (`mode`) for UI conditional rendering
- ✅ Backward compatibility (`siteStatus[]`, `completionBreakdown` preserved)
- ✅ Clear migration path (phased rollout, instant rollback)
- ✅ No breaking changes for existing tenants

**Next steps:** HES B (implementation design) will detail exact code changes, segment configuration, and test plan.
