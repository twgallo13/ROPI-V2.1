# VVP Evidence Folder - GLOBAL Mode UI Verification
**LP:** LP-export-global-impl-2b  
**Executor:** Homer  
**Status:** READY - Awaiting staging deployment  

## Purpose

This folder will contain step-by-step VVP (Verification & Validation Plan) evidence for GLOBAL mode UI implementation, following the non-developer VVP from `vvp-retailops-global.md`.

## Evidence to be Captured

### Test Products
- **Product 1:** mpn=`18-test` 
- **Product 2:** mpn=`211737-90h1-8`

### Required Screenshots (per test product)

1. **Initial State (Flag OFF - SITE_SCOPED)**
   - `01-site-scoped-export-page.png` - ExportPage showing site dropdown
   - `01-site-scoped-product-panel.png` - CompletionExportGatePanel showing standard gauge

2. **GLOBAL Mode Enabled (Flag ON)**
   - `02-global-export-page.png` - ExportPage with GLOBAL badge, no site dropdown
   - `02-global-product-panel.png` - GlobalModeCard rendering
   - `02-global-completion-bar.png` - Aggregated completion percentage
   - `02-global-segment-table.png` - Segment breakdown with BEST scores
   - `02-global-missing-attributes.png` - Missing global attributes section
   - `02-global-blocking-segments.png` - Blocking segments (if applicable)

3. **Advanced Toggle**
   - `03-advanced-toggle-collapsed.png` - Advanced section collapsed
   - `03-advanced-toggle-expanded.png` - Advanced section showing siteStatus

4. **Export Flow**
   - `04-export-button-click.png` - Export button ready
   - `04-export-payload-network.png` - Network tab showing site='GLOBAL' in request

5. **Attribute Update Test**
   - `05-before-attribute-change.png` - Current completion state
   - `05-attribute-update.png` - Changing core/classification attribute
   - `05-after-attribute-change.png` - Updated completion state (GlobalModeCard reflects change)

6. **Toggle Back to SITE_SCOPED**
   - `06-flag-disabled.png` - Flag set to disabled
   - `06-site-scoped-restored.png` - UI reverted to SITE_SCOPED mode

### Required Network Traces (JSON)

1. **Flag OFF (SITE_SCOPED)**
   - `readiness-flag-off.json` - GET /api/products/18/completion response (no productLevelReadiness)
   - `product-18-test-flag-off.json` - Full product 18 completion response
   - `product-211737-flag-off.json` - Full product 211737 completion response

2. **Flag ON (GLOBAL)**
   - `readiness-flag-on.json` - GET /api/products/18/completion response with mode=GLOBAL
   - `product-18-test-flag-on.json` - Full response with productLevelReadiness object
   - `product-211737-flag-on.json` - Full response with productLevelReadiness object
   - `export-dry-run-payload-global.json` - POST /api/admin/exports/dry-run request body (site='GLOBAL')

3. **Toggle Back**
   - `readiness-toggle-back.json` - Response after disabling flag (back to SITE_SCOPED)

### VVP Execution Log

- `vvp-execution-log.md` - Step-by-step execution notes
  - Timestamp for each step
  - Pass/fail status
  - Observations
  - Any deviations or issues
  - Final verdict

### E2E Test Results

- `e2e-test-results.txt` - Playwright test execution output
  - 10 tests expected
  - All should pass
  - Duration and any warnings

## Execution Plan

Once staging is deployed:

1. **Setup**
   - Navigate to ropi-aoss-staging URL
   - Authenticate as admin
   - Verify feature flag is DISABLED (SITE_SCOPED)

2. **Baseline Verification (Flag OFF)**
   - Load /export page
   - Load product 18 and product 211737
   - Capture screenshots showing SITE_SCOPED UI
   - Capture network traces showing no GLOBAL fields

3. **GLOBAL Mode Verification (Flag ON)**
   - Enable feature flag: `node scripts/set-export-global-flag.js enable`
   - Reload /export page
   - Load product 18 and product 211737
   - Capture screenshots showing GlobalModeCard
   - Verify aggregated completion, segment table, missing attributes
   - Test Advanced toggle expand/collapse
   - Capture export flow with site='GLOBAL' payload

4. **Functional VVP**
   - Change an attribute on product 18
   - Verify GlobalModeCard updates correctly
   - Test export dry-run

5. **Toggle Back**
   - Disable feature flag: `node scripts/set-export-global-flag.js disable`
   - Reload /export page
   - Verify UI reverted to SITE_SCOPED

6. **E2E Tests**
   - Run: `npm run test:e2e global-export-mode.spec.ts`
   - Capture output

7. **Verification Complete**
   - Update HES C manifest with results
   - Commit all evidence to evidence/phase2/vvp-ui-global/
   - Return to Lisa for acceptance

## Current Status

**Status:** ⏳ AWAITING STAGING DEPLOYMENT  
**Blocker:** Staging URL not available  
**Homer Ready:** ✅ Yes - can execute immediately upon staging availability  

**Expected Duration:** ~20 minutes once staging is accessible  
**Risk Level:** LOW - All unit tests passing, code reviewed and merged  

