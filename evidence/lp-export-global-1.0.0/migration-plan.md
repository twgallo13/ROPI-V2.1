# Migration Plan: RetailOps Global Export Mode
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready  
**Supersedes:** migration-plan-hes-a.md

---

## Executive Summary

This document defines a **5-phase phased migration** to add GLOBAL export mode to ROPI-V2.1 with **instant rollback capability** at each phase. All phases are **non-breaking** and maintain full backward compatibility.

**Total Timeline:** 4-6 weeks (assumes 1 week per phase + buffer)  
**Rollback Strategy:** Feature flag toggle + database config revert (< 5 minutes per phase)

---

## Phase Overview

| Phase | Deliverable | Duration | Risk | Rollback Time |
|-------|-------------|----------|------|---------------|
| 1 | API Contract Extension | 1 week | Low | Instant (no behavior change) |
| 2 | Backend GLOBAL Mode Logic | 1-2 weeks | Medium | 5 min (feature flag) |
| 3 | UI Conditional Rendering | 1 week | Low | 5 min (feature flag) |
| 4 | Product Classification Segment | 1 week | Medium | Instant (segment disable) |
| 5 | Cleanup & Optimization | 1 week | Low | N/A (optional) |

---

## Phase 1: API Contract Extension (Backend Foundation)

### 1.1 Objective
Extend TypeScript interfaces and add mode detection infrastructure **without changing runtime behavior**.

### 1.2 Changes

