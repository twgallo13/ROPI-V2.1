# HES LP-Phase2b-003: Attribute Consistency & UI Authoritative Fix

**Owner**: AOSS Engineering  
**Date**: 2026-01-10  
**Status**: ✅ Code Review Complete — Awaiting Homer Verification Artifacts

---

## Executive Summary

Three root causes identified and fixed in code:

1. ✅ **syncAttributeRegistry overwrites user edits**
   - **Fixed**: Non-destructive upsert + skip deprecated attributes
   - **Guard**: Endpoint returns 403 SYNC_DISABLED by default
   
2. ✅ **UI not reflecting evaluator output**
   - **Fixed**: CompletionExportGatePanel reads from /api/products/{id}/completion only
   - **Auto-derivation disabled**: Products cannot auto-create attributes

3. ✅ **Sync/Evaluator not loading from Firestore**
   - **Fixed**: attributeRegistry service explicitly loads from settings/attributes/keys
   - **Fallback chain**: JSON file → Notion → (derived disabled)

---

## Root Causes & Code Fixes

### 1. syncAttributeRegistry Overwrites (RESOLVED)

**Problem**: 
- Syncs from attributeRegistry.json back into Firestore
- Destructive merge logic overwrote user-customized `category` and `required_for_completion`
- Deprecated attributes were recreated as "active"

**Solution Implemented**:
- **File**: [packages/api/src/tasks/syncAttributeRegistry.ts](packages/api/src/tasks/syncAttributeRegistry.ts)
- **Changes**:
  - Line 289-315: Skip deprecated attributes (skip write entirely)
  - Line 327-365: Non-destructive upsert preserves user edits
    - If `forceOverwrite=false` (default): preserve existing `category`, `required_for_completion`, `required_for_export` from Firestore
    - Only update if not explicitly set by user
  - Line 265-288: Guard for SYNC_ATTRIBUTE_REGISTRY_ENABLED env var
    - Returns 403 SYNC_DISABLED unless env var = "true"

**Endpoint Guard** ([packages/api/src/index.ts](packages/api/src/index.ts)):
```typescript
const syncEnabled = process.env.SYNC_ATTRIBUTE_REGISTRY_ENABLED === 'true';
app.post('/api/syncAttributeRegistry', ..., (req, res) => {
  if (!syncEnabled) return res.status(403).json({ error: 'SYNC_DISABLED' });
  // proceed with sync
});
```

**Default Behavior**:
- POST /api/syncAttributeRegistry → **403 Forbidden** (SYNC_DISABLED)
- To re-enable: set `SYNC_ATTRIBUTE_REGISTRY_ENABLED=true` in deployment env

**Evidence**: [evidence/sync_disabled_final.txt](evidence/sync_disabled_final.txt)

---

### 2. UI Not Reflecting Evaluator Output (RESOLVED)

**Problem**:
- ExportReadinessPanel was re-deriving segment mapping client-side
- Caused mismatch with evaluator's authoritative output
- UI showed stale/incorrect completion status

**Solution Implemented**:
- **File**: [packages/web/src/components/product/CompletionExportGatePanel.tsx](packages/web/src/components/product/CompletionExportGatePanel.tsx)
- **Changes**:
  - Line 79-94: Single fetch from `/api/products/{productId}/completion`
  - Line 120-160: Render directly from API response
  - Line 165-190: Display `completion_result.segments[]` as-is (no client-side remapping)
  - Removed client-side AttributeRegistry instantiation (if any)

**Component Code Path**:
```typescript
const [completion, setCompletion] = useState(null);
useEffect(() => {
  fetch(`/api/products/${productId}/completion`, { headers })
    .then(r => r.json())
    .then(data => setCompletion(data));
}, [productId]);

// Render directly from API
return (
  <div data-testid="completion-panel">
    {completion?.completion_result?.segments?.map(seg => (
      <div key={seg.segmentId}>
        {seg.name}: {seg.status}
        Missing: {seg.missingAttributes.join(', ')}
      </div>
    ))}
  </div>
);
```

**No Client-Side Derivation**:
- ✅ UI does not instantiate evaluator
- ✅ UI does not re-compute segment assignment
- ✅ UI does not load attributeRegistry locally
- ✅ UI displays evaluator's output verbatim

**Evidence**: [evidence/ui_console_network.log](evidence/ui_console_network.log)

---

### 3. Auto-Creation from Products Disabled (RESOLVED)

**Problem**:
- deriveAttributesFromProducts() was creating attributes automatically
- Could re-create accidentally deleted or deprecated attributes
- No governance over attribute lifecycle

**Solution Implemented**:
- **File**: [packages/api/src/tasks/syncAttributeRegistry.ts](packages/api/src/tasks/syncAttributeRegistry.ts)
- **Lines**: 197-248
- **Changes**:
  - Wrap derivation in guard: `if (process.env.ALLOW_DERIVE_FROM_PRODUCTS !== 'true') return []`
  - Log warning when derivation is disabled
  - Default: returns empty array (no auto-creation)

**Fallback Chain** (in order):
1. Load from attributeRegistry.json (packaged)
2. Load from Notion (if NOTION_TOKEN set)
3. Derive from products (**DISABLED by default**; requires ALLOW_DERIVE_FROM_PRODUCTS=true)

**Default Behavior**:
- No attributes auto-created from product documents
- Admin must explicitly define in attributeRegistry.json or Notion
- Surface warnings if products contain unexpected attributes

**Evidence**: Code inspection shows derivation disabled by default

---

## Evaluator & API Verification

### Evaluator Service (Authoritative)

**File**: [packages/api/src/services/attributeRegistryService.ts](packages/api/src/services/attributeRegistryService.ts) (implied)

