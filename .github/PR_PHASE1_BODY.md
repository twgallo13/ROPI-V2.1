# Phase 1: Export Readiness API Extension (Feature-Flagged)

## Summary

This PR adds non-breaking API fields to expose RetailOps' global export mode capability without changing any evaluation semantics or decision logic.

**Link to design:** [HES_B_LP-export-global-1.0.0 Manifest](docs/HES_B_LP-export-global-1.0.0.json)

**Explicit guarantee:** This PR only adds API fields behind a feature flag. No evaluation semantics changed. No gating logic modified.

---

## Changes

### 1. API Extension: Optional Fields

Added to `CompletionDrivenExportReadiness` response:
- `mode?: "GLOBAL" | "SITE_SCOPED"` — indicates exposure context
- `productLevelReadiness?: { ready, completionPct, threshold, hasBlockingSites }` — replicated state from parent fields for global mode

**Backward compatibility:** Fields are optional and only present when feature flag enabled. Existing clients ignore them.

**No evaluation change:** `productLevelReadiness` is computed identically to the parent response fields; no new logic.

### 2. Feature Flag: Firestore + Environment

**Canonical Firestore configuration** (`settings/exportSettings`):
```json
{
  "exportGlobalMode": {
    "enabled": true,
    "mode": "GLOBAL"
  }
}
```

**Legacy/compatibility keys** (automatically normalized):
- `globalExportModeEnabled` (boolean)
- `enableGlobalFields` (boolean)
- `mode` (string; root level)

**Environment fallback** (local/developer convenience):
```bash
EXPORT_GLOBAL_MODE_FEATURE=true
```

Detection logic: Read canonical form first, fall back to legacy keys, then env var.

### 3. Implementation Details

**File:** `packages/api/src/services/completionDrivenExportReadiness.ts`

- Added `detectExportModeFeatureFlag()` function (canonical form + legacy support + env fallback).
- Extended `calculateCompletionDrivenExportReadiness()` to conditionally attach Phase 1 fields.
- Both product-level and catalog-level evaluation paths support the extension.

**Logging:**
- Temporary `console.info` statements for staging verification (disabled by default).
- Enable logs with `EXPORT_GLOBAL_LOGS=true`.
- Logs are feature-flagged and will be removed or moved to ephemeral flag post-verification.

Example log:
```
[ExportReadiness:Phase1] mode=GLOBAL (product), productLevelReadiness= { "ready": true, "completionPct": 92, ... }
```

### 4. Tests

**File:** `packages/api/src/services/__tests__/phase1_extension.test.ts`

- Vitest unit tests verify response includes `mode` and `productLevelReadiness` when flag enabled.
- Tests verify fields are absent when flag disabled.
- Mocks `loadCompletionRules`, `loadExportableAttributes`, and `evaluateCompletion`.

**Run tests locally:**
```bash
cd packages/api
EXPORT_GLOBAL_MODE_FEATURE=true npm run test
```

Or with pnpm monorepo:
```bash
EXPORT_GLOBAL_MODE_FEATURE=true pnpm --filter @ropi-aoss/api test
```

### 5. Documentation

**File:** `docs/API_READINESS_PHASE1.md`

- Canonical flag configuration with examples.
- Legacy key compatibility rules.
- Example JSON responses (product and catalog) with Phase 1 fields.
- Logging control and staging verification steps.
- Explicit note that siteStatus is preserved and no semantics changed.

---

## HES C Verification Plan (Post-Merge, Staging Deploy)

Follow these steps to verify Phase 1 in staging:

### Step 1: Baseline (Feature OFF)
```bash
# Ensure flag is disabled in Firestore or env
unset EXPORT_GLOBAL_MODE_FEATURE

# Call readiness endpoint as admin
curl -X GET "https://staging-api.retailops.example/api/products/{productId}/completion" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response:
# - siteStatus present in operatorExplanation
# - productLevelReadiness ABSENT or null
# - mode ABSENT or null
# Save as: staging_response_flag_off.json
```

### Step 2: Feature ON
```bash
# Enable flag in Firestore
# Document: settings/exportSettings
# Set: { "exportGlobalMode": { "enabled": true, "mode": "GLOBAL" } }

# Or use env (local override):
export EXPORT_GLOBAL_MODE_FEATURE=true

# Re-deploy or trigger re-evaluation
# Call readiness endpoint as admin with logs enabled
export EXPORT_GLOBAL_LOGS=true
curl -X GET "https://staging-api.retailops.example/api/products/{productId}/completion" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Expected response:
# - mode == "GLOBAL"
# - productLevelReadiness present with correct shape
# - siteStatus preserved in operatorExplanation
# - Logs should show: [ExportReadiness:Phase1] mode=GLOBAL (product), productLevelReadiness=...
# Save as: staging_response_flag_on.json
```

### Step 3: Toggle Verification
```bash
# Disable flag again
# Redeploy and call same endpoint
# Confirm response reverts to Step 1 format (no Phase 1 fields)
# Save as: staging_response_toggle_off.json
```

### Step 4: Test Suites
```bash
# Run backend tests (should all pass, no regressions)
pnpm --filter @ropi-aoss/api test

# Run frontend tests (should all pass)
pnpm --filter @ropi-aoss/web test

# Capture CI output and any deploy receipts
```

### Step 5: Checklist
- [ ] Flag OFF: `siteStatus` present, `productLevelReadiness` absent
- [ ] Flag ON: `mode == "GLOBAL"`, `productLevelReadiness` present with correct fields
- [ ] Toggle: behavior reverts when flag disabled
- [ ] `siteStatus` preserved in both ON and OFF states
- [ ] Logs show `[ExportReadiness:Phase1]` when flag ON and `EXPORT_GLOBAL_LOGS=true`
- [ ] All test suites pass
- [ ] CI/deploy receipts captured

**Deliverables:** Save three JSON response samples and test output to `evidence/hes-c-stage-verification-YYYY-MM-DD.json` directory.

---

## Constraints Met

✓ **No evaluation semantics change** — evaluation engine unchanged; only response fields modified.  
✓ **Feature-flagged** — controlled by Firestore flag + env var; rollback is flag toggle.  
✓ **Single PR per LP** — all Phase 1 changes in this PR only.  
✓ **Unit/integration tests** — Vitest coverage for enabled/disabled states.  
✓ **Backward compatible** — new fields optional; existing clients unaffected.  
✓ **Documented** — comprehensive API docs, flag configuration, logging control.  
✓ **Temporary logs** — gated and removable via `EXPORT_GLOBAL_LOGS`.  

---

## Merge Instructions

- **Target branch:** `aoss-main`
- **Merge method:** Squash (per governance)
- **Post-merge:** Deploy to staging and follow HES C verification plan above
- **No production merge** until HES C verified and documented

---

## Files Changed

- `packages/api/src/services/completionDrivenExportReadiness.ts` — feature flag detection, optional fields
- `packages/api/src/services/__tests__/phase1_extension.test.ts` — unit tests (new)
- `docs/API_READINESS_PHASE1.md` — API documentation and examples (new)
