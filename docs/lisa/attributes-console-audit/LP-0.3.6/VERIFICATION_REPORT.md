# LP-0.3.6 Verification Report

**Task:** Deploy & Verify Mapping UI on Staging  
**Date:** 2025-12-19  
**Verdict:** ✅ **PASS** (with bug fix applied)

---

## Overview

LP-0.3.6 verifies that PR #291 (Mapping UI) is properly deployed and functional on the staging preview URL.

## Prerequisites Verification

| Check | Status | Notes |
|-------|--------|-------|
| PR #291 Open | ✅ | State: OPEN, Mergeable: MERGEABLE |
| Preview Deployed | ✅ | https://ropi-aoss-staging--pr-291-4wf3bj6d.web.app |
| Front-end Wiring | ✅ | MappingTab component properly imported and rendered |

---

## Bug Discovery & Fix

### Issue Discovered
During API testing, the PUT synonym endpoint returned HTTP 500 with:
```
INTERNAL_ERROR: An unexpected error occurred
```

### Root Cause
Cloud function logs revealed:
```
Unexpected mapping error: Error: Value for argument "data" is not a valid Firestore document. 
Cannot use "undefined" as a Firestore value (found in field "sources").
```

The `updateAttributeMapping` function in `mappingService.ts` was writing `undefined` values to Firestore when:
1. Creating new attribute-level mappings (no existing `beforeState`)
2. Using `merge=false` mode

### Fix Applied
**File:** `packages/api/src/services/mappingService.ts` (lines 515-532)

**Before:**
```typescript
} else {
  afterState = {
    aliases: mapping.aliases,
    value_synonyms: mapping.value_synonyms,
    sources: beforeState?.sources,
    updatedAt: now,
    updatedBy: actor,
  };
}
```

**After:**
```typescript
} else {
  // FIX: Ensure no undefined values are written to Firestore
  afterState = {
    aliases: mapping.aliases ?? beforeState?.aliases ?? {},
    value_synonyms: mapping.value_synonyms ?? beforeState?.value_synonyms ?? {},
    sources: beforeState?.sources ?? {},
    updatedAt: now,
    updatedBy: actor,
  };
}
```

Also fixed the merge branch to use `|| {}` for sources.

**Deployment:** Functions redeployed successfully after fix.

---

## API Test Results (After Fix)

| Test | Endpoint | Method | Expected | Actual | Status |
|------|----------|--------|----------|--------|--------|
| 1 | `/api/admin/settings/mappings` | GET | 200 | 200 | ✅ PASS |
| 2 | `/api/admin/settings/attributes/primary_color/mapping` | GET | 200 | 200 | ✅ PASS |
| 3 | `/api/admin/settings/mappings?merge=true` | PUT | 200 | 200 | ✅ PASS |
| 4 | `/api/admin/settings/attributes/primary_color/mapping?merge=true` | PUT | 200 | 200 | ✅ PASS |
| 5 | `/api/admin/settings/mappings/import-preview` | POST | 200 | 200 | ✅ PASS |
| 6 | `/api/admin/settings/attributes` | GET | 200 | 200 | ✅ PASS |

**Test URL Base:** `https://ropi-aoss-staging--pr-291-4wf3bj6d.web.app/api`

---

## Audit Trail Verification

Cloud function logs confirm audit events are being created:

### Global Mapping Update
```
[AUDIT] {
  id: 'audit_...',
  action: 'mapping_update',
  before: { aliases: {...}, value_synonyms: {}, ... },
  after: { aliases: {...}, value_synonyms: {}, ... },
  reason: 'LP-0.3.6 verification test alias',
  context: { source: 'api', scope: 'global' }
}
```

### Attribute-Level Mapping Update (primary_color)
```
[AUDIT] {
  id: 'audit_1766179424274_ievdegp',
  attribute_id: 'primary_color',
  actor: 'zmAn8kKTE3ZW3fM386d8tiWW97U2',
  action: 'mapping_update',
  before: null,  // New mapping
  after: {
    aliases: {},
    value_synonyms: { Navy: ['navy blue', 'dark blue'] },
    sources: {},
    updatedAt: '2025-12-19T21:23:44.233Z',
    updatedBy: 'zmAn8kKTE3ZW3fM386d8tiWW97U2'
  },
  reason: 'LP-0.3.6 verification test synonym',
  context: { source: 'api', scope: 'attribute' }
}
```

---

## Front-End Wiring Confirmation

### AttributeDetailPanel.tsx
PR #291 correctly wires the MappingTab component:
```tsx
import MappingTab from './MappingTab';
// ...
case 'mapping':
  return <MappingTab attribute={attribute} attributes={attributes} />;
```

### MappingTab Components
PR #291 includes all required components:
- `MappingTab.tsx` (382 lines) - Main tab component
- `AliasTable.tsx` (536 lines) - Alias editor
- `SynonymsEditor.tsx` (378 lines) - Synonym management  
- `PerSourceOverrides.tsx` (254 lines) - Per-source configuration
- `ImportPreviewEditor.tsx` (361 lines) - CSV preview
- `BulkAliasImportModal.tsx` (316 lines) - Bulk import modal
- `useMappings.ts` (424 lines) - API hook

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| PR Status | ✅ | PR #291 Open, mergeable |
| Preview Deployed | ✅ | Firebase preview channel active |
| API Endpoints | ✅ | 6/6 tests pass (after bug fix) |
| Audit Logging | ✅ | Events logged with before/after state |
| Bug Fix | ✅ | Fixed undefined Firestore value issue |
| Front-End Wiring | ✅ | MappingTab properly connected |

**Overall Verdict:** ✅ **PASS**

---

## Artifacts

- `api-tests.log` - Full API test output
- `*.json` - API response samples
- `run-api-tests.sh` - Reproducible test script

---

## Recommendations

1. **Merge PR #294 first** - Contains the mapping API fix (500 error)
2. **Then merge PR #291** - Contains the Mapping UI
3. **Consider adding unit tests** - For the `updateAttributeMapping` function edge cases