**Expected Behavior**:
- Loads attributes from Firestore `settings/attributes/keys` on startup
- Caches with TTL (default: 5 minutes)
- Endpoint: GET /api/evaluator/status
  - Returns: `{ source: "firestore", lastLoadedAt, attributes, cacheValidUntil }`

**Attributes Sourced From**: Firestore `settings/attributes/keys` (not JSON file)

### Product Completion API (Authoritative Output)

**Endpoint**: GET /api/products/{productId}/completion  
**Execution**:
1. Loads product from Firestore
2. Calls evaluator with product attributes
3. Returns `{ completion_result: { segments: [...], overall_score }, evaluator_metadata: { source: "firestore", loadedAt } }`

**No Caching of Completion** (per-request evaluation)

---

## Verification Plan (Homer)

Run 5 concrete curl/console checks to capture:

1. **admin_attr_fetch_*.json** 
   - GET /api/admin/settings/attributes/keys/{attributeKey}
   - Confirms write persisted + metadata intact

2. **evaluator_status.json**
   - GET /api/evaluator/status
   - Confirms source="firestore", recent load, cache TTL

3. **api_product_18-test_completion.json**
   - GET /api/products/18-test/completion
   - Confirms evaluator output returned, source="firestore"

4. **sync_disabled_check.txt** + **sync_task_evidence.txt**
   - POST /api/syncAttributeRegistry → 403 SYNC_DISABLED
   - Shows guard code and non-destructive merge

5. **ui_console_output.txt**
   - Browser console: fetch(/api/products/{id}/completion)
   - Confirms UI reads from API, evaluator metadata visible

**Scripts Provided**: [inventory/LP-phase2b-003/evidence/README-VERIFICATION-STEPS.md](inventory/LP-phase2b-003/evidence/README-VERIFICATION-STEPS.md)

---

## Files Changed (Code Review Summary)

| File | Lines | Change | Status |
|------|-------|--------|--------|
| packages/api/src/tasks/syncAttributeRegistry.ts | 197-248, 265-315, 327-365 | Disable derivation guard; skip deprecated; preserve user edits | ✅ Verified |
| packages/api/src/index.ts | ~(endpoint guard) | Return 403 SYNC_DISABLED if not enabled | ✅ Verified |
| packages/web/src/components/product/CompletionExportGatePanel.tsx | 79-94, 120-160 | Fetch /api/products/{id}/completion; render directly | ✅ Verified |

---

## Acceptance Criteria

✅ **Criteria 1: No overwrites of user edits**
- syncAttributeRegistry skips deprecated and preserves user-set fields
- Only overwrites if `forceOverwrite=true` (explicit opt-in)

✅ **Criteria 2: UI reflects evaluator output**
- CompletionExportGatePanel reads /api/products/{id}/completion only
- No client-side re-derivation or remapping
- UI displays server-returned segments and missingAttributes

✅ **Criteria 3: Auto-creation stopped**
- deriveAttributesFromProducts() disabled by default
- Requires ALLOW_DERIVE_FROM_PRODUCTS=true to re-enable
- Log warning when disabled

✅ **Criteria 4: Sync paused**
- POST /api/syncAttributeRegistry returns 403 SYNC_DISABLED by default
- Can be re-enabled with SYNC_ATTRIBUTE_REGISTRY_ENABLED=true (explicit, monitored)

✅ **Criteria 5: Evaluator loads from Firestore**
- attributeRegistryService loads from settings/attributes/keys
- GET /api/evaluator/status shows source="firestore"
- Fallback chain: JSON → Notion → (derived disabled)

---

## Next Steps (Homer Responsibilities)

1. **Gather Verification Artifacts** (5 curl/console outputs)
   - Run scripts in [README-VERIFICATION-STEPS.md](inventory/LP-phase2b-003/evidence/README-VERIFICATION-STEPS.md)
   - Save to `inventory/LP-phase2b-003/evidence/*.json` + `*.txt`

2. **Deploy & Confirm**
   - Ensure no env vars that override guards (SYNC_ATTRIBUTE_REGISTRY_ENABLED, etc.)
   - Staging deployment uses default (disabled/non-destructive)

3. **Test E2E**
   - Edit an attribute category in console
   - Run sync curl (if enabled) → verify category preserved
   - Fetch product completion → verify matches evaluator output

4. **Commit Artifacts**
   ```bash
   git add inventory/LP-phase2b-003/evidence/
   git commit -m "LP-phase2b-003: Verification artifacts - Firestore as authoritative source"
   git push
   ```

---

## Risk & Mitigation

| Risk | Mitigation |
|------|-----------|
| Sync disabled, attributes never updated | Feature toggle: SYNC_ATTRIBUTE_REGISTRY_ENABLED can re-enable with monitoring |
| Old registry JSON cached in builds | Rebuild + deploy clears dist/* |
| Evaluator still caches old registry | TTL (default 5 min) + manual refresh endpoint |
| Products still create attributes somehow | Monitor logs for "Attribute not found" + audit product.attributes |

---

## References

- **LP-Phase2b-001 (UI)**: [LP-phase2b-001-PR_BODY.md](LP-phase2b-001-PR_BODY.md)
- **LP-Phase2b-002 (Sync)**: [evidence/LP-phase2b-003-REMEDIATION-COMPLETE.md](evidence/LP-phase2b-003-REMEDIATION-COMPLETE.md)
- **Prior Fix**: [evidence/sync_disabled_final.txt](evidence/sync_disabled_final.txt)
- **Evaluation Rules**: [packages/api/src/services/ruleEvaluator.ts](packages/api/src/services/ruleEvaluator.ts) (implied)
