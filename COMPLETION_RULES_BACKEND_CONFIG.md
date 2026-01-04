# Completion Rules Backend Configuration

**Authoritative Specification**  
**LP-completion-model-export-gate-1.0.0**  
**Canonical Source of Truth for Backend Behavior**

---

## Purpose

This document defines the **authoritative backend configuration schema** for Completion Rules, which drive the export gate evaluation engine. It eliminates ambiguity, defaults, and inferred logic by documenting **actual behavior as implemented**.

**Scope:**
- Configuration schema stored in `settings/exportSettings/completionRules`
- Backend services that read, validate, and enforce completion rules
- Completion evaluation engine behavior and semantics

**Explicit Non-Scope:**
- UI behavior (see `COMPLETION_RULES_UI_SPEC.md`)
- Future features or placeholders
- Default values (prohibited by governance)

---

## Configuration Storage

**Firestore Path:**
```
settings/exportSettings/completionRules
```

**Document Type:** Single JSON document  
**Access:** Read by backend services, written by admin UI  
**Versioning:** Immutable snapshots stored in `completionRulesVersions/{version}` subcollection

---

## Configuration Schema

### Top-Level Configuration

```typescript
interface CompletionRulesConfig {
  schemaVersion: string;                    // e.g., "1.0"
  rulesVersion: number;                      // Integer version counter
  updatedAt: string;                         // ISO 8601 timestamp
  updatedBy: string;                         // User identifier
  exportUnlockThresholdPct: number;          // 0-100, completion threshold for export
  segments: SegmentConfig[];                 // Array of completion segments
  builtInSegments: Record<string, BuiltInSegmentConfig>;  // Built-in segment metadata
  exclusions: {
    media: ExclusionConfig;
    pricing: ExclusionConfig;
  };
}
```

### Segment Configuration

Each segment represents a category of attributes that contribute to overall completion.

```typescript
interface SegmentConfig {
  id: string;                                // Unique segment identifier
  name: string;                              // Display name
  enabled: boolean;                          // Whether segment affects completion
  weightPct: number;                         // 0-100, contribution to total completion
  ruleType: 'ALL_REQUIRED' | 'ANY_REQUIRED'; // Evaluation logic
  appliesTo: {
    mode: 'ALL_PRODUCTS' | 'CONDITIONAL';   // Applicability scope
    sites: string[];                         // Site identifiers (empty = all sites)
  };
  attributeSelector: AttributeSelectorConfig;
}
```

**Validation Rules:**
- `id` must be unique across all segments
- `name` must not be empty
- `weightPct` must be 0-100
- Enabled segments' `weightPct` must sum to exactly 100%
- `ruleType` determines evaluation:
  - `ALL_REQUIRED`: All attributes in segment must be present (AND logic)
  - `ANY_REQUIRED`: At least one attribute must be present (OR logic)

### Attribute Selector Configuration

Defines how attributes are selected for a segment.

```typescript
interface AttributeSelectorConfig {
  source: 'REGISTRY' | 'STATIC';            // Attribute selection method
  categories?: string[];                     // Registry categories to include (REGISTRY only)
  requirementFlag: string;                   // Registry flag to filter by (e.g., 'required_for_completion')
  siteAware: boolean;                        // If true, checks site-specific attributes (e.g., title_us, title_uk)
  includeInternalOnly: boolean;              // If true, includes internal-only attributes
  excludeAttributeIds: string[];             // Explicit exclusion list
  staticAttributeIds?: string[];             // Explicit attribute list (STATIC only)
}
```

**Behavior:**

**REGISTRY Mode:**
1. Load attributes from registry
2. Filter by `categories` (if provided)
3. Filter by `requirementFlag` (attribute must have this flag set to true)
4. Apply `siteAware` logic:
   - If `true`: Expect site-suffixed attributes (e.g., `title_us`, `title_uk`)
   - If `false`: Expect site-agnostic attributes (e.g., `weight`, `dimensions`)
