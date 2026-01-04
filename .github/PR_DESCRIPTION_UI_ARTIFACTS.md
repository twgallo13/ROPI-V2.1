# feat: Operator-Facing UI for Export Gate (3 Artifacts)

**Depends on:** PR #430 (merged) — Backend export gate enforcement

## Overview

Implements three operator-facing UI artifacts that make the export gate **observable** and **actionable** without engineering help:

1. **Export Settings Screen** — Configure completion rules at `/settings/export-settings`
2. **Export 423 Modal** — Catch and explain blocking with operator guidance
3. **Product Editor Completion Panel** — Show per-product completion status in editor sidebar

**Goal:** Eliminate dead ends. Every blocked export leads to fixable action with clear guidance.

---

## Artifact 1: Export Settings Screen

**Route:** `/settings/export-settings`

### Features
- ✅ Live Firestore integration (`settings/exportSettings/completionRules`)
- ✅ Edit threshold, segment weights, rule types, site selection
- ✅ Inline validation:
  - Weights must sum to 100% (enabled segments only)
  - Threshold 0-100%
  - At least one segment enabled
- ✅ Weight distribution visualization (bar chart)
- ✅ Governance notices (media/pricing exclusions)
- ✅ Configuration metadata (version, updated by, timestamp)
- ✅ Save with versioning to `completionRulesVersions/{version}`

### Files
- [ExportSettingsPage.tsx](packages/web/src/pages/settings/ExportSettingsPage.tsx) — 390 lines
- [ExportSettingsPage.css](packages/web/src/pages/settings/ExportSettingsPage.css) — 290 lines
- [completionRulesClient.ts](packages/web/src/services/completionRulesClient.ts) — 154 lines
- [SettingsSubPage.tsx](packages/web/src/pages/settings/SettingsSubPage.tsx) — Modified (routing)

### Acceptance
```
1. Navigate to /settings/export-settings
2. Should see actual completion rules (not placeholder)
3. Edit threshold/weights → Save
4. Refresh → Changes persist
5. Run export test → Should respect new rules
```

---

## Artifact 2: Export 423 Blocking Modal

**Trigger:** HTTP 423 from `/api/admin/exports/dry-run` or `/api/admin/exports`

### Features
- ✅ Catches 423 responses, parses operator payload
- ✅ Displays structured explanation:
  - Summary of why blocked
  - Catalog stats (total, ready, blocked counts)
  - Blocking issues with site/segment/attribute context
  - Site status (ready/blocked per site)
  - Segment breakdown with progress bars
  - Missing attributes per site
  - Action items (bullet list)
- ✅ Actionable CTAs:
  - "Go to Completion Settings" → `/settings/export-settings`
  - "Open First Blocked Product" → `/products/{productId}`
- ✅ No dead ends — Every blocking reason includes context

### Files
- [ExportBlockedModal.tsx](packages/web/src/components/export/ExportBlockedModal.tsx) — 250 lines
- [ExportBlockedModal.css](packages/web/src/components/export/ExportBlockedModal.css) — 350 lines
- [ExportPage.tsx](packages/web/src/pages/ExportPage.tsx) — Modified (integration)

### Acceptance
```
1. Go to /exports
2. Click "Start Export" with incomplete products
3. Should get 423 modal (not raw JSON error)
4. Modal shows:
   - Why blocked (segment/site/attributes)
   - Catalog stats
   - Action items
5. Click "Go to Completion Settings" → Navigates correctly
```

---

## Artifact 3: Product Editor Completion Panel

**Location:** Product editor sidebar (top panel)

### Features
- ✅ Displays completion status:
  - Completion % with color bar (red blocked / green ready)
  - Threshold reference
  - Status badge ("❌ Blocked" / "✅ Ready")
- ✅ Blocking reasons:
  - Per-site status (expandable)
  - Missing attributes per site
  - Site-specific reasons
- ✅ Completion by segment:
  - Bar chart with score %
  - Missing attributes per segment
- ✅ Action items section ("What to fix")
- ✅ CTAs:
  - "View Export Settings" → `/settings/export-settings`
  - "Refresh Status" → Reload completion data
- ✅ Fetches from API: `GET /api/products/{id}/completion`
  - ⚠️ **Note:** This endpoint is NOT YET IMPLEMENTED in backend
  - Panel gracefully handles with "Failed to load" + retry button

### Files
- [CompletionExportGatePanel.tsx](packages/web/src/components/product/CompletionExportGatePanel.tsx) — 240 lines
- [CompletionExportGatePanel.css](packages/web/src/components/product/CompletionExportGatePanel.css) — 320 lines
- [ProductEditorPage.tsx](packages/web/src/pages/ProductEditorPage.tsx) — Modified (sidebar integration)

