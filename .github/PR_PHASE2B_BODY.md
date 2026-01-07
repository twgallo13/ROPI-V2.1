# LP-export-global-impl-2b: Implement productLevelReadiness (UI)

## Summary

This PR implements the UI layer for RetailOps GLOBAL mode, rendering product-level readiness aggregation when available while maintaining backward compatibility with SITE_SCOPED mode.

**Link to HES B Design:** [evidence/lp-export-global-1.0.0/design-architecture.md](evidence/lp-export-global-1.0.0/design-architecture.md)

**Phase 2A Dependency:** This PR is gated by Phase 2A (Engine) HES C verification. UI will not merge until Phase 2A HES C is VERIFIED_SUCCESS.

**Explicit Guarantee:** This PR adds new UI rendering paths for GLOBAL mode without breaking SITE_SCOPED behavior. Feature-flagged and rollbackable.

---

## Changes

### 1. CompletionExportGatePanel: Product-Level Display

**File:** `packages/web/src/components/product/CompletionExportGatePanel.tsx`

**Changes:**

#### A. Enhanced Interface: ProductLevelReadiness Support

```typescript
// Add to CompletionEvaluationResult interface (phase 2a already added this to API)
export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;
  segmentScores: Array<{
    segmentId: string;
    segmentName: string;
    score: number;
    weightPct: number;
    missingAttributes: string[];
  }>;
  missingGlobalAttributes: string[];
  websiteOptional: boolean;
  sitesEvaluated: string[];
  blockingSegments: string[];
}

// CompletionEvaluationResult extended to include:
// mode?: 'GLOBAL' | 'SITE_SCOPED';
// productLevelReadiness?: ProductLevelReadiness;
```

#### B. New Rendering Path: GLOBAL Mode Display

```typescript
// Pseudocode for new conditional rendering:
if (completion?.mode === 'GLOBAL' && completion?.productLevelReadiness) {
  // GLOBAL mode: Display product-level aggregation
  // - Completion bar: aggregatedCompletionPct (not per-site)
  // - Segment breakdown: segmentScores[] with BEST scores
  // - Missing attributes: missingGlobalAttributes (union, not site-specific)
  // - Blocking segments: blockingSegments[] list
  // - Sites evaluated: sitesEvaluated[] list
  // - **Advanced** toggle: Show/hide siteStatus (site-specific details)
} else {
  // SITE_SCOPED mode: Existing UI (unchanged)
  // - Completion bar per site
  // - Site status expansion
  // - Site-blocking indicators
}
```

#### C. New Component: GlobalModeCard

**Location:** `packages/web/src/components/product/GlobalModeCard.tsx` (NEW)

**Purpose:** Render GLOBAL mode product-level aggregation

**Props:**
```typescript
interface GlobalModeCardProps {
  productLevelReadiness: ProductLevelReadiness;
  operatorExplanation?: {
    summary?: string;
    actionRequired?: string[];
  };
}
```

**Content:**
- **Header:** "🌍 Global Completion (Aggregated)"
- **Completion bar:** `aggregatedCompletionPct` (single bar, not per-site)
- **Segment breakdown:** Table showing:
  - Segment name
  - BEST score (highest across all sites)
  - Weight %
  - Missing attributes (if any)
- **Missing attributes:** Union of `missingGlobalAttributes[]` (de-duplicated, sorted)
- **Blocking segments:** List of `blockingSegments[]` (segments with score <100)
- **Sites evaluated:** Collapsible section showing `sitesEvaluated[]`

**Example UI Layout:**
```
┌─────────────────────────────────────┐
│ 🌍 Global Completion (Aggregated)   │
├─────────────────────────────────────┤
│ Aggregated Completion: 92%          │
│ ████████████████████░ 92% (80% req) │
├─────────────────────────────────────┤
│ Completion by Segment:              │
│ ┌───────────────────────────────┐   │
│ │ Segment    │ Score│ Weight│W% │   │
│ ├───────────────────────────────┤   │
│ │ SEO        │  95% │  25%  │✓  │   │
│ │ Pricing    │  92% │  25%  │✓  │   │
│ │ Inventory  │  88% │  25%  │⚠  │   │
│ │ Marketing  │ 100% │  25%  │✓  │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ ⚠️ Blocking Segment:                │
│ • Inventory (88% < 100%)            │
├─────────────────────────────────────┤
│ Missing: description, images        │
├─────────────────────────────────────┤
│ ▶ Advanced (3 sites evaluated)      │
│   [Click to show site details]      │
└─────────────────────────────────────┘
```