#### Change 1.1: Extend CompletionDrivenExportReadiness Interface
**File:** [packages/api/src/services/completionDrivenExportReadiness.ts:L33-51](packages/api/src/services/completionDrivenExportReadiness.ts#L33-L51)

**Before:**
```typescript
export interface CompletionDrivenExportReadiness {
  ready: boolean;
  completionPct: number;
  threshold: number;
  // ... existing fields
}
```

**After:**
```typescript
export interface CompletionDrivenExportReadiness {
  mode?: 'GLOBAL' | 'SITE_SCOPED'; // NEW: Optional, defaults to undefined (backward compat)
  ready: boolean;
  completionPct: number;
  threshold: number;
  // ... existing fields
  productLevelReadiness?: ProductLevelReadiness; // NEW: Only populated in GLOBAL mode
}

export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;
  segmentScores: SegmentScore[];
  missingGlobalAttributes: string[];
  websiteOptional: boolean;
  sitesEvaluated: string[];
  blockingSegments: string[];
}
```

**Rationale:** Optional fields ensure existing clients continue working unchanged.

---

#### Change 1.2: Add Mode Detection Function
**File:** [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) (append after L649)

**Code:**
```typescript
/**
 * Detect export mode for tenant (GLOBAL vs SITE_SCOPED)
 * Defaults to SITE_SCOPED if not configured
 */
export async function detectExportMode(tenantId?: string): Promise<'GLOBAL' | 'SITE_SCOPED'> {
  try {
    const settingsRef = admin.firestore()
      .collection('settings')
      .doc(tenantId || 'default')
      .collection('exportSettings')
      .doc('config');
    
    const snapshot = await settingsRef.get();
    const mode = snapshot.data()?.mode;
    
    if (mode === 'GLOBAL') {
      console.log(`[ExportMode] Tenant ${tenantId} using GLOBAL mode`);
      return 'GLOBAL';
    }
    
    console.log(`[ExportMode] Tenant ${tenantId} using SITE_SCOPED mode (default)`);
    return 'SITE_SCOPED';
  } catch (error) {
    console.warn('[ExportMode] Failed to detect mode, defaulting to SITE_SCOPED:', error);
    return 'SITE_SCOPED';
  }
}
```

**Rationale:** Safe read-only function, always returns SITE_SCOPED unless explicitly configured.

---

### 1.3 Tests

#### Test 1.1: TypeScript Compilation
```bash
cd /workspaces/ROPI-V2.1/packages/api
npm run build
```
**Expected:** No TypeScript errors, interfaces compile successfully.

#### Test 1.2: Mode Detection Default Behavior
```bash
cd /workspaces/ROPI-V2.1/packages/api
npm test -- --testPathPattern=completionDrivenExportReadiness --testNamePattern="detectExportMode"
```
**Expected:** `detectExportMode()` returns `"SITE_SCOPED"` for unconfigured tenant.

#### Test 1.3: Existing API Endpoint Behavior
```bash
curl -X GET https://staging.ropi.ai/api/products/18/completion \
  -H "Authorization: Bearer $TOKEN"
```
**Expected:** Response has NO `mode` field (backward compatible), existing fields unchanged.

---

### 1.4 Rollback Procedure

**No rollback needed** — Phase 1 adds unused code paths with no behavior changes.

**If must revert:**
1. `git revert <commit-hash>`
2. `npm run build && npm run deploy`
3. **Time:** 2 minutes

---

### 1.5 Acceptance Criteria

- ✅ TypeScript compiles without errors
- ✅ All existing unit tests pass
- ✅ `detectExportMode()` unit test passes
- ✅ Staging API returns unchanged responses (no `mode` field)

---

## Phase 2: Backend GLOBAL Mode Logic (Feature Flag)

### 2.1 Objective
Implement product-level aggregation logic and mode branching in backend, **gated by Firestore feature flag**.

### 2.2 Changes

#### Change 2.1: Add Product-Level Aggregation Function
**File:** [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) (append after detectExportMode)

**Code:** See [design-architecture.md:Section 2.1 Step 1.3](design-architecture.md) for full pseudocode.

**Summary:** `aggregateProductLevelReadiness()` function that:
- Extracts all product sites
- Evaluates completion per site (excluding Description/SEO segment)
- Takes BEST score per segment across sites
- Returns productLevelReadiness object

---

#### Change 2.2: Modify Main Evaluation Function
**File:** [packages/api/src/services/completionDrivenExportReadiness.ts:L300-376](packages/api/src/services/completionDrivenExportReadiness.ts#L300-L376)

**Before (L320-323):**
```typescript
// Load completion rules configuration
const completionRules = await loadCompletionRules(forceRulesRefresh);

// Load attribute registry
const attributeRegistry = await loadAttributeRegistryForCompletion();
```

**After (ADD mode branching):**
```typescript
// Load completion rules configuration
const completionRules = await loadCompletionRules(forceRulesRefresh);

// Load attribute registry
const attributeRegistry = await loadAttributeRegistryForCompletion();

// PHASE 2 NEW: Detect export mode
const exportMode = await detectExportMode(tenantId);

// BRANCH: GLOBAL mode path (only executes if Firestore config = GLOBAL)
if (exportMode === 'GLOBAL' && product) {
  const productLevelReadiness = await aggregateProductLevelReadiness(
    product,
    completionRules,
    attributeRegistry,
    evaluationTimestamp
  );
  
  const isReady = productLevelReadiness.aggregatedCompletionPct >= completionRules.exportUnlockThresholdPct;
  
  return {
    mode: 'GLOBAL',
    ready: isReady,
    completionPct: productLevelReadiness.aggregatedCompletionPct,
    threshold: completionRules.exportUnlockThresholdPct,
    hasBlockingSites: false,
    blockingReasons: isReady ? [] : [{
      type: 'COMPLETION_BELOW_THRESHOLD',
      severity: 'BLOCKING',
      message: `Product ${productLevelReadiness.aggregatedCompletionPct}% complete (threshold: ${completionRules.exportUnlockThresholdPct}%)`,
      details: {
        currentCompletion: productLevelReadiness.aggregatedCompletionPct,
        requiredCompletion: completionRules.exportUnlockThresholdPct,
        missingAttributes: productLevelReadiness.missingGlobalAttributes
      }
    }],
    operatorExplanation: generateGlobalOperatorExplanation(productLevelReadiness, completionRules),
    productLevelReadiness,
    evaluationTimestamp,
    rulesVersion: completionRules.rulesVersion
  };
}

// ELSE: Existing SITE_SCOPED logic (unchanged)
if (!product) {
  return await evaluateCatalogCompletion(completionRules, attributeRegistry, evaluationTimestamp);
}
// ... rest of existing code L323-376 ...
```

**Rationale:** Mode check happens BEFORE any logic execution, safe fallthrough to existing code.

---

### 2.3 Feature Flag Configuration

#### Step 2.3.1: Create Firestore Config Document (DO NOT ENABLE YET)
**Firestore Path:** `/settings/default/exportSettings/config`

**Command:**
```javascript
// create_export_config.js
const admin = require('firebase-admin');
admin.initializeApp();

async function createExportConfig() {
  const docRef = admin.firestore()
    .collection('settings')
    .doc('default')
    .collection('exportSettings')
    .doc('config');
  
  await docRef.set({
    mode: 'SITE_SCOPED', // Default: existing behavior
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    updatedBy: 'phase-2-migration'
  });
  
  console.log('✅ Export config created (SITE_SCOPED default)');
}

createExportConfig().catch(console.error);
```

**Execute:**
```bash
cd /workspaces/ROPI-V2.1
node evidence/lp-export-global-1.0.0/scripts/create_export_config.js
```

**Verify:**
```bash
# Check Firestore console or CLI
firebase firestore:get settings/default/exportSettings/config
```

---

### 2.4 Tests

#### Test 2.1: SITE_SCOPED Mode (Default, Unchanged Behavior)
```bash
curl -X GET https://staging.ropi.ai/api/products/18/completion \
  -H "Authorization: Bearer $TOKEN"
```
**Expected:**
```json
{
  "mode": "SITE_SCOPED",
  "ready": false,
  "completionPct": 0,
  "siteStatus": [
    { "site": "ropi-web", "blocked": false },
    { "site": "ropi-app", "blocked": true }
  ]
}
```

#### Test 2.2: GLOBAL Mode (Feature Flag ON)
**Step 1:** Enable GLOBAL mode
```javascript
// enable_global_mode.js
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'GLOBAL' });
```

**Step 2:** Test API
```bash
curl -X GET https://staging.ropi.ai/api/products/18/completion \
  -H "Authorization: Bearer $TOKEN"
```
**Expected:**
```json
{
  "mode": "GLOBAL",
  "ready": true,
  "completionPct": 85,
  "productLevelReadiness": {
    "aggregatedCompletionPct": 85,
    "segmentScores": [ /* ... */ ],
    "missingGlobalAttributes": ["department"],
    "websiteOptional": false,
    "sitesEvaluated": ["ropi-web", "ropi-app"]
  },
  "siteStatus": []
}
```

#### Test 2.3: Feature Flag Toggle (Instant Rollback Test)
**Step 1:** Disable GLOBAL mode
```javascript
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'SITE_SCOPED' });
```

**Step 2:** Verify rollback
```bash
curl -X GET https://staging.ropi.ai/api/products/18/completion \
  -H "Authorization: Bearer $TOKEN"
```
**Expected:** Response reverts to SITE_SCOPED format (with siteStatus array).

**Time to Rollback:** < 5 minutes (Firestore update + cache TTL)

---

### 2.5 Rollback Procedure

#### Option A: Feature Flag Disable (Instant)
```javascript
// rollback_phase_2.js
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({
    mode: 'SITE_SCOPED',
    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    rollbackReason: 'Phase 2 rollback'
  });
```
**Time:** 2 minutes (Firestore update)  
**Impact:** API immediately returns to SITE_SCOPED behavior, no deployment needed.

#### Option B: Code Revert (Full Rollback)
```bash
git revert <phase-2-commit-hash>
npm run build && npm run deploy:api
```
**Time:** 5 minutes (build + deploy)

---

### 2.6 Acceptance Criteria

- ✅ SITE_SCOPED mode: API behavior unchanged from Phase 1
- ✅ GLOBAL mode: API returns productLevelReadiness object
- ✅ Feature flag toggle: Instant mode switch (< 5 min)
- ✅ Unit tests: 90%+ coverage for aggregateProductLevelReadiness()
- ✅ Integration tests: Both modes tested with real Firestore config

---

## Phase 3: UI Conditional Rendering (Frontend)

### 3.1 Objective
Add UI conditional rendering based on mode detection, **hide site dropdown in GLOBAL mode**.

### 3.2 Changes

#### Change 3.1: Add Mode State to ExportPage
**File:** [packages/web/src/pages/ExportPage.tsx:L18-20](packages/web/src/pages/ExportPage.tsx#L18-L20)

**Before:**
```tsx
const [exporting, setExporting] = useState(false);
const [selectedSite, setSelectedSite] = useState('ropi-web');
const [selectedFormat, setSelectedFormat] = useState('csv');
```

**After:**
```tsx
const [exporting, setExporting] = useState(false);
const [selectedSite, setSelectedSite] = useState('ropi-web');
const [selectedFormat, setSelectedFormat] = useState('csv');
const [exportMode, setExportMode] = useState<'GLOBAL' | 'SITE_SCOPED' | null>(null); // NEW
const [modeLoading, setModeLoading] = useState(true); // NEW
```

---

#### Change 3.2: Create Export Config API Endpoint
**New File:** `packages/api/src/routes/exportConfigRoutes.ts`

**Code:**
```typescript
import { Router } from 'express';
import { detectExportMode } from '../services/completionDrivenExportReadiness';

const router = Router();

router.get('/api/admin/exports/config', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const mode = await detectExportMode(tenantId);
    
    res.json({
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExportConfig] Failed to fetch config:', error);
    res.status(500).json({
      error: 'Failed to fetch export configuration',
      mode: 'SITE_SCOPED'
    });
  }
});

export default router;
```

**Integration:** Add to `packages/api/src/index.ts`:
```typescript
import exportConfigRoutes from './routes/exportConfigRoutes';
app.use(exportConfigRoutes);
```

---

#### Change 3.3: Fetch Mode on Page Mount
**File:** [packages/web/src/pages/ExportPage.tsx](packages/web/src/pages/ExportPage.tsx) (add new useEffect)

**Code:**
```tsx
useEffect(() => {
  async function fetchExportMode() {
    try {
      setModeLoading(true);
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/exports/config', {
        headers: authHeaders
      });
      
      if (response.ok) {
        const config = await response.json();
        setExportMode(config.mode || 'SITE_SCOPED');
      } else {
        setExportMode('SITE_SCOPED');
      }
    } catch (error) {
      console.error('Error fetching export mode:', error);
      setExportMode('SITE_SCOPED');
    } finally {
      setModeLoading(false);
    }
  }
  
  fetchExportMode();
}, []);
```

---

#### Change 3.4: Conditional Site Dropdown Rendering
**File:** [packages/web/src/pages/ExportPage.tsx:L169-189](packages/web/src/pages/ExportPage.tsx#L169-L189)

**Before:**
```tsx
<div className="export-controls">
  <label htmlFor="site-select">Website:</label>
  <select
    id="site-select"
    value={selectedSite}
    onChange={(e) => setSelectedSite(e.target.value)}
    disabled={!exportReady || exporting}
  >
    <option value="ropi-web">ROPI Web</option>
    <option value="ropi-app">ROPI App</option>
  </select>
  {/* ... format select ... */}
</div>
```

**After:**
```tsx
<div className="export-controls">
  {/* Conditional: Only show site selector in SITE_SCOPED mode */}
  {exportMode === 'SITE_SCOPED' && (
    <>
      <label htmlFor="site-select">Website:</label>
      <select
        id="site-select"
        value={selectedSite}
        onChange={(e) => setSelectedSite(e.target.value)}
        disabled={!exportReady || exporting}
      >
        <option value="ropi-web">ROPI Web</option>
        <option value="ropi-app">ROPI App</option>
      </select>
    </>
  )}
  
  {/* Show mode badge in GLOBAL mode */}
  {exportMode === 'GLOBAL' && (
    <div className="mode-indicator">
      <span className="badge badge-global">🌍 Global Export Mode</span>
      <span className="help-text">Product-level evaluation</span>
    </div>
  )}
  
  {/* Format select (always visible) */}
  <label htmlFor="format-select">Format:</label>
  <select
    id="format-select"
    value={selectedFormat}
    onChange={(e) => setSelectedFormat(e.target.value)}
    disabled={!exportReady || exporting}
  >
    <option value="csv">CSV</option>
    <option value="json">JSON</option>
  </select>
</div>
```

---

#### Change 3.5: Conditional Export Request Body
**File:** [packages/web/src/pages/ExportPage.tsx:L36-42](packages/web/src/pages/ExportPage.tsx#L36-L42)

**Before:**
```tsx
body: JSON.stringify({
  site: selectedSite,
  format: selectedFormat,
  limit: 100,
  includeMeta: true,
}),
```

**After:**
```tsx
body: JSON.stringify({
  ...(exportMode === 'SITE_SCOPED' && { site: selectedSite }),
  format: selectedFormat,
  limit: 100,
  includeMeta: true,
}),
```

---

### 3.3 Tests

#### Test 3.1: SITE_SCOPED UI (Default)
**Manual QA:**
1. Navigate to `https://staging.ropi.ai/export`
2. **Expected:** Site dropdown visible, no GLOBAL badge
3. Select site → Export → Verify request includes `{ site: "ropi-web" }`

#### Test 3.2: GLOBAL UI (Feature Flag ON)
**Step 1:** Enable GLOBAL mode
```javascript
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'GLOBAL' });
```

**Manual QA:**
1. Refresh `https://staging.ropi.ai/export`
2. **Expected:** 
   - Site dropdown HIDDEN
   - "🌍 Global Export Mode" badge visible
   - Export request has NO `site` field

#### Test 3.3: Mode Toggle (Live Reload Test)
**Step 1:** Toggle mode SITE_SCOPED → GLOBAL → SITE_SCOPED  
**Step 2:** Refresh page each time  
**Expected:** UI immediately reflects current mode (no code deployment needed)

---

### 3.4 Rollback Procedure

**Same as Phase 2:** Toggle Firestore config to `mode: "SITE_SCOPED"`

```javascript
await admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('exportSettings')
  .doc('config')
  .update({ mode: 'SITE_SCOPED' });
```

**Time:** 2 minutes  
**Impact:** UI reverts to showing site dropdown, no frontend deploy needed.

---

### 3.5 Acceptance Criteria

- ✅ SITE_SCOPED: UI shows site dropdown (unchanged)
- ✅ GLOBAL: UI hides site dropdown, shows mode badge
- ✅ Export request: Conditional `site` parameter based on mode
- ✅ Feature flag toggle: UI updates after page refresh (< 5 min)
- ✅ E2E tests: Both modes tested in Cypress/Playwright

---

## Phase 4: Product Classification Segment (Completion Rules)

### 4.1 Objective
Enable classification attributes (category, class, department) as **20% of completion score**.

### 4.2 Changes

#### Change 4.1: Update Firestore Completion Rules Config
**Firestore Path:** `/settings/default/completionRules/config`

**Before (current segments, from HES A):**
```json
{
  "segments": [
    {
      "id": "core-attributes",
      "weightPct": 50,
      "attributeSelector": {
        "categories": ["product", "general"]
      }
    },
    {
      "id": "description-seo",
      "weightPct": 30,
      "attributeSelector": {
        "categories": ["description", "seo"]
      }
    }
  ]
}
```

**After (ADD classification segment):**
```json
{
  "segments": [
    {
      "id": "core-attributes",
      "weightPct": 50,
      "attributeSelector": {
        "categories": ["product", "general"]
      }
    },
    {
      "id": "description-seo",
      "weightPct": 30,
      "attributeSelector": {
        "categories": ["description", "seo"]
      }
    },
    {
      "id": "product-classification",
      "name": "Product Classification",
      "weightPct": 20,
      "enabled": true,
      "ruleType": "ALL_REQUIRED",
      "attributeSelector": {
        "categories": ["classification"],
        "requirementFlag": "completionRequired",
        "excludeAttributeIds": [],
        "includeInternalOnly": false
      }
    }
  ],
  "rulesVersion": 2
}
```

---

#### Change 4.2: Apply Classification Segment Script
**New File:** `evidence/lp-export-global-1.0.0/scripts/apply_classification_segment.js`

**Code:**
```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function applyClassificationSegment(tenantId = 'default') {
  const docRef = admin.firestore()
    .collection('settings')
    .doc(tenantId)
    .collection('completionRules')
    .doc('config');
  
  const currentDoc = await docRef.get();
  const currentSegments = currentDoc.data()?.segments || [];
  
  // Check if classification segment already exists
  const hasClassification = currentSegments.some(seg => seg.id === 'product-classification');
  if (hasClassification) {
    console.log('⚠️  Classification segment already exists');
    return;
  }
  
  // Add classification segment
  const newSegment = {
    id: 'product-classification',
    name: 'Product Classification',
    weightPct: 20,
    enabled: true,
    ruleType: 'ALL_REQUIRED',
    attributeSelector: {
      categories: ['classification'],
      requirementFlag: 'completionRequired',
      excludeAttributeIds: [],
      includeInternalOnly: false
    }
  };
  
  await docRef.update({
    segments: [...currentSegments, newSegment],
    rulesVersion: admin.firestore.FieldValue.increment(1),
    lastUpdated: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✅ Classification segment applied (20% weight)');
}

applyClassificationSegment().catch(console.error);
```

**Execute:**
```bash
cd /workspaces/ROPI-V2.1
node evidence/lp-export-global-1.0.0/scripts/apply_classification_segment.js
```

---

### 4.3 Tests

#### Test 4.1: Classification Attributes Now Enforced
**Before (Phase 3):**
```bash
curl -X GET https://staging.ropi.ai/api/products/18/completion
```
**Expected:** `completionPct: 85%` (classification not counted)

**After (Phase 4):**
```bash
# Same API call
curl -X GET https://staging.ropi.ai/api/products/18/completion
```
**Expected:** 
```json
{
  "completionPct": 72,
  "operatorExplanation": {
    "completionBreakdown": [
      { "segmentId": "core-attributes", "score": 100, "weightPct": 50 },
      { "segmentId": "description-seo", "score": 100, "weightPct": 30 },
      { "segmentId": "product-classification", "score": 33, "weightPct": 20, "missingAttributes": ["class", "department"] }
    ]
  }
}
```

**Rationale:** Product 18 (from VVP) missing `class` and `department` → classification segment 33% complete → drags total completion from 85% to 72%.

---

#### Test 4.2: Product with Full Classification
**Test Product:** mpn `211737-90h1-8` (from VVP, has category/class/department)

```bash
curl -X GET https://staging.ropi.ai/api/products/211737-90h1-8/completion
```
**Expected:**
```json
{
  "completionPct": 100,
  "operatorExplanation": {
    "completionBreakdown": [
      { "segmentId": "core-attributes", "score": 100, "weightPct": 50 },
      { "segmentId": "description-seo", "score": 100, "weightPct": 30 },
      { "segmentId": "product-classification", "score": 100, "weightPct": 20 }
    ]
  }
}
```

---

### 4.4 Rollback Procedure

#### Option A: Disable Classification Segment (Instant)
```javascript
// rollback_phase_4.js
const docRef = admin.firestore()
  .collection('settings')
  .doc('default')
  .collection('completionRules')
  .doc('config');

await docRef.update({
  'segments': admin.firestore.FieldValue.arrayRemove({
    id: 'product-classification',
    // ... full segment object to remove ...
  }),
  rulesVersion: admin.firestore.FieldValue.increment(1)
});
```

**Alternative:** Set `enabled: false` on classification segment:
```javascript
const currentDoc = await docRef.get();
const segments = currentDoc.data().segments.map(seg => 
  seg.id === 'product-classification' ? { ...seg, enabled: false } : seg
);
await docRef.update({ segments });
```

**Time:** 2 minutes  
**Impact:** Classification attributes immediately stop contributing to completion score.

---

### 4.5 Acceptance Criteria

- ✅ Classification segment: 20% weight in completion calculation
- ✅ Products missing classification: Completion drops appropriately
- ✅ Products with classification: Completion increases appropriately
- ✅ Rollback: `enabled: false` instantly disables segment
- ✅ Attribute registry: category, class, department marked `required_for_completion: true`

---

## Phase 5: Cleanup & Optimization (Optional)

### 5.1 Objective
Remove deprecated per-site UI code after **30-day transition period** (optional cleanup phase).

### 5.2 Changes

#### Change 5.1: Remove Site Dropdown Code (GLOBAL-only tenants)
**File:** [packages/web/src/pages/ExportPage.tsx:L169-189](packages/web/src/pages/ExportPage.tsx#L169-L189)

**Before:** Conditional rendering (from Phase 3)
**After:** Remove `{exportMode === 'SITE_SCOPED' && ...}` wrapper if tenant permanently on GLOBAL mode.

**Note:** This is OPTIONAL and tenant-specific. Most tenants should KEEP conditional rendering for flexibility.

---

#### Change 5.2: Archive Site-Scoped Logic (Future Optimization)
**Consideration:** If ALL tenants migrate to GLOBAL mode, archive:
- `extractSelectedSites()` function (L426-450)
- Site-blocking logic (L330-336)
- Per-site accordion UI (CompletionExportGatePanel.tsx L200-227)

**Risk:** High — DO NOT remove unless 100% tenant adoption confirmed.

---

### 5.3 Tests

No specific tests — this is code cleanup only.

---

### 5.4 Rollback

Not applicable — Phase 5 is optional optimization.

---

## Summary: Rollback Decision Matrix

| Phase | Issue Type | Rollback Method | Time | Data Loss? |
|-------|------------|-----------------|------|------------|
| 1 | TypeScript compilation error | `git revert` + redeploy | 2 min | No |
| 2 | Backend logic bug | Toggle Firestore `mode: "SITE_SCOPED"` | 2 min | No |
| 2 | Catastrophic failure | `git revert` + redeploy API | 5 min | No |
| 3 | UI rendering bug | Toggle Firestore `mode: "SITE_SCOPED"` | 2 min | No |
| 3 | Frontend crash | `git revert` + redeploy frontend | 5 min | No |
| 4 | Completion score error | Disable classification segment | 2 min | No |
| 4 | Attribute mapping bug | Remove classification segment | 2 min | No |

**Golden Rule:** Every phase has instant rollback via Firestore config toggle (< 5 min).

---

## Execution Checklist

### Pre-Flight (Before Phase 1)
- [ ] Backup Firestore `settings/` collection
- [ ] Document current completion scores for test products (18, 211737-90h1-8)
- [ ] Set up staging environment feature flags
- [ ] Notify RetailOps integration team of timeline

### Phase 1 Checklist
- [ ] Extend TypeScript interfaces
- [ ] Add `detectExportMode()` function
- [ ] Compile TypeScript successfully
- [ ] Run unit tests (90%+ coverage)
- [ ] Deploy to staging
- [ ] Verify API responses unchanged

### Phase 2 Checklist
- [ ] Implement `aggregateProductLevelReadiness()`
- [ ] Add mode branching to main evaluation function
- [ ] Create Firestore config document (`mode: "SITE_SCOPED"`)
- [ ] Deploy to staging
- [ ] Test SITE_SCOPED mode (unchanged behavior)
- [ ] Enable GLOBAL mode for test tenant
- [ ] Test GLOBAL mode (new productLevelReadiness object)
- [ ] Toggle mode back to SITE_SCOPED (rollback test)
- [ ] Document API response examples

### Phase 3 Checklist
- [ ] Add mode state to ExportPage
- [ ] Create `/api/admin/exports/config` endpoint
- [ ] Implement conditional UI rendering
- [ ] Deploy API + frontend to staging
- [ ] Manual QA: SITE_SCOPED mode (dropdown visible)
- [ ] Enable GLOBAL mode
- [ ] Manual QA: GLOBAL mode (dropdown hidden, badge visible)
- [ ] E2E tests: Both modes in Cypress
- [ ] Toggle mode rollback test

### Phase 4 Checklist
- [ ] Create `apply_classification_segment.js` script
- [ ] Apply classification segment to staging Firestore
- [ ] Test product 18 (partial classification) → completion drops
- [ ] Test product 211737-90h1-8 (full classification) → completion increases
- [ ] Verify attribute registry (category/class/department required)
- [ ] Document before/after completion scores
- [ ] Test rollback: disable segment → scores revert

### Phase 5 Checklist (Optional)
- [ ] Confirm 100% tenant adoption of GLOBAL mode
- [ ] Archive deprecated site-scoped code
- [ ] Update documentation

---

## Risk Mitigation

### Risk 1: Firestore Access Blocked (from HES A)
**Mitigation:** All scripts require Firestore Admin SDK credentials. If blocked:
1. Use Firebase Console UI to manually update config documents
2. Request Firestore access from DevOps (exact permissions documented in [access-blockers.txt](access-blockers.txt))

### Risk 2: Classification Segment Incorrect Weighting
**Mitigation:** 
- Phase 4 is INDEPENDENT of Phases 2-3 (can be rolled back separately)
- Start with `enabled: false`, test in isolation, then enable

### Risk 3: Frontend Cache Issues
**Mitigation:**
- `/api/admin/exports/config` endpoint has no caching headers
- Force cache bust: Add `?ts=${Date.now()}` query param during testing
- Document cache TTL expectations (< 5 min)

---

**Document Status:** ✅ Ready for Execution  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** attribute-mapping.md