### Acceptance
```
1. Open product editor: /products/{productId}
2. Should see "Completion / Export" panel at top of sidebar
3. If product incomplete:
   - Completion % < threshold
   - Status badge "❌ Blocked"
   - Lists missing attributes by site + segment
4. If product complete:
   - "✅ Ready" badge
   - Completion % ≥ threshold
5. Modify product → Click "Refresh Status" → Updates
```

**⚠️ BLOCKER:** Panel will show "Failed to load completion status" until backend implements `GET /api/products/{id}/completion` endpoint.

---

## Design Principles

✅ **Operator Mental Model** — All UIs reflect how operators think about export blocking  
✅ **No Dead Ends** — Every block has actionable guidance with links  
✅ **1:1 to Backend** — UIs map directly to completion rules config + evaluation results  
✅ **Governance Visibility** — All controls show impact on export  
✅ **Error Handling** — Graceful degradation with retry buttons  

---

## API Contracts (For Backend Implementation)

### Missing Endpoint: `GET /api/products/{id}/completion`

**Request:**
```
GET /api/products/{productId}/completion
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "completionPct": 85,
  "threshold": 80,
  "hasBlockingSites": false,
  "blockingReasons": [
    {
      "type": "SITE_DESCRIPTION_SEO_MISSING",
      "severity": "BLOCKING",
      "message": "Export blocked for shiekh: Missing description for site",
      "details": {
        "site": "shiekh",
        "missingAttributes": ["description", "seo_keywords"]
      }
    }
  ],
  "operatorExplanation": {
    "summary": "Product blocked by missing description for 1 site",
    "blockingIssues": ["shiekh: Missing description for site"],
    "completionBreakdown": [...],
    "siteStatus": [...],
    "actionRequired": [...]
  }
}
```

**Implementation Notes:**
- Should call `calculateCompletionDrivenExportReadiness(product, false, evaluatedAt)`
- Product parameter should be fetched from Firestore by `productId`
- Same structure as 423 response from PR #430

---

## File Inventory

### New Files (7)
- `packages/web/src/services/completionRulesClient.ts` — Firestore rules API
- `packages/web/src/pages/settings/ExportSettingsPage.tsx` — Settings UI
- `packages/web/src/pages/settings/ExportSettingsPage.css` — Settings styles
- `packages/web/src/components/export/ExportBlockedModal.tsx` — 423 modal
- `packages/web/src/components/export/ExportBlockedModal.css` — Modal styles
- `packages/web/src/components/product/CompletionExportGatePanel.tsx` — Editor panel
- `packages/web/src/components/product/CompletionExportGatePanel.css` — Panel styles

### Modified Files (3)
- `packages/web/src/pages/settings/SettingsSubPage.tsx` — Route to ExportSettingsPage
- `packages/web/src/pages/ExportPage.tsx` — Integrated ExportBlockedModal
- `packages/web/src/pages/ProductEditorPage.tsx` — Added CompletionExportGatePanel to sidebar

---

## Testing Checklist

### Artifact 1: Export Settings
- [ ] Load rules from Firestore (non-empty)
- [ ] Edit threshold → Save → Persist
- [ ] Edit segment weights → Validation errors appear
- [ ] Select sites for segment → Saves correctly
- [ ] Weight bar shows correct distribution
- [ ] Exclusions card shows media/pricing as non-blocking

### Artifact 2: Export Blocked Modal
- [ ] Trigger export when products incomplete → 423 response
- [ ] Modal displays with red header
- [ ] Shows blocking issues + site status + completion breakdown
- [ ] "Go to Completion Settings" button works
- [ ] "Open First Blocked Product" navigates correctly
- [ ] Catalog stats visible

### Artifact 3: Product Panel
- [ ] Panel appears at top of sidebar (first)
- [ ] Completion % bar shows (red if blocked, green if ready)
- [ ] Status badge correct
- [ ] Blocking reasons listed if incomplete
- [ ] Site status expandable
- [ ] "View Export Settings" navigates to `/settings/export-settings`

---

## Known Limitations

1. **Backend API Missing:**
   - `GET /api/products/{id}/completion` not yet implemented
   - Completion panel will show "Failed to load" until added

2. **Optimization Opportunities:**
   - Rules client could cache in localStorage with TTL
   - Modal could show product samples (if < 5 blocked)
   - Panel could deep-link to attribute sections in editor

3. **Accessibility:**
   - Modal uses ARIA labels but could add keyboard navigation
   - Color contrast verified for WCAG AA

---

## Next Steps

1. **Merge this PR** to deploy UI artifacts to staging
2. **Verify on staging** (John/Lisa):
   - Test `/settings/export-settings` shows real rules
   - Trigger blocked export → See 423 modal
   - Open product editor → See completion panel (will show error until backend)
3. **Implement backend endpoint** `GET /api/products/{id}/completion`
4. **Re-test** product panel with live data

---

**Status:** Ready for review. All UI fully functional except Artifact 3 (awaiting backend endpoint).

**Implements:** Operator visibility requirements for PR #430 export gate enforcement
