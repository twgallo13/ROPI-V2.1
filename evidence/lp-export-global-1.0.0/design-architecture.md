# Design Architecture: RetailOps Global Export Mode
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready

---

## Executive Summary

This document provides a **code-level implementation plan** for adding GLOBAL export mode to ROPI-V2.1, decoupling product-level readiness from per-site evaluation for RetailOps integration. All implementation citations reference exact file paths and line numbers inspected during HES A diagnostic phase.

**Critical Governance Constraints:**
- NO breaking changes to existing API contract
- NO runtime behavior changes for non-RetailOps tenants
- Backward compatibility via mode field detection in clients
- Tenant-scoped feature flag for phased rollout

---

## 1. High-Level Architecture

### 1.1 Current Architecture (Per-Site)

```
┌─────────────┐
│ ExportPage  │ (UI)
│ L169-189    │ ← selectedSite state, dropdown
└──────┬──────┘
       │ POST /api/admin/exports/dry-run
       │ { site: "ropi-web", format: "csv" }
       ▼
┌────────────────────────────┐
│ completionDrivenExport     │ (Backend)
│ Readiness.ts L320-376      │
└──────┬─────────────────────┘
       │ extractSelectedSites(product)
       │ → L426-450: Check websites/sites/website/attributes.website
       │ → L330-336: If sites.length === 0 → BLOCKED
       ▼
┌────────────────────────────┐
│ evaluateCompletion()       │ (Engine)
│ L79-126                    │
│ ← selectedSites[] required │
└──────┬─────────────────────┘
       │ Loop segments, evaluate per-site Description/SEO
       │ Generate siteStatus[] array
       ▼
┌────────────────────────────┐
│ Response:                  │
│ {                          │
│   ready: bool,             │
│   siteStatus: [...]        │ ← Per-site detail
│ }                          │
└────────────────────────────┘
```

