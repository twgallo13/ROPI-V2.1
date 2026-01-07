# HES A Executive Summary - LP-export-ui-attr-triage-1.0.0
**LP:** LP-export-ui-attr-triage-1.0.0  
**Type:** Diagnostic (HES A)  
**Executor:** Homer  
**Date:** 2026-01-07T07:58:00Z  
**Status:** COMPLETE - Root causes identified  

---

## What I Observed

### Issue 1: Legacy UI Panel Shows Instead of GLOBAL Mode

**Observation:** Export UI displays per-site site selection dropdown and legacy CompletionExportGatePanel instead of GlobalModeCard (product-level GLOBAL mode UI).

**Root Cause:** Feature flag `settings/exportSettings.exportGlobalMode.enabled` is **false** (disabled).

**Exact Mechanism:**
1. Frontend calls `/api/products/:id/completion`
2. Backend function `detectExportModeFeatureFlag()` reads Firestore flag
3. Flag check: `exportGlobalMode.enabled === true` → returns `'GLOBAL'` if true, `'SITE_SCOPED'` if false
4. Current state: `enabled: false` → Backend returns response **without `mode` field**
5. Frontend defaults: `completion?.mode ?? 'SITE_SCOPED'`
6. UI renders: Legacy panel + site selector (SITE_SCOPED path)

**Code Citations:**
- Backend flag detection: `packages/api/src/services/completionDrivenExportReadiness.ts:705-736`
- Backend mode integration: `packages/api/src/services/completionDrivenExportReadiness.ts:476-520`
- Frontend mode detection: `packages/web/src/pages/ExportPage.tsx:28-29`
- Frontend UI decision: `packages/web/src/components/product/CompletionExportGatePanel.tsx:165-192`

**Status:** ✅ **NOT A BUG** - This is expected governance behavior. Flag must be explicitly enabled to activate GLOBAL mode UI.

---

### Issue 2: Classification Attributes Not Enforcing Completion

**Observation:** Classification attributes (category/ID 7, class/ID 8, department/ID 9) are marked `required_for_completion: true` in registry but products show as complete even when these attributes are missing.

**Root Cause:** **CRITICAL BUG** - String literal mismatch between Firestore config and code.

**Exact Mechanism:**
1. Firestore completion rules specify: `"requirementFlag": "required_for_completion"` (snake_case)
2. Code checks: `if (selector.requirementFlag === 'completionRequired')` (camelCase)
3. Strings NEVER match → requirement flag filter NEVER executes
4. Result: ALL attributes in specified categories selected, not just required ones
5. Classification attributes included in evaluation but `required_for_completion: true` flag ignored

**Code Citations:**
- Bug location: `packages/api/src/services/completionEvaluationEngine.ts:359-361`
- Attribute resolution logic: `packages/api/src/services/completionEvaluationEngine.ts:336-372`
- Firestore config: `settings/exportSettings.completionRules.segments[0].attributeSelector.requirementFlag = "required_for_completion"`
- Registry attributes: `packages/sdk/config/attributeRegistry.json` (IDs 7, 8, 9 have `required_for_completion: true`)

**Status:** 🔴 **CONFIRMED BUG** - Requirement flag check non-functional due to string mismatch.

**Impact:** HIGH - Core completion logic not enforcing required attributes properly.

---

### Issue 3: Attribute Persistence Bug (Classification Changes Don't Save)

**Status:** ⏳ **REQUIRES STAGING ACCESS** - Cannot reproduce without deployed UI.

**Hypothesis:** May be related to Issue 2 (requirementFlag bug). If classification attributes aren't being enforced as required, frontend validation may allow null/empty values or skip save operations.

**Next Investigation:** Requires staging deployment to capture DevTools network traces of save operations.

---

## File/Line Citations Where UI Rendering Decisions Exist

### Frontend UI Decision Logic