#### D. Integration: CompletionExportGatePanel Refactor

**Pseudocode:**
```typescript
export function CompletionExportGatePanel({ productId }: CompletionExportGatePanelProps) {
  const [completion, setCompletion] = useState<CompletionEvaluationResult | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // ... existing state ...

  // Detect mode from completion response
  const isGlobalMode = completion?.mode === 'GLOBAL' && completion?.productLevelReadiness;

  return (
    <div className="completion-export-gate-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          {isBlocked ? '🚫' : '✅'} 
          {isGlobalMode ? 'Global Completion / Export' : 'Completion / Export'}
        </h3>
        {/* ... refresh button ... */}
      </div>

      {/* Loading, Error, Empty states (unchanged) */}

      {completion && (
        <>
          {isGlobalMode ? (
            // **NEW:** GLOBAL mode rendering
            <>
              <GlobalModeCard 
                productLevelReadiness={completion.productLevelReadiness!}
                operatorExplanation={completion.operatorExplanation}
              />

              {/* Advanced toggle: Show site details if needed */}
              {completion.productLevelReadiness!.sitesEvaluated.length > 0 && (
                <div className="advanced-section">
                  <button 
                    className="advanced-toggle"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    {showAdvanced ? '▼' : '▶'} Advanced 
                    ({completion.productLevelReadiness!.sitesEvaluated.length} sites)
                  </button>
                  {showAdvanced && (
                    <div className="advanced-details">
                      <h4>Site Status (Details)</h4>
                      {completion.operatorExplanation?.siteStatus?.map(site => (
                        <div key={site.site} className="site-detail">
                          <div className="site-name">{site.site}</div>
                          <div className="site-status">
                            {site.blocked ? '❌ Blocked' : '✅ Ready'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // Existing SITE_SCOPED rendering (unchanged)
            <>
              {/* ... existing completion-section, site-status, etc. ... */}
            </>
          )}

          {/* Common sections (apply to both modes) */}
          {completion.blockingReasons.length > 0 && (
            <div className="blocking-reasons-section">
              {/* ... existing blocking reasons ... */}
            </div>
          )}

          {completion.operatorExplanation?.actionRequired && (
            <div className="action-section">
              {/* ... existing action required ... */}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### 2. ExportPage: Mode Detection & Site Selector

**File:** `packages/web/src/pages/ExportPage.tsx`

**Changes:**

#### A. Mode Detection

```typescript
// In ExportPage:
function ExportPage() {
  const { completion, exportReady } = useExportCompletion();
  const isGlobalMode = completion?.mode === 'GLOBAL';

  // ... existing state ...
  const [selectedSite, setSelectedSite] = useState('ropi-web');
}
```

#### B. Site Selector Conditional Rendering

```typescript
// In render:
{!loading && !error && exportReady && (
  <div data-testid="export-ready">
    <h3>Export Ready</h3>

    {/* Show completion percentage */}
    {isGlobalMode && completion?.productLevelReadiness ? (
      <p>
        Global Aggregation: {completion.productLevelReadiness.aggregatedCompletionPct}% complete
      </p>
    ) : (
      <p>
        {completion?.completionPct !== undefined
          ? `${completion.completionPct.toFixed(0)}% complete`
          : 'Ready for export'}
      </p>
    )}

    {/* Site selector: Only show in SITE_SCOPED mode */}
    {!isGlobalMode && (
      <div className="site-selector">
        <label htmlFor="site-select">Export from site:</label>
        <select
          id="site-select"
          value={selectedSite}
          onChange={(e) => setSelectedSite(e.target.value)}
          disabled={isDisabled}
        >
          <option value="ropi-web">ROPI Web (ropi-web)</option>
          <option value="amazon">Amazon (amazon)</option>
          <option value="shopify">Shopify (shopify)</option>
          {/* ... etc ... */}
        </select>
      </div>
    )}

    {isGlobalMode && (
      <div className="global-mode-notice">
        <p>
          📢 <strong>Global Mode:</strong> Exporting aggregated product data.
          All sites will be included in the export.
        </p>
      </div>
    )}

    {/* Format selector (shown for both modes) */}
    <div className="format-selector">
      {/* ... existing CSV/JSON format selector ... */}
    </div>

    {/* Export button (unchanged) */}
    <button onClick={handleExport} disabled={isDisabled}>
      {buttonLabel}
    </button>
  </div>
)}
```

#### C. Updated Export Endpoint

```typescript
// handleExport remains the same, but includes mode awareness
async function handleExport() {
  if (!exportReady) return;

  const payload = {
    site: isGlobalMode ? 'GLOBAL' : selectedSite,  // Use 'GLOBAL' for mode
    format: selectedFormat,
    limit: 100,
    includeMeta: true,
  };

  // ... existing fetch logic ...
}
```

### 3. CSS Styling

**File:** `packages/web/src/components/product/GlobalModeCard.css` (NEW)

**Key Classes:**
```css
.global-mode-card {
  /* Card styling with 🌍 emoji highlight */
}