5. Exclude attributes in `excludeAttributeIds`
6. Filter out internal-only attributes unless `includeInternalOnly = true`

**STATIC Mode:**
- Use explicit list from `staticAttributeIds`
- `categories`, `requirementFlag`, and `siteAware` are ignored

**Site-Aware Blocking Semantics:**
- When `siteAware = true` and product has selected sites `['us', 'uk']`:
  - Engine checks for `title_us`, `title_uk`, etc.
  - If **any site** is missing required attributes → product is **export blocked**
  - Completion percentage is forced to **0%**
- This implements "Description/SEO blocking" logic (highest priority gate)

### Built-In Segment Configuration

```typescript
interface BuiltInSegmentConfig {
  segmentId: string;                        // References segment in segments array
  lockedSemantics: boolean;                 // If true, segment logic cannot be modified
}
```

**Purpose:** Flags segments that have special governance-enforced behavior (e.g., Description/SEO segment with site-aware blocking).

### Exclusion Configuration

```typescript
interface ExclusionConfig {
  affectsCompletion: boolean;               // If false, attributes in this category never block export
  reason: string;                            // Human-readable governance reason
}
```

**Current Exclusions:**
- **Media:** `affectsCompletion: false` — Images/videos never block export
- **Pricing:** `affectsCompletion: false` — Price attributes never block export

---

## Validation Rules

### Structural Validation

Performed by `validateCompletionRulesConfig()`:

1. **Schema Version:** Must be present and non-empty
2. **Rules Version:** Must be a positive integer
3. **Threshold:** `exportUnlockThresholdPct` must be 0-100
4. **Segments:**
   - At least one segment must exist
   - Each segment must have `id`, `name`, `ruleType`
   - `weightPct` must be 0-100
   - `ruleType` must be `'ALL_REQUIRED'` or `'ANY_REQUIRED'`
   - `appliesTo.sites` must be an array
   - `attributeSelector` must be present

### Weight Distribution Validation

- Sum of `weightPct` for **enabled segments only** must equal 100% (tolerance: ±0.1%)
- Disabled segments do not contribute to completion calculation

### Attribute Selector Validation

- If `source = 'REGISTRY'`:
  - `requirementFlag` must be specified
  - `categories` is optional (omitting means "all categories")
- If `source = 'STATIC'`:
  - `staticAttributeIds` must be present and non-empty

---

## Completion Evaluation Behavior

### Segment Evaluation

For each enabled segment:

1. **Attribute Resolution:**
   - Load attributes based on `attributeSelector`
   - Apply site-aware expansion if `siteAware = true`

2. **Presence Check:**
   - For each required attribute, check if present in product
   - `ruleType = 'ALL_REQUIRED'`: Score = (present count / total required) * 100
   - `ruleType = 'ANY_REQUIRED'`: Score = (any present ? 100 : 0)

3. **Weighted Score:**
   - Segment contribution = (segment score * weightPct) / 100

### Overall Completion Calculation

```
totalCompletionPct = Σ (segment.score * segment.weightPct) / 100
```

**Example:**
- Segment A: 80% complete, 60% weight → contributes 48%
- Segment B: 100% complete, 40% weight → contributes 40%
- Total: 88% completion

### Export Blocking Logic

**Priority Order:**

1. **Site Blocking (Highest Priority):**
   - If **any** site-aware segment has missing attributes for **any** selected site
   - → `hasBlockingSites = true`
   - → `completionPct = 0` (forced to zero)
   - → Export **blocked**

2. **Threshold Blocking (Secondary):**
   - If no site blocking AND `totalCompletionPct < exportUnlockThresholdPct`
   - → Export **blocked**

3. **Export Ready:**
   - No site blocking AND `totalCompletionPct >= exportUnlockThresholdPct`
   - → Export **allowed**

### Catalog-Level Evaluation

When evaluating entire catalog (no product specified):

1. Query all products (deterministic ordering: `orderBy('id').limit(1000)`)
2. Evaluate each product individually
3. **Conservative Policy:** ANY product blocked → entire export blocked
4. Report minimum completion percentage across all products
5. Aggregate blocking reasons (sample first 5 for operator visibility)