| Component | File | Lines | Decision |
|-----------|------|-------|----------|
| Mode Detection | `packages/web/src/pages/ExportPage.tsx` | 28-29 | `exportMode = completion?.mode ?? 'SITE_SCOPED'` |
| Site Selector Visibility | `packages/web/src/pages/ExportPage.tsx` | 204-229 | Hidden if `exportMode === 'GLOBAL'` |
| GLOBAL Badge | `packages/web/src/pages/ExportPage.tsx` | 181-195 | Shown if `exportMode === 'GLOBAL'` |
| Panel Rendering | `packages/web/src/components/product/CompletionExportGatePanel.tsx` | 165-192 | GlobalModeCard if `mode === 'GLOBAL'`, else legacy panel |
| Advanced Toggle | `packages/web/src/components/product/CompletionExportGatePanel.tsx` | 238-285 | Only in GLOBAL mode |

### Backend Mode Logic

| Component | File | Lines | Decision |
|-----------|------|-------|----------|
| Flag Detection | `packages/api/src/services/completionDrivenExportReadiness.ts` | 705-736 | Reads Firestore, returns 'GLOBAL' or 'SITE_SCOPED' |
| Mode Integration | `packages/api/src/services/completionDrivenExportReadiness.ts` | 476 | Calls detectExportModeFeatureFlag() |
| GLOBAL Response | `packages/api/src/services/completionDrivenExportReadiness.ts` | 481-520 | Adds `mode: 'GLOBAL'` + productLevelReadiness |
| SITE_SCOPED Response | `packages/api/src/services/completionDrivenExportReadiness.ts` | 540-605 | Returns without mode field (defaults) |

### Attribute Resolution Bug

| Component | File | Lines | Issue |
|-----------|------|-------|-------|
| Bug Line | `packages/api/src/services/completionEvaluationEngine.ts` | 359-361 | String mismatch: `'completionRequired'` vs `'required_for_completion'` |
| Attribute Selector | `packages/api/src/services/completionEvaluationEngine.ts` | 336-372 | resolveAttributes() function with broken requirement flag check |

---

## Immediate Next-Step Suggestions

### For Issue 1 (Legacy UI) - No Fix Needed
- **Action:** Document that feature flag must be enabled to activate GLOBAL mode
- **Who:** Lisa (phase owner) decides when to enable flag
- **When:** After staging deployment and Phase 2B HES C verification completes

### For Issue 2 (requirementFlag Bug) - Fix Required

**Option A: Fix Code (Recommended)**
- **File:** `packages/api/src/services/completionEvaluationEngine.ts`
- **Line:** 359
- **Change:** Use dynamic property access instead of hardcoded string

```typescript
// BEFORE
if (selector.requirementFlag === 'completionRequired' && !attr.required_for_completion) {
  continue;
}

// AFTER
if (selector.requirementFlag && !attr[selector.requirementFlag]) {
  continue;
}
```

**Impact:** Classification attributes (and ALL requirement flags) will be properly enforced

**Option B: Fix Config (Not Recommended)**
- Change Firestore `requirementFlag` values to `"completionRequired"`
- Requires registry schema change (breaking)

**Recommendation:** Create new LP to implement Option A fix, test with classification attributes.

### For Issue 3 (Attribute Persistence) - Requires Staging

- **Action:** Deploy to staging, capture DevTools network traces of attribute save operations
- **Who:** Homer (after staging deployment)
- **Evidence Needed:** Network request/response for save, console errors, frontend validation behavior

---

## Summary

**Root Cause of Legacy UI:** Feature flag disabled (expected governance behavior)  
**Root Cause of Classification Bug:** String literal mismatch in requirement flag check (code bug)  
**Attribute Persistence:** Requires staging access to diagnose  

**Critical Finding:** The requirementFlag bug affects ALL segments using requirement flags (core attributes, SEO attributes). This is a systemic issue in the completion evaluation engine that prevents proper enforcement of required attributes across the board.

---

**HES A Evidence Package:** Complete  
**All Evidence Files:** Located in `evidence/phase2/triage-ui-attr/`  
**Manifest:** `docs/HES_A_LP-export-ui-attr-triage-1.0.0.json` (to be created)  
**Diagnostic Complete:** 2026-01-07T07:58:00Z