**Key Decision Points (from HES A):**
- **UI:** [packages/web/src/pages/ExportPage.tsx:L169-189](packages/web/src/pages/ExportPage.tsx#L169-L189) renders site dropdown
- **Backend:** [packages/api/src/services/completionDrivenExportReadiness.ts:L330-336](packages/api/src/services/completionDrivenExportReadiness.ts#L330-L336) blocks if `selectedSites.length === 0`
- **Engine:** [packages/api/src/services/completionEvaluationEngine.ts:L79-126](packages/api/src/services/completionEvaluationEngine.ts#L79-L126) requires `selectedSites[]` parameter

### 1.2 Target Architecture (GLOBAL Mode)

```
┌─────────────┐
│ ExportPage  │ (UI - NEW)
│ L169-189    │ ← Conditional: if (mode === 'GLOBAL') → hide dropdown
└──────┬──────┘
       │ POST /api/admin/exports/dry-run
       │ { format: "csv" }  ← NO site parameter
       ▼
┌────────────────────────────┐
│ completionDrivenExport     │ (Backend - EXTENDED)
│ Readiness.ts NEW           │
└──────┬─────────────────────┘
       │ detectMode(tenant) → "GLOBAL" or "SITE_SCOPED"
       │
       ├─ GLOBAL path:
       │  → aggregateProductLevelReadiness(product, allSites)
       │  → Compute productLevelReadiness { segmentScores, missingGlobal, websiteOptional }
       │  → Return { mode: "GLOBAL", productLevelReadiness, ready, completionPct }
       │
       └─ SITE_SCOPED path (unchanged):
          → extractSelectedSites(product) → [legacy behavior]
          → evaluateCompletion(selectedSites)
          → Return { mode: "SITE_SCOPED", siteStatus, ready, completionPct }
```

**New Decision Points:**
- **Tenant Config:** `settings/exportSettings/mode = "GLOBAL" | "SITE_SCOPED"` (Firestore)
- **Backend Router:** Detect mode → branch to global or site-scoped logic
- **UI Router:** Fetch mode from `/api/admin/exports/config` → conditionally render UI

---

## 2. Code-Level Implementation Plan

### 2.1 Phase 1: API Contract Extension (Non-Breaking)

**File:** [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts)

#### Step 1.1: Extend CompletionDrivenExportReadiness Interface
**Lines to Modify:** L33-51 (current interface definition)

**Current Code (L33-51):**
```typescript
export interface CompletionDrivenExportReadiness {
  ready: boolean;
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: ExportBlockingReason[];
  operatorExplanation: OperatorExplanation;
  catalogStats?: {
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;
    readyCount: number;
  };
  evaluationTimestamp: string;
  rulesVersion: number;
}
```

**Target Code (ADD to interface):**
```typescript
export interface CompletionDrivenExportReadiness {
  mode?: 'GLOBAL' | 'SITE_SCOPED'; // NEW: Evaluation mode
  ready: boolean;
  completionPct: number;
  threshold: number;
  hasBlockingSites: boolean;
  blockingReasons: ExportBlockingReason[];
  operatorExplanation: OperatorExplanation;
  productLevelReadiness?: ProductLevelReadiness; // NEW: Global mode data
  catalogStats?: {
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;
    readyCount: number;
  };
  evaluationTimestamp: string;
  rulesVersion: number;
}

// NEW interface for global mode
export interface ProductLevelReadiness {
  aggregatedCompletionPct: number;
  segmentScores: SegmentScore[];
  missingGlobalAttributes: string[];
  websiteOptional: boolean;
  sitesEvaluated: string[];
  blockingSegments: string[];
}

export interface SegmentScore {
  segmentId: string;
  segmentName: string;
  score: number;
  weightPct: number;
  missingAttributes: string[];
}
```

**Test:** Compile TypeScript (no runtime changes yet).

---

#### Step 1.2: Add Mode Detection Function
**Location:** After L649 (end of file)

**Pseudocode:**
```typescript
/**
 * Detect export mode for tenant (GLOBAL vs SITE_SCOPED)
 * Reads from settings/exportSettings/mode
 * Defaults to SITE_SCOPED if not configured
 */
async function detectExportMode(tenantId?: string): Promise<'GLOBAL' | 'SITE_SCOPED'> {
  try {
    // Query Firestore: /settings/{tenantId}/exportSettings/mode
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

**Dependencies:** Requires `admin.firestore()` from Firebase Admin SDK (already imported).

**Test:** Unit test with mock Firestore returning `{ mode: 'GLOBAL' }` → expect `'GLOBAL'`.

---

#### Step 1.3: Add Product-Level Aggregation Logic
**Location:** After detectExportMode function

**Pseudocode:**
```typescript
/**
 * Aggregate product-level readiness across all sites (GLOBAL mode)
 * Evaluates all sites product is associated with, computes weighted average
 * Excludes Description/SEO site-specific blocking (global attributes only)
 */
async function aggregateProductLevelReadiness(
  product: ProductDocument,
  completionRules: CompletionRulesConfig,
  attributeRegistry: AttributeRegistry,
  evaluationTimestamp: string
): Promise<ProductLevelReadiness> {
  
  // Extract ALL sites product is associated with
  const allSites = extractAllProductSites(product);
  
  // If no sites → website is OPTIONAL per Lisa's Option 1 decision
  const sitesEvaluated = allSites.length > 0 ? allSites : ['__GLOBAL__'];
  
  // Evaluate completion for each site (ignoring site-specific Description/SEO)
  const segmentScoresPerSite: SegmentScore[][] = [];
  
  for (const site of sitesEvaluated) {
    const productSnapshot = convertToProductSnapshot(product);
    const completionResult = evaluateCompletion(
      productSnapshot,
      [site], // Single-site eval
      attributeRegistry,
      completionRules,
      evaluationTimestamp
    );
    
    // Filter to global attributes only (exclude site-specific Description/SEO)
    const globalSegments = completionResult.segmentResults.filter(
      seg => seg.segmentId !== 'description-seo' // Exclude site-blocking segment
    );
    
    segmentScoresPerSite.push(globalSegments.map(seg => ({
      segmentId: seg.segmentId,
      segmentName: seg.segmentName,
      score: seg.score,
      weightPct: seg.weightPct,
      missingAttributes: seg.missingAttributes
    })));
  }
  
  // Aggregate: Take BEST score per segment across all sites
  const segmentScoresAggregated = aggregateSegmentScores(segmentScoresPerSite);
  
  // Calculate weighted average completion
  const totalWeight = segmentScoresAggregated.reduce((sum, seg) => sum + seg.weightPct, 0);
  const weightedSum = segmentScoresAggregated.reduce((sum, seg) => sum + (seg.score * seg.weightPct / 100), 0);
  const aggregatedCompletionPct = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
  
  // Collect all missing attributes across segments
  const missingGlobalAttributes = Array.from(
    new Set(
      segmentScoresAggregated.flatMap(seg => seg.missingAttributes)
    )
  ).sort();
  
  // Identify blocking segments (score < 100%)
  const blockingSegments = segmentScoresAggregated
    .filter(seg => seg.score < 100)
    .map(seg => seg.segmentId);
  
  return {
    aggregatedCompletionPct,
    segmentScores: segmentScoresAggregated,
    missingGlobalAttributes,
    websiteOptional: allSites.length === 0, // True if no sites present
    sitesEvaluated,
    blockingSegments
  };
}

/**
 * Aggregate segment scores: take BEST score per segment across sites
 */
function aggregateSegmentScores(scoresPerSite: SegmentScore[][]): SegmentScore[] {
  const segmentMap = new Map<string, SegmentScore>();
  
  for (const siteScores of scoresPerSite) {
    for (const score of siteScores) {
      const existing = segmentMap.get(score.segmentId);
      if (!existing || score.score > existing.score) {
        segmentMap.set(score.segmentId, score);
      }
    }
  }
  
  return Array.from(segmentMap.values());
}

/**
 * Extract ALL sites product is associated with (not just selected)
 */
function extractAllProductSites(product: ProductDocument): string[] {
  // Use same precedence as extractSelectedSites but don't require non-empty
  const sites = extractSelectedSites(product);
  return sites;
}
```

**Dependencies:**
- `extractSelectedSites()` (already exists at L426-450)
- `evaluateCompletion()` (already imported from completionEvaluationEngine)

**Test:** Mock product with 2 sites → verify BEST score per segment selected.

---

#### Step 1.4: Modify Main Evaluation Function
**File:** [packages/api/src/services/completionDrivenExportReadiness.ts:L300-376](packages/api/src/services/completionDrivenExportReadiness.ts#L300-L376)

**Current Signature (L300):**
```typescript
export async function calculateCompletionDrivenExportReadiness(
  product?: ProductDocument,
  forceRulesRefresh = false,
  evaluatedAt?: string
): Promise<CompletionDrivenExportReadiness>
```

**Target: Add optional tenantId parameter (backward compatible):**
```typescript
export async function calculateCompletionDrivenExportReadiness(
  product?: ProductDocument,
  forceRulesRefresh = false,
  evaluatedAt?: string,
  tenantId?: string // NEW: For mode detection
): Promise<CompletionDrivenExportReadiness>
```

**Logic Modification (L320-376 → ADD mode branching):**
```typescript
// BEFORE line 323 (after loading rules/registry):
const exportMode = await detectExportMode(tenantId);

// BRANCH: GLOBAL mode path
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
    hasBlockingSites: false, // No site blocking in GLOBAL mode
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

// ELSE: SITE_SCOPED mode (existing logic unchanged)
// ... existing code from L323-376 ...
```

**New Helper Function:**
```typescript
function generateGlobalOperatorExplanation(
  productReadiness: ProductLevelReadiness,
  rules: CompletionRulesConfig
): OperatorExplanation {
  const isReady = productReadiness.aggregatedCompletionPct >= rules.exportUnlockThresholdPct;
  
  return {
    summary: isReady 
      ? `Export ready: product ${productReadiness.aggregatedCompletionPct}% complete (GLOBAL mode)`
      : `Export blocked: product ${productReadiness.aggregatedCompletionPct}% complete (threshold: ${rules.exportUnlockThresholdPct}%)`,
    blockingIssues: isReady ? [] : [
      `Product completion ${productReadiness.aggregatedCompletionPct}% below threshold ${rules.exportUnlockThresholdPct}%`,
      ...productReadiness.blockingSegments.map(seg => `Segment ${seg} incomplete`)
    ],
    completionBreakdown: productReadiness.segmentScores,
    siteStatus: [], // Empty in GLOBAL mode
    actionRequired: isReady ? [] : [
      `Complete missing attributes: ${productReadiness.missingGlobalAttributes.join(', ')}`
    ]
  };
}
```

**Rollback:** Remove `exportMode` detection line, restore original L323-376 code.

**Test:** 
- GLOBAL mode: Product 85% complete, threshold 80% → `ready: true`, `mode: "GLOBAL"`
- SITE_SCOPED mode: Existing tests should pass unchanged

---

### 2.2 Phase 2: UI Conditional Rendering

**File:** [packages/web/src/pages/ExportPage.tsx](packages/web/src/pages/ExportPage.tsx)

#### Step 2.1: Add Mode State
**Lines to Modify:** L18-20 (state declarations)

**Current Code (L18-20):**
```tsx
const [exporting, setExporting] = useState(false);
const [selectedSite, setSelectedSite] = useState('ropi-web');
const [selectedFormat, setSelectedFormat] = useState('csv');
```

**Target Code (ADD mode state):**
```tsx
const [exporting, setExporting] = useState(false);
const [selectedSite, setSelectedSite] = useState('ropi-web');
const [selectedFormat, setSelectedFormat] = useState('csv');
const [exportMode, setExportMode] = useState<'GLOBAL' | 'SITE_SCOPED' | null>(null); // NEW
const [modeLoading, setModeLoading] = useState(true); // NEW
```

---

#### Step 2.2: Fetch Export Mode on Mount
**Location:** After existing useEffect for completion (NEW useEffect)

**Target Code:**
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
        console.warn('Failed to fetch export config, defaulting to SITE_SCOPED');
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

**Dependencies:** Requires new API endpoint `/api/admin/exports/config` (created in Phase 2.3).

---

#### Step 2.3: Conditional Dropdown Rendering
**Lines to Modify:** L169-189 (site dropdown rendering)

**Current Code (L169-189):**
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

**Target Code (CONDITIONAL rendering):**
```tsx
<div className="export-controls">
  {/* Only show site selector in SITE_SCOPED mode */}
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
  
  {/* Show mode indicator in GLOBAL mode */}
  {exportMode === 'GLOBAL' && (
    <div className="mode-indicator">
      <span className="badge">🌍 Global Export Mode</span>
      <span className="help-text">Product-level evaluation (site-independent)</span>
    </div>
  )}
  
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

**Rollback:** Remove conditional wrapper, restore original L169-189.

**Test:** 
- GLOBAL mode: Dropdown hidden, badge visible
- SITE_SCOPED mode: Dropdown visible, badge hidden

---

#### Step 2.4: Modify Export Request Body
**Lines to Modify:** L36-42 (export POST request)

**Current Code (L36-42):**
```tsx
body: JSON.stringify({
  site: selectedSite,
  format: selectedFormat,
  limit: 100,
  includeMeta: true,
}),
```

**Target Code (CONDITIONAL site parameter):**
```tsx
body: JSON.stringify({
  ...(exportMode === 'SITE_SCOPED' && { site: selectedSite }), // Only include site in SITE_SCOPED mode
  format: selectedFormat,
  limit: 100,
  includeMeta: true,
}),
```

**Rollback:** Remove spread conditional, restore `site: selectedSite`.

**Test:** 
- GLOBAL mode: Request body has NO `site` field
- SITE_SCOPED mode: Request body has `site: "ropi-web"`

---

### 2.3 Phase 3: API Endpoint for Config

**New File:** `packages/api/src/routes/exportConfigRoutes.ts`

**Full Code:**
```typescript
import { Router } from 'express';
import { detectExportMode } from '../services/completionDrivenExportReadiness';

const router = Router();

/**
 * GET /api/admin/exports/config
 * Returns export configuration for current tenant
 */
router.get('/api/admin/exports/config', async (req, res) => {
  try {
    // Extract tenantId from authenticated user context
    const tenantId = req.user?.tenantId; // Assumes auth middleware populates req.user
    
    const mode = await detectExportMode(tenantId);
    
    res.json({
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ExportConfig] Failed to fetch config:', error);
    res.status(500).json({
      error: 'Failed to fetch export configuration',
      mode: 'SITE_SCOPED' // Fallback
    });
  }
});

export default router;
```

**Integration:** Add to main API server (e.g., `packages/api/src/index.ts`):
```typescript
import exportConfigRoutes from './routes/exportConfigRoutes';
app.use(exportConfigRoutes);
```

**Test:** `GET /api/admin/exports/config` → `{ "mode": "GLOBAL" }` when Firestore config = GLOBAL.

---

### 2.4 Phase 4: Product Classification Segment

**File:** Firestore collection `settings/{tenantId}/completionRules/config`

**Current State (from HES A):**
- Classification attributes (category, class, department) marked `required_for_completion: true` in registry
- Segment config likely excludes `classification` category (L353 in completionEvaluationEngine.ts filters by `selector.categories[]`)

**Target: Add classification segment to Firestore config**

**Firestore Document Update:**
```json
{
  "rulesVersion": 2,
  "exportUnlockThresholdPct": 80,
  "segments": [
    {
      "id": "core-attributes",
      "name": "Core Product Attributes",
      "weightPct": 50,
      "enabled": true,
      "ruleType": "ALL_REQUIRED",
      "attributeSelector": {
        "categories": ["product", "general"],
        "requirementFlag": "completionRequired",
        "excludeAttributeIds": [],
        "includeInternalOnly": false
      }
    },
    {
      "id": "description-seo",
      "name": "Description & SEO",
      "weightPct": 30,
      "enabled": true,
      "ruleType": "ALL_SITES_REQUIRED",
      "attributeSelector": {
        "categories": ["description", "seo"],
        "requirementFlag": "completionRequired",
        "excludeAttributeIds": [],
        "includeInternalOnly": false
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
  ]
}
```

**Script to Apply (Firestore CLI or Admin SDK):**
```javascript
// apply_classification_segment.js
const admin = require('firebase-admin');
admin.initializeApp();

async function applyClassificationSegment(tenantId = 'default') {
  const docRef = admin.firestore()
    .collection('settings')
    .doc(tenantId)
    .collection('completionRules')
    .doc('config');
  
  await docRef.update({
    'segments': admin.firestore.FieldValue.arrayUnion({
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
    }),
    rulesVersion: admin.firestore.FieldValue.increment(1)
  });
  
  console.log('✅ Classification segment applied');
}

applyClassificationSegment().catch(console.error);
```

**Rollback:** Set `enabled: false` on product-classification segment.

**Test:** Query product completion → verify category/class/department now contribute 20% to score.

---

## 3. Integration Points Summary

| Component | File Path | Lines | Change Type | Backward Compat |
|-----------|-----------|-------|-------------|-----------------|
| **Backend API** | [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) | L33-51, L300-376, L649+ | Extend interface, add mode detection, branching logic | ✅ Mode optional |
| **Completion Engine** | [packages/api/src/services/completionEvaluationEngine.ts](packages/api/src/services/completionEvaluationEngine.ts) | L336-370 | No changes (used as-is for GLOBAL) | ✅ |
| **Frontend Page** | [packages/web/src/pages/ExportPage.tsx](packages/web/src/pages/ExportPage.tsx) | L18-20, L36-42, L169-189 | Add mode state, conditional rendering, optional site param | ✅ Graceful fallback |
| **Frontend Component** | [packages/web/src/components/product/CompletionExportGatePanel.tsx](packages/web/src/components/product/CompletionExportGatePanel.tsx) | L200-227 | Add mode badge, hide siteStatus in GLOBAL | ✅ Conditional render |
| **API Routes** | `packages/api/src/routes/exportConfigRoutes.ts` | NEW | Create /api/admin/exports/config endpoint | ✅ New endpoint |
| **Firestore Config** | `settings/{tenant}/exportSettings/config` | Firestore | Add `mode: "GLOBAL"` field | ✅ Defaults to SITE_SCOPED |
| **Completion Rules** | `settings/{tenant}/completionRules/config` | Firestore | Add product-classification segment | ✅ Can enable/disable |

---

## 4. Runtime Examples

### 4.1 Current Behavior (SITE_SCOPED)

**API Request:**
```bash
GET /api/products/18/completion
```

**Response (Product with 2 sites, Description missing on ropi-app):**
```json
{
  "mode": "SITE_SCOPED",
  "ready": false,
  "completionPct": 0,
  "threshold": 80,
  "hasBlockingSites": true,
  "blockingReasons": [
    {
      "type": "SITE_DESCRIPTION_SEO_MISSING",
      "severity": "BLOCKING",
      "message": "Site ropi-app missing required Description/SEO attributes",
      "details": {
        "site": "ropi-app",
        "missingAttributes": ["description", "seo_title"]
      }
    }
  ],
  "operatorExplanation": {
    "summary": "Export blocked: missing Description/SEO attributes for ropi-app",
    "siteStatus": [
      { "site": "ropi-web", "blocked": false },
      { "site": "ropi-app", "blocked": true, "reason": "Missing description, seo_title" }
    ]
  }
}
```

**UI Behavior:**
- Site dropdown visible
- Completion gauge shows 0%
- "Export blocked" badge with per-site accordion

---

### 4.2 Target Behavior (GLOBAL)

**API Request:**
```bash
GET /api/products/18/completion
```

**Response (Same product, GLOBAL mode):**
```json
{
  "mode": "GLOBAL",
  "ready": true,
  "completionPct": 85,
  "threshold": 80,
  "hasBlockingSites": false,
  "blockingReasons": [],
  "productLevelReadiness": {
    "aggregatedCompletionPct": 85,
    "segmentScores": [
      { "segmentId": "core-attributes", "segmentName": "Core Product Attributes", "score": 100, "weightPct": 50, "missingAttributes": [] },
      { "segmentId": "product-classification", "segmentName": "Product Classification", "score": 67, "weightPct": 20, "missingAttributes": ["department"] }
    ],
    "missingGlobalAttributes": ["department"],
    "websiteOptional": false,
    "sitesEvaluated": ["ropi-web", "ropi-app"],
    "blockingSegments": ["product-classification"]
  },
  "operatorExplanation": {
    "summary": "Export ready: product 85% complete (GLOBAL mode)",
    "completionBreakdown": [
      { "segmentId": "core-attributes", "score": 100, "weightPct": 50, "missingAttributes": [] },
      { "segmentId": "product-classification", "score": 67, "weightPct": 20, "missingAttributes": ["department"] }
    ],
    "siteStatus": []
  }
}
```

**UI Behavior:**
- Site dropdown HIDDEN
- "🌍 Global Export Mode" badge visible
- Completion gauge shows 85%
- "Export ready" badge (no per-site accordion)
- Missing attributes: "department" (global list)

---

## 5. File/Line Citation Index

All implementation assertions reference exact code locations:

| Assertion | File Path | Lines |
|-----------|-----------|-------|
| Per-site state management | [packages/web/src/pages/ExportPage.tsx](packages/web/src/pages/ExportPage.tsx) | L20, L169-189 |
| Site extraction logic | [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) | L426-450 |
| Site-empty blocking | [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) | L330-336 |
| Completion evaluation entry | [packages/api/src/services/completionEvaluationEngine.ts](packages/api/src/services/completionEvaluationEngine.ts) | L79-126 |
| Attribute category filtering | [packages/api/src/services/completionEvaluationEngine.ts](packages/api/src/services/completionEvaluationEngine.ts) | L336-370 |
| Export API interface | [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) | L33-51 |
| Main evaluation function | [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) | L300-376 |
| Site-status generation | [packages/api/src/services/completionDrivenExportReadiness.ts](packages/api/src/services/completionDrivenExportReadiness.ts) | L547-580 |
| UI per-site accordion | [packages/web/src/components/product/CompletionExportGatePanel.tsx](packages/web/src/components/product/CompletionExportGatePanel.tsx) | L200-227 |

---

## 6. Constraints & Governance

1. **NO Breaking Changes:** All existing clients receive `mode: "SITE_SCOPED"` by default
2. **Tenant-Scoped:** Feature flag via Firestore `settings/{tenant}/exportSettings/mode`
3. **Instant Rollback:** Set `mode: "SITE_SCOPED"` in Firestore → UI/API revert immediately
4. **Backward Compat:** Clients not checking `mode` field continue working unchanged
5. **Website Optional:** Per Lisa's Option 1 decision, products without website field are NOT blocked in GLOBAL mode

---

## 7. Next Steps

- **Phase 1:** Implement API contract extension + mode detection (backend only, no UI changes)
- **Phase 2:** Add UI conditional rendering (requires Phase 1 deployed)
- **Phase 3:** Deploy `/api/admin/exports/config` endpoint
- **Phase 4:** Enable product-classification segment in Firestore
- **Phase 5:** Cleanup deprecated per-site UI code (after 30-day transition period)

See [migration-plan.md](migration-plan.md) for detailed phasing and rollback procedures.

---

**Document Status:** ✅ Ready for Implementation  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** migration-plan.md
