# Target Contract — RetailOps GLOBAL Export Mode API

**LP:** LP-export-global-1.0.0 HES B  
**Version:** 1.0.0  
**Date:** 2026-01-06  
**Status:** Design Contract (Authoritative)

---

## Overview

This document defines the **exact API contract** for RetailOps GLOBAL export mode. This contract is authoritative and must be implemented precisely as specified.

**Key decision:** Website is **optional** in GLOBAL mode (Lisa's Option 1 accepted).

---

## API Endpoints

### 1. Product Completion API

**Endpoint:** `GET /api/products/:id/completion`  
**Auth:** Admin or product owner  
**Response Type:** `application/json`

### 2. Export Readiness API (Catalog-Level)

**Endpoint:** `GET /api/admin/exports/readiness`  
**Auth:** Admin  
**Response Type:** `application/json`

---

## Response Schema (GLOBAL Mode)

### TypeScript Interface

```typescript
interface CompletionDrivenExportReadiness {
  // NEW: Mode indicator (required)
  mode: "GLOBAL" | "SITE_SCOPED";
  
  // NEW: Product-level readiness (primary field for GLOBAL mode)
  productLevelReadiness: {
    ready: boolean;
    completionPct: number;           // 0-100
    threshold: number;                // e.g., 80
    blockingReasons: string[];        // Human-readable blocking reasons
    missingAttributes: string[];      // Attribute IDs missing
    operatorExplanation: {
      summary: string;
      completionBreakdown: Array<{
        segmentId: string;
        segmentName: string;
        score: number;                // 0-100
        weightPct: number;
        missingAttributes: string[];
      }>;
    };
  };
  
  // EXISTING: Top-level fields (backward compatibility)
  ready: boolean;                     // Derived from productLevelReadiness.ready in GLOBAL
  completionPct: number;              // Same as productLevelReadiness.completionPct in GLOBAL
  threshold: number;
  hasBlockingSites: boolean;          // Always false in GLOBAL mode
  blockingReasons: Array<{            // Mapped from productLevelReadiness.blockingReasons
    type: string;
    severity: string;
    message: string;
    details: Record<string, unknown>;
  }>;
  
  // EXISTING: Operator explanation (extended)
  operatorExplanation: {
    summary: string;
    mode: "GLOBAL" | "SITE_SCOPED";  // Redundant for clarity
    blockingIssues: string[];
    completionBreakdown: Array<{      // Same as productLevelReadiness.operatorExplanation.completionBreakdown
      segmentId: string;
      segmentName: string;
      score: number;
      weightPct: number;
      missingAttributes: string[];
    }>;
    siteStatus?: Array<{              // Empty or omitted in GLOBAL mode
      site: string;
      blocked: boolean;
      reason?: string;
      missingAttributes?: string[];
    }>;
    actionRequired: string[];
  };
  
  // EXISTING: Metadata
  evaluationTimestamp: string;        // ISO 8601
  rulesVersion: number;
  
  // OPTIONAL: Catalog stats (catalog-level API only)
  catalogStats?: {
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;       // Always 0 in GLOBAL mode
    readyCount: number;
  };
}
```

---

## Field Semantics

### mode: "GLOBAL" | "SITE_SCOPED"

**Type:** `string` (enum)  
**Required:** Yes  
**Default:** None (must be explicitly set)

**Semantics:**
- `"GLOBAL"`: Product-level readiness only. `siteStatus[]` is empty or omitted. UI renders product-level export flow.
- `"SITE_SCOPED"`: Per-site evaluation. `siteStatus[]` is populated. UI renders per-site export options.

**Determination logic:**
```typescript
if (tenant.exportMode === "GLOBAL") {
  response.mode = "GLOBAL";
} else {
  response.mode = "SITE_SCOPED";
}
```

**Tenant configuration:**
```json
{
  "tenantId": "retailops",
  "exportMode": "GLOBAL"
}
```

---

### productLevelReadiness

**Type:** `object`  
**Required:** Yes (always present, even in SITE_SCOPED mode for future compatibility)  
**Purpose:** Primary readiness field for GLOBAL mode

#### productLevelReadiness.ready

**Type:** `boolean`  
**Semantics:** `true` if product is export-ready based on product-level attributes only

**Calculation (GLOBAL mode):**
```typescript
const productLevelCompletion = calculateProductLevelCompletion(product, registry, rules);
const ready = productLevelCompletion >= rules.exportUnlockThresholdPct;
```

**Calculation excludes:**
- Site-specific attributes (e.g., `description_ropi_web`, `seo_title_shiekh`)
- Segments with `siteAware: true`
- Segments with `appliesTo.mode === "CONDITIONAL"` where sites don't match

**Calculation includes:**
- Core attributes (sku, mpn, name, brand)
- Classification attributes (category, class, department)
- Identity/demographic attributes (gender, age_group)
- Physical attributes (primary_color, descriptive_color, material, fit)
- Product-level segments only (`siteAware: false` and `appliesTo.mode === "ALL_PRODUCTS"`)

#### productLevelReadiness.completionPct

**Type:** `number`  
**Range:** 0-100  
**Semantics:** Product-level completion percentage

**Calculation:**
```typescript
const productLevelSegments = segments.filter(s => 
  s.enabled && 
  !s.attributeSelector.siteAware && 
  (s.appliesTo.mode === "ALL_PRODUCTS" || s.appliesTo.mode === "CONDITIONAL" && modeIsGlobal)
);

const weightedScore = productLevelSegments.reduce((sum, segment) => {
  const segmentScore = calculateSegmentScore(product, segment, registry);
  return sum + (segmentScore * segment.weightPct / 100);
}, 0);

productLevelReadiness.completionPct = Math.round(weightedScore);
```

#### productLevelReadiness.threshold

**Type:** `number`  
**Range:** 0-100  
**Source:** `rules.exportUnlockThresholdPct`

#### productLevelReadiness.blockingReasons

**Type:** `string[]`  
**Semantics:** Human-readable reasons why product is blocked (empty if ready)

**Example:**
```json
[
  "Product completion below threshold (75% vs 80% required)",
  "Missing classification attributes: category, department"
]
```

#### productLevelReadiness.missingAttributes

**Type:** `string[]`  
**Semantics:** Attribute IDs that are missing (empty if ready)

**Example:**
```json
["category", "department", "primary_color"]
```

#### productLevelReadiness.operatorExplanation

**Type:** `object`  
**Purpose:** Detailed breakdown for operator visibility

**Fields:**
- `summary`: One-sentence explanation (e.g., "Product is export-ready (85% complete)")
- `completionBreakdown`: Array of segment scores with missing attributes

---

### siteStatus (SITE_SCOPED mode only)

**Type:** `array` or `undefined`  
**Semantics in GLOBAL mode:** Empty array `[]` or omitted entirely (preferred)

**Semantics in SITE_SCOPED mode:**
```json
[
  {
    "site": "ropi-web",
    "blocked": false
  },
  {
    "site": "shiekh",
    "blocked": true,
    "reason": "Missing site-specific Description/SEO attributes",
    "missingAttributes": ["description_shiekh", "seo_title_shiekh"]
  }
]
```

---

### Backward Compatibility Fields

#### ready (top-level)

**Type:** `boolean`  
**Semantics:** Derived from `productLevelReadiness.ready` in GLOBAL mode

**Calculation:**
```typescript
if (mode === "GLOBAL") {
  response.ready = response.productLevelReadiness.ready;
} else {
  response.ready = !response.hasBlockingSites && completionPct >= threshold;
}
```

#### completionPct (top-level)

**Type:** `number`  
**Semantics:** Same as `productLevelReadiness.completionPct` in GLOBAL mode

#### hasBlockingSites

**Type:** `boolean`  
**Semantics:** Always `false` in GLOBAL mode

---

## Example Responses

### Example 1: Product Ready (GLOBAL Mode)

```json
{
  "mode": "GLOBAL",
  "productLevelReadiness": {
    "ready": true,
    "completionPct": 85,
    "threshold": 80,
    "blockingReasons": [],
    "missingAttributes": [],
    "operatorExplanation": {
      "summary": "Product is export-ready (85% complete)",
      "completionBreakdown": [
        {
          "segmentId": "core-information",
          "segmentName": "Core Information",
          "score": 100,
          "weightPct": 40,
          "missingAttributes": []
        },
        {
          "segmentId": "product-classification",
          "segmentName": "Product Classification",
          "score": 100,
          "weightPct": 20,
          "missingAttributes": []
        },
        {
          "segmentId": "identity-demographic",
          "segmentName": "Identity & Demographic",
          "score": 100,
          "weightPct": 15,
          "missingAttributes": []
        },
        {
          "segmentId": "physical-attributes",
          "segmentName": "Physical Attributes",
          "score": 50,
          "weightPct": 25,
          "missingAttributes": ["fit", "material"]
        }
      ]
    }
  },
  "ready": true,
  "completionPct": 85,
  "threshold": 80,
  "hasBlockingSites": false,
  "blockingReasons": [],
  "operatorExplanation": {
    "summary": "Product is export-ready (85% complete)",
    "mode": "GLOBAL",
    "blockingIssues": [],
    "completionBreakdown": [
      {
        "segmentId": "core-information",
        "segmentName": "Core Information",
        "score": 100,
        "weightPct": 40,
        "missingAttributes": []
      },
      {
        "segmentId": "product-classification",
        "segmentName": "Product Classification",
        "score": 100,
        "weightPct": 20,
        "missingAttributes": []
      },
      {
        "segmentId": "identity-demographic",
        "segmentName": "Identity & Demographic",
        "score": 100,
        "weightPct": 15,
        "missingAttributes": []
      },
      {
        "segmentId": "physical-attributes",
        "segmentName": "Physical Attributes",
        "score": 50,
        "weightPct": 25,
        "missingAttributes": ["fit", "material"]
      }
    ],
    "siteStatus": [],
    "actionRequired": []
  },
  "evaluationTimestamp": "2026-01-06T18:30:00Z",
  "rulesVersion": 5
}
```

### Example 2: Product Blocked (GLOBAL Mode)

```json
{
  "mode": "GLOBAL",
  "productLevelReadiness": {
    "ready": false,
    "completionPct": 65,
    "threshold": 80,
    "blockingReasons": [
      "Product completion below threshold (65% vs 80% required)",
      "Missing classification attributes"
    ],
    "missingAttributes": ["category", "department", "primary_color", "fit"],
    "operatorExplanation": {
      "summary": "Product blocked: 65% complete (threshold: 80%)",
      "completionBreakdown": [
        {
          "segmentId": "core-information",
          "segmentName": "Core Information",
          "score": 100,
          "weightPct": 40,
          "missingAttributes": []
        },
        {
          "segmentId": "product-classification",
          "segmentName": "Product Classification",
          "score": 33,
          "weightPct": 20,
          "missingAttributes": ["category", "department"]
        },
        {
          "segmentId": "identity-demographic",
          "segmentName": "Identity & Demographic",
          "score": 100,
          "weightPct": 15,
          "missingAttributes": []
        },
        {
          "segmentId": "physical-attributes",
          "segmentName": "Physical Attributes",
          "score": 25,
          "weightPct": 25,
          "missingAttributes": ["primary_color", "fit"]
        }
      ]
    }
  },
  "ready": false,
  "completionPct": 65,
  "threshold": 80,
  "hasBlockingSites": false,
  "blockingReasons": [
    {
      "type": "COMPLETION_BELOW_THRESHOLD",
      "severity": "BLOCKING",
      "message": "Product completion below threshold (65% vs 80% required)",
      "details": {
        "currentCompletion": 65,
        "requiredCompletion": 80
      }
    },
    {
      "type": "REQUIRED_ATTRIBUTE_MISSING",
      "severity": "BLOCKING",
      "message": "Missing classification attributes",
      "details": {
        "missingAttributes": ["category", "department"]
      }
    }
  ],
  "operatorExplanation": {
    "summary": "Product blocked: 65% complete (threshold: 80%)",
    "mode": "GLOBAL",
    "blockingIssues": [
      "Product completion below threshold (65% vs 80%)",
      "Missing classification attributes: category, department"
    ],
    "completionBreakdown": [
      {
        "segmentId": "core-information",
        "segmentName": "Core Information",
        "score": 100,
        "weightPct": 40,
        "missingAttributes": []
      },
      {
        "segmentId": "product-classification",
        "segmentName": "Product Classification",
        "score": 33,
        "weightPct": 20,
        "missingAttributes": ["category", "department"]
      },
      {
        "segmentId": "identity-demographic",
        "segmentName": "Identity & Demographic",
        "score": 100,
        "weightPct": 15,
        "missingAttributes": []
      },
      {
        "segmentId": "physical-attributes",
        "segmentName": "Physical Attributes",
        "score": 25,
        "weightPct": 25,
        "missingAttributes": ["primary_color", "fit"]
      }
    ],
    "siteStatus": [],
    "actionRequired": [
      "Add category attribute",
      "Add department attribute",
      "Add primary_color attribute",
      "Add fit attribute"
    ]
  },
  "evaluationTimestamp": "2026-01-06T18:30:00Z",
  "rulesVersion": 5
}
```

### Example 3: SITE_SCOPED Mode (Backward Compatibility)

```json
{
  "mode": "SITE_SCOPED",
  "productLevelReadiness": {
    "ready": true,
    "completionPct": 85,
    "threshold": 80,
    "blockingReasons": [],
    "missingAttributes": [],
    "operatorExplanation": {
      "summary": "Product-level completion: 85%",
      "completionBreakdown": []
    }
  },
  "ready": false,
  "completionPct": 0,
  "threshold": 80,
  "hasBlockingSites": true,
  "blockingReasons": [
    {
      "type": "SITE_DESCRIPTION_SEO_MISSING",
      "severity": "BLOCKING",
      "message": "Missing site-specific Description/SEO attributes for shiekh",
      "details": {
        "site": "shiekh",
        "missingAttributes": ["description_shiekh", "seo_title_shiekh"]
      }
    }
  ],
  "operatorExplanation": {
    "summary": "Export blocked: site-specific attributes missing",
    "mode": "SITE_SCOPED",
    "blockingIssues": [
      "Missing site-specific Description/SEO attributes for shiekh"
    ],
    "completionBreakdown": [
      {
        "segmentId": "core-information",
        "segmentName": "Core Information",
        "score": 100,
        "weightPct": 30,
        "missingAttributes": []
      },
      {
        "segmentId": "description-seo",
        "segmentName": "Description & SEO",
        "score": 50,
        "weightPct": 40,
        "missingAttributes": ["description_shiekh", "seo_title_shiekh"]
      }
    ],
    "siteStatus": [
      {
        "site": "ropi-web",
        "blocked": false
      },
      {
        "site": "shiekh",
        "blocked": true,
        "reason": "Missing site-specific Description/SEO attributes",
        "missingAttributes": ["description_shiekh", "seo_title_shiekh"]
      }
    ],
    "actionRequired": [
      "Add site-specific description for shiekh",
      "Add SEO title for shiekh"
    ]
  },
  "evaluationTimestamp": "2026-01-06T18:30:00Z",
  "rulesVersion": 5
}
```

---

## Backward Compatibility Notes

### Existing Clients (Pre-GLOBAL Mode)

**Behavior:** Existing clients that don't check `mode` field will continue to work:
- They will read `ready`, `completionPct`, `threshold` (top-level fields)
- In GLOBAL mode, these fields are derived from `productLevelReadiness`
- `siteStatus[]` will be empty in GLOBAL mode, so per-site UI won't render anything (graceful degradation)

**Migration path:** Clients should be updated to check `mode` field and use `productLevelReadiness` when `mode === "GLOBAL"`.

### New Clients (GLOBAL-Aware)

**Behavior:** New clients check `mode` first:
```typescript
if (response.mode === "GLOBAL") {
  const ready = response.productLevelReadiness.ready;
  const pct = response.productLevelReadiness.completionPct;
  // Render product-level UI
} else {
  const siteStatus = response.operatorExplanation.siteStatus;
  // Render per-site UI
}
```

---

## Website Field Behavior (GLOBAL Mode)

**Decision:** Website is **optional** in GLOBAL mode (Lisa's Option 1).

**Semantics:**
- If product has `website` field(s), they are **not checked** for readiness in GLOBAL mode
- `extractSelectedSites()` returns synthetic site `["global"]` if product has no `website` field
- Completion evaluation runs on product-level attributes only (no site-specific checks)

**Impact:**
- Products without `website` field can be export-ready in GLOBAL mode
- Export CSV may include products without site assignment (downstream consumers must handle gracefully)

**Code behavior:**
```typescript
if (mode === "GLOBAL") {
  const sites = product.websites || product.sites || ["global"];
  // Use synthetic site for evaluation, but don't check site-specific attributes
} else {
  const sites = extractSelectedSites(product);
  if (sites.length === 0) {
    return blocked("No sites selected");
  }
}
```

---

## Default Values & Null Handling

**Required fields (never null/undefined):**
- `mode`: Must be `"GLOBAL"` or `"SITE_SCOPED"`
- `productLevelReadiness`: Must be present (even in SITE_SCOPED mode)
- `productLevelReadiness.ready`: Must be `true` or `false`
- `productLevelReadiness.completionPct`: Must be 0-100
- `productLevelReadiness.blockingReasons`: Must be `[]` if ready
- `productLevelReadiness.missingAttributes`: Must be `[]` if ready

**Optional fields:**
- `siteStatus`: May be `[]` or omitted in GLOBAL mode
- `catalogStats`: Only present in catalog-level API

**Null/undefined handling:**
- Never return `null` or `undefined` for required fields
- Empty arrays `[]` preferred over `null`

---

## Summary

**Key contract points:**
1. ✅ `mode` field determines which contract client should consume
2. ✅ `productLevelReadiness` is primary field for GLOBAL mode (always present)
3. ✅ `siteStatus[]` is empty or omitted in GLOBAL mode
4. ✅ Website is optional in GLOBAL mode (product-level readiness only)
5. ✅ Backward compatible: existing clients read top-level `ready`, `completionPct`
6. ✅ Segment filtering: GLOBAL mode excludes `siteAware: true` segments

**Next steps:** Implementation (HES B → implementation LPs) must follow this contract exactly.
