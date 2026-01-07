# LP-export-global-impl-2b PR Description

## Purpose
Implement the UI for RetailOps GLOBAL mode export so the Export Manager renders product-level readiness by default for RetailOps, preserve backward compatibility for SITE_SCOPED tenants, and deliver HES C staging verification results.

## Changes Included

### 1. GlobalModeCard Component (NEW)
**File:** `packages/web/src/components/export/GlobalModeCard.tsx`

A new component that renders product-level aggregated completion data for GLOBAL mode exports:
- **Aggregated Completion Bar**: Shows global completion percentage against threshold
- **Segment Breakdown Table**: Lists each segment with BEST score (across all sites), weight, and missing attributes
- **Missing Global Attributes**: Visual list of attributes blocking export
- **Blocking Segments**: Highlighted list of segments preventing export
- **Sites Evaluated (Collapsible)**: Shows which sites were evaluated in the aggregation

**Features:**
- Responsive design (mobile-friendly)
- Dark mode support
- Accessibility: ARIA labels, keyboard navigation, focus management
- Graceful degradation when `productLevelReadiness` is absent

**Styling:** `packages/web/src/components/export/GlobalModeCard.css`

### 2. CompletionExportGatePanel Updates
**File:** `packages/web/src/components/product/CompletionExportGatePanel.tsx`

Enhanced to support both GLOBAL and SITE_SCOPED modes:

**GLOBAL Mode (when `completion.mode === "GLOBAL"` and `productLevelReadiness` present):**
- Replaces standard completion gauge with GlobalModeCard
- Adds **Advanced Toggle** button: "Advanced: Site-Level Details"
- When expanded, shows per-site status (moved from main view)
- Maintains summary, blocking reasons, and completion breakdown sections

**SITE_SCOPED Mode (when `completion.mode === "SITE_SCOPED"` or mode absent):**
- Preserves original UI: completion gauge + site accordion in main view
- No Advanced toggle visible
- Maintains full backward compatibility

**Updated Interfaces:**
- Added `mode?: 'GLOBAL' | 'SITE_SCOPED'` to `CompletionEvaluationResult`
- Added `productLevelReadiness?: ProductLevelReadiness` to support new fields

**Advanced Toggle Styling:** Added to `CompletionExportGatePanel.css`

### 3. ExportPage Updates
**File:** `packages/web/src/pages/ExportPage.tsx`

Updated to handle both export modes:

**GLOBAL Mode Behavior:**
- Hides site dropdown selector
- Shows "🌍 Global Export Mode" badge with "Product-level evaluation" help text
- Sends `site: 'GLOBAL'` in export payload

**SITE_SCOPED Mode Behavior (unchanged):**
- Shows site dropdown selector
- Sends selected site in export payload
- No GLOBAL badge visible

**Implementation Details:**
- Detects mode from completion data: `completion?.mode ?? 'SITE_SCOPED'`
- Conditional rendering for site selector
- Dynamic site value in export request

### 4. Hook Updates
**File:** `packages/web/src/hooks/useExportCompletion.ts`

Added `mode` field to `CompletionEvaluationResult` interface to support mode detection at the catalog level.

### 5. Tests Added

#### Unit Tests
- **GlobalModeCard.test.tsx** (10 test cases)
  - Component rendering
  - Segment table display
  - Missing attributes list
  - Sites evaluated collapsible section
  - Status badge (blocked vs. ready)
  - Accessibility attributes

- **CompletionExportGatePanel.global.test.tsx** (11 test cases)
  - GLOBAL vs. SITE_SCOPED mode detection
  - GlobalModeCard rendering in GLOBAL mode
  - Advanced toggle visibility and behavior
  - Site accordion visibility (hidden in GLOBAL, shown in SITE_SCOPED)
  - Null productLevelReadiness handling
  - Mode defaulting to SITE_SCOPED

#### E2E Tests (VVP)
- **global-export-mode.spec.ts** (10 test cases)
  - Test 1: API response structure validation
  - Test 2: Site dropdown visibility in GLOBAL mode
  - Test 3: Export payload site parameter
  - Test 4: SITE_SCOPED regression (site dropdown visible)
  - Test 5: Advanced toggle expand/collapse
  - Test 6: GlobalModeCard rendering
  - Test 7: Completion percentage accuracy
  - Test 8: Missing attributes display
  - Test 9: Sites evaluated collapsibility
  - Test 10: Backward compatibility

## Feature Flag Dependency

All GLOBAL mode behavior depends on:
- **Firestore setting**: `settings/exportSettings.exportGlobalMode` flag set to `true`
- When flag is `false` or `productLevelReadiness` absent, UI gracefully falls back to SITE_SCOPED rendering

## Backward Compatibility

- ✅ Existing SITE_SCOPED logic unchanged
- ✅ No database schema changes
- ✅ No API contract changes (additive only: new optional `mode` and `productLevelReadiness` fields)
- ✅ Graceful degradation when GLOBAL mode fields absent
- ✅ Build passes with no TypeScript errors

## Testing Status

- ✅ Build: Successful (`vite build` completed)
- ⏳ Unit Tests: Ready to run
- ⏳ E2E Tests: Ready to run on staging

## Preconditions Met

- ✅ Phase 2A HES C is VERIFIED_SUCCESS
- ✅ PR ready for review
- ✅ Current branch: `fix/export-global-ui-phase2-2026-01-07`
- ✅ Target branch: `aoss-main`

## PR Labels (to be applied)

- `state:in-progress`
- `lp:LP-export-global-impl-2b`
- `type:feature`
- `priority:P0`
- `cleanup:required`

## Next Steps (HES C Execution)

After merge and staging deploy:
1. Run unit/component tests
2. Run E2E VVP against staging
3. Capture UI screenshots (GLOBAL and SITE_SCOPED modes, Advanced toggle)
4. Verify export payloads via Network tab
5. Create HES C manifest with evidence mapping
6. Return HES C artifacts to Lisa for acceptance

## Notes

- Logging: No persistent verbose logs in production; staging logs gated by `EXPORT_GLOBAL_LOGS` env var
- No backend changes in this PR (Phase 2A backend already delivers `mode` and `productLevelReadiness`)
- Rollback plan: Disable Firestore `exportGlobalMode` flag to instantly revert UI behavior
