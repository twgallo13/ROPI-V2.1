# LP: Remove Legacy Observations Fallback

## Migration Cleanup — Smart Rules Phase v1.0.0

**Branch:** `lp-remove-legacy-observations-fallback-1.0.0`  
**Start Date:** 2026-01-02  
**Scheduled Removal Date:** 2026-01-16 (after 14-day observation window)  
**Status:** ⏳ WAITING — Do not execute until observation window completes

---

## Overview

This LP removes the legacy observations fallback code and deprecated helpers that were maintained for backward compatibility during the Smart Rules migration. The Smart Rules system is now authoritative for attribute derivation.

---

## Timeline

| Milestone | Date | Status |
|-----------|------|--------|
| Smart Rules Phase Complete (S6 merged) | 2026-01-02 | ✅ |
| Observation Window Start | 2026-01-02 | ✅ |
| Observation Window End | 2026-01-16 | ⏳ |
| Legacy Removal Execution | 2026-01-16+ | 📋 |
| Final Verification | TBD | ⬜ |

---

## Pre-Removal Checklist

Before executing the removal, verify:

- [ ] 14-day observation window has completed (2026-01-16)
- [ ] No production incidents related to Smart Rules during observation
- [ ] Telemetry shows Smart Rules functioning correctly
- [ ] No user-reported issues with attribute derivation
- [ ] Lisa has approved the removal

---

## Removal Checklist

### 1. Remove Dynamic Import Fallback

**File:** `packages/web/src/components/product/ObservationsPanel.tsx`

Remove the dynamic import fallback code that loads legacy observations service:

```typescript
// REMOVE: Dynamic import fallback
const observationsModule = await import('../../services/observations');
```

Replace with direct Smart Rules integration.

### 2. Deprecate Legacy Helpers

**File:** `packages/web/src/services/observations.ts`

Options:
- **Option A (Recommended):** Delete the file entirely if no other code depends on it
- **Option B:** Replace with non-throwing compatibility shim that logs deprecation warnings

```typescript
// If Option B chosen:
export function legacyGetObservations() {
  console.warn('DEPRECATED: legacyGetObservations is deprecated. Use Smart Rules API.');
  return [];
}
```

### 3. Update Documentation

Update the following docs to state Smart Rules are authoritative:

- [ ] `README.md` — Update architecture section
- [ ] `AI_BOOTSTRAP.md` — Update data flow description
- [ ] `CONTRIBUTING.md` — Update development guidelines

### 4. Run Full Test Suite

```bash
pnpm test
pnpm --filter @ropi/web test
pnpm --filter @ropi/api test
pnpm --filter @ropi/sdk test
```

All tests must pass before merge.

### 5. Run Smoke Tests on Staging

Re-run S6 smoke tests A-E:

```bash
node smoke-tests/s6-smoke-test.mjs
```

Verify all 5 tests pass.

### 6. Attach Telemetry Report

Before merging, attach a telemetry report showing:

- Number of Smart Rules evaluations during observation window
- Number of successful attribute derivations
- Any errors or failures logged
- Performance metrics (latency, throughput)

---

## Files to Modify/Delete

| File | Action | Notes |
|------|--------|-------|
| `packages/web/src/components/product/ObservationsPanel.tsx` | Modify | Remove dynamic import fallback |
| `packages/web/src/services/observations.ts` | Delete/Deprecate | Legacy service |
| `packages/web/src/pages/ObservationsPage.tsx` | Modify | Remove fallback references |
| `README.md` | Modify | Update architecture |
| `AI_BOOTSTRAP.md` | Modify | Update data flow |

---

## Rollback Plan

If issues are discovered after removal:

1. Revert the removal commit
2. Re-deploy previous build
3. Investigate root cause
4. Create fix PR
5. Re-attempt removal after fix verified

---

## Verification

After removal, verify:

- [ ] Web build passes
- [ ] API build passes
- [ ] All tests pass (679+ tests)
- [ ] Staging smoke tests A-E pass
- [ ] No console errors in browser
- [ ] Smart Rules Admin UI functions correctly
- [ ] Product editor shows provenance correctly
- [ ] Import pipeline applies rules correctly
- [ ] Export generates correct output

---

## Sign-off Requirements

This PR requires:

1. **14-day observation window** completed without incidents
2. **Telemetry report** attached showing healthy operation
3. **Lisa approval** before merge

---

## Notes

- Do NOT merge this PR before 2026-01-16
- Do NOT merge without Lisa's explicit approval
- Keep this branch updated with `aoss-main` during observation window

---

**Created by:** Homer (Automated Agent)  
**Date:** 2026-01-02  
**Related:** Smart Rules Phase v1.0.0