**No Averaging:**
- ❌ FORBIDDEN: `avgCompletion = sum(completionPct) / productCount`
- ✅ REQUIRED: `minCompletion = min(productCompletionPct)`

---

## Service Layer Interface

### Primary Functions

```typescript
// Load active completion rules from Firestore
async function loadCompletionRules(
  forceLatest: boolean = false
): Promise<CompletionRulesConfig>

// Load specific version from versioned storage
async function loadCompletionRulesVersion(
  rulesVersion: number
): Promise<CompletionRulesConfig>
```

### Evaluation Function

```typescript
// Evaluate product or catalog-level completion
async function calculateCompletionDrivenExportReadiness(
  product?: ProductDocument,
  forceRulesRefresh: boolean = false,
  evaluatedAt?: string
): Promise<CompletionDrivenExportReadiness>
```

**Return Type:**
```typescript
interface CompletionDrivenExportReadiness {
  ready: boolean;                           // Export allowed?
  completionPct: number;                    // Overall completion (0 if site-blocked)
  threshold: number;                        // Threshold from config
  hasBlockingSites: boolean;                // Site blocking active?
  blockingReasons: ExportBlockingReason[];  // Detailed blocking info
  operatorExplanation: OperatorExplanation; // Human-readable guidance
  catalogStats?: {                          // Catalog-level only
    totalProducts: number;
    blockedByCompletionCount: number;
    blockedBySiteCount: number;
    readyCount: number;
  };
  evaluationTimestamp: string;              // ISO 8601
  rulesVersion: number;                     // Version used for evaluation
}
```

---

## Invariants and Prohibitions

### Required Invariants

1. **No Defaults:**
   - All configuration values must be explicit
   - No hard-coded fallbacks in backend services
   - No implicit "reasonable defaults"

2. **Deterministic Evaluation:**
   - Same config + same product → always same result
   - Catalog queries use explicit ordering and limits
   - Timestamps can be injected for deterministic testing

3. **Single Canonical Gate:**
   - Site blocking takes absolute precedence
   - No "hidden" threshold checks when site-blocked
   - Completion percentage forced to 0 when site-blocked

4. **Settings-Driven:**
   - All behavior controlled by Firestore document
   - Code implements document semantics, never overrides
   - Registry is data source, not logic source

### Prohibited Patterns

1. ❌ Averaging completion across products (use minimum)
2. ❌ Default completion rules in code (must be in Firestore)
3. ❌ Multiple concurrent threshold checks (single canonical gate)
4. ❌ Implicit site selection (sites must be explicit in product)
5. ❌ Hard-coded category exclusions (use `exclusions` config)

---

## File References

**Backend Implementation:**
- `/packages/api/src/services/completionRulesService.ts` — Configuration loading and validation
- `/packages/api/src/services/completionDrivenExportReadiness.ts` — Export gate enforcement
- `/packages/api/src/endpoints/export.ts` — Export boundary enforcement (423 responses)

**Tests:**
- `/packages/api/src/services/completionDrivenExportReadiness.test.ts` — Unit tests with exact fixtures

**Contracts:**
- `/CATALOG_LEVEL_EXPORT_READINESS_CONTRACT.md` — Conservative blocking policy
- `/GOVERNANCE_VERIFICATION_FINAL.md` — PR #430 governance compliance audit

---

## Change History

| Version | Date | Change |
|---------|------|--------|
| 1.0.0 | 2026-01-04 | Initial authoritative documentation (LP-completion-model-export-gate-1.0.0) |

---

## Governance Compliance

This document satisfies LP acceptance criteria:

- ✅ Matches existing backend behavior exactly
- ✅ Eliminates ambiguity and defaults
- ✅ Prohibits hard-coded logic
- ✅ Documents all invariants and semantics
- ✅ Provides complete schema with validation rules
- ✅ Serves as single source of truth for backend

**No code changes are permitted under this LP.**