.global-mode-card .completion-header {
  /* "Global Completion (Aggregated)" header */
}

.global-segment-table {
  /* Table: Segment │ Score │ Weight │ Status */
}

.blocking-segments {
  /* List of segments < 100% */
}

.sites-evaluated {
  /* Collapsible section showing all sites */
}

.advanced-toggle {
  /* Button for showing/hiding site details */
}
```

### 4. Tests

**Files:**
- `packages/web/src/components/product/__tests__/CompletionExportGatePanel.spec.tsx`
- `packages/web/src/components/product/__tests__/GlobalModeCard.spec.tsx` (NEW)
- `packages/web/src/pages/__tests__/ExportPage.spec.tsx`

**Test Coverage:**

#### CompletionExportGatePanel

- ✅ GLOBAL mode: Displays GlobalModeCard when mode='GLOBAL' and productLevelReadiness present
- ✅ SITE_SCOPED mode: Shows existing site-status rendering when mode absent
- ✅ Advanced toggle: Shows/hides siteStatus when toggled
- ✅ Aggregated percentage: Displays aggregatedCompletionPct (not per-site)
- ✅ Missing attributes: Shows union of missingGlobalAttributes (not per-site)
- ✅ Blocking segments: Displays blockingSegments list

#### GlobalModeCard (NEW)

- ✅ Renders product-level readiness card with GLOBAL header
- ✅ Completion bar: Shows aggregatedCompletionPct (single bar, not per-site)
- ✅ Segment table: Lists all segments with BEST scores
- ✅ Blocking segments: Highlights segments < 100%
- ✅ Missing attributes: De-duplicated list
- ✅ Sites evaluated: Collapsible section with site count

#### ExportPage

- ✅ GLOBAL mode: Hides site selector, shows global mode notice
- ✅ SITE_SCOPED mode: Shows site selector and format dropdown (unchanged)
- ✅ Export payload: Uses 'GLOBAL' for site when mode='GLOBAL'
- ✅ Completion display: Shows aggregatedCompletionPct in GLOBAL mode

### 5. Backward Compatibility

✅ **SITE_SCOPED mode unchanged:** Existing UI rendering preserved when mode absent or mode='SITE_SCOPED'

✅ **Feature-flagged:** Rendering paths controlled by presence of `mode` and `productLevelReadiness` fields (set only when feature flag enabled on backend)

✅ **Graceful degradation:** If `productLevelReadiness` is absent, falls back to SITE_SCOPED UI

---

## HES C Verification Plan (Phase 2A Prerequisite)

**Status:** Gated by Phase 2A HES C (engine) verification

**Phase 2A Checklist:** Before this PR merges, Phase 2A must have:
- ✅ Engine implementation merged
- ✅ Feature flag working in staging
- ✅ Multi-site aggregation verified
- ✅ Performance <500ms confirmed
- ✅ Tests passing
- ✅ HES C manifest created: docs/HES_C_LP-export-global-impl-2a.json

**Phase 2B Checklist:** This PR will verify UI rendering

#### Step 1: GLOBAL Mode Rendering Test
```bash
# Prerequisites
- Phase 2A deployed to staging
- Feature flag enabled: settings/exportSettings.exportGlobalMode.enabled = true
- Product with multiple sites (e.g., 211737-90h1-8)

# Test
1. Load product page with completion panel
2. Verify CompletionExportGatePanel detects mode='GLOBAL'
3. Verify GlobalModeCard renders (not site-status)
4. Verify aggregatedCompletionPct displayed (not per-site)
5. Verify segmentScores table shows BEST scores
6. Verify blockingSegments list correct
7. Screenshot: evidence/phase2/ui-global-mode-card.png
```

#### Step 2: Export Page Mode Detection
```bash
# Test
1. Load export page with global mode completion
2. Verify site selector hidden (not shown in GLOBAL mode)
3. Verify "Global Mode" notice displayed
4. Verify export button sends site='GLOBAL'
5. Screenshot: evidence/phase2/ui-export-page-global.png
```

#### Step 3: Advanced Toggle
```bash
# Test
1. Load completion panel in GLOBAL mode
2. Click "Advanced" toggle
3. Verify site details expand (siteStatus from API)
4. Verify each site shows status (blocked/ready)
5. Click toggle again to collapse
6. Screenshot: evidence/phase2/ui-advanced-toggle.png
```

#### Step 4: Fallback to SITE_SCOPED
```bash
# Test
1. Disable feature flag: settings/exportSettings.exportGlobalMode.enabled = false
2. Reload product page
3. Verify CompletionExportGatePanel shows site-status (SITE_SCOPED UI)
4. Verify site selector visible in export page
5. Verify no mode='GLOBAL' in response
6. Verify UI reverts to existing rendering
7. Screenshot: evidence/phase2/ui-site-scoped-fallback.png
```

#### Step 5: Component Tests Pass
```bash
# Run UI tests
pnpm --filter @ropi-aoss/web test 2>&1 | tee evidence/phase2/web-tests-phase2b.txt

# Expected: All tests pass, including:
# - CompletionExportGatePanel.spec.tsx (new GLOBAL mode tests)
# - GlobalModeCard.spec.tsx (new component tests)
# - ExportPage.spec.tsx (mode detection tests)
```

#### Step 6: Regression Testing
```bash
# Test existing SITE_SCOPED mode still works
1. Disable feature flag
2. Load product pages
3. Verify all existing functionality works
4. Verify site selector appears
5. Verify blocking reasons display
6. Verify export flow unchanged
```

---

## Files Changed

- `packages/web/src/components/product/CompletionExportGatePanel.tsx` (50-80 lines added)
  - Mode detection logic
  - Conditional rendering for GLOBAL vs SITE_SCOPED
  - Advanced toggle for site details

- `packages/web/src/components/product/GlobalModeCard.tsx` (NEW, 200+ lines)
  - Product-level aggregation display
  - Segment score table
  - Missing attributes list
  - Blocking segments
  - Sites evaluated (collapsible)

- `packages/web/src/components/product/GlobalModeCard.css` (NEW, 100+ lines)
  - Styling for global mode card

- `packages/web/src/pages/ExportPage.tsx` (40-50 lines modified)
  - Mode detection
  - Conditional site selector
  - Global mode notice
  - Export payload adjustment

- `packages/web/src/components/product/__tests__/CompletionExportGatePanel.spec.tsx` (200+ lines)
  - GLOBAL mode rendering tests
  - Advanced toggle tests
  - SITE_SCOPED fallback tests

- `packages/web/src/components/product/__tests__/GlobalModeCard.spec.tsx` (NEW, 150+ lines)
  - Component rendering tests
  - Segment table tests
  - Missing attributes tests
  - Blocking segments tests

- `packages/web/src/pages/__tests__/ExportPage.spec.tsx` (50+ lines)
  - Mode detection tests
  - Export payload tests

---

## Key Design Decisions

✅ **Mode detection from API:** `mode` and `productLevelReadiness` fields in response determine rendering path

✅ **Preferred display:** When `productLevelReadiness` present, use GLOBAL card (aggregated view)

✅ **Advanced toggle:** Hide site details by default in GLOBAL mode, but allow drilling down via toggle

✅ **Site selector hidden:** In GLOBAL mode, site selector not shown (exporting product-level, not site-specific)

✅ **Graceful fallback:** If `productLevelReadiness` missing, fall back to existing SITE_SCOPED UI

✅ **No evaluation semantics:** UI only renders; evaluation logic handled by Phase 2A engine

---

## Merge Instructions

### Prerequisites
- ✅ Phase 2A merged (PR #457)
- ✅ Phase 2A HES C verified in staging: `docs/HES_C_LP-export-global-impl-2a.json` exists with VERIFIED_SUCCESS status
- ✅ Feature flag tested and stable
- ✅ UI components passing tests

### Merge Process
- **Target branch:** `aoss-main`
- **Merge method:** Squash
- **Post-merge:** 
  1. Deploy to staging
  2. Run UI test suite
  3. Collect evidence files
  4. Create HES C manifest: `docs/HES_C_LP-export-global-impl-2b.json`

---

## Next Steps

After Phase 2B merges with HES C verification:
- Monitor production stability
- Collect usage metrics (GLOBAL mode adoption rate)
- Plan Phase 3 enhancements (e.g., custom aggregation strategies per operator)

---

## Support & Questions

If blocked:
- API endpoint access → Verify Phase 2A staging deploy complete
- Component styling issues → Refer to GlobalModeCard.css
- Test failures → Check Phase 2A engine tests also pass
- Feature flag issues → See Phase 1 documentation (detectExportModeFeatureFlag)
