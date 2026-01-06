# Evidence: Completion Logic Source-of-Truth Trace
# LP: LP-export-readiness-diagnostics-1.0.0
# Task: 3 - Completion Logic Source-of-Truth Trace
# Date: 2026-01-06

## Summary

The completion evaluation system has a **clear, layered architecture**:

1. **Settings-driven rules** from Firestore (`settings/exportSettings.completionRules`)
2. **Attribute registry** from Firestore (`settings/attributes/keys/*`)
3. **Pure evaluation engine** that computes completion deterministically
4. **Export readiness service** that wraps evaluation with business rules

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API REQUEST                                        │
│  GET /api/admin/exports/readiness (catalog-level)                           │
│  GET /api/products/{id}/completion (product-level)                          │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  completionDrivenExportReadiness.ts                                          │
│  ─────────────────────────────────────────────────────────────────────────── │
│  calculateCompletionDrivenExportReadiness(product?, forceRulesRefresh?)     │
│                                                                              │
│  1. loadCompletionRules()                                                    │
│  2. loadAttributeRegistryForCompletion()                                     │
│  3. If no product → evaluateCatalogCompletion()                             │
│  4. If product → evaluateCompletion()                                        │
└─────────────────────┬───────────────────────────┬───────────────────────────┘
                      │                           │
                      ▼                           ▼
┌─────────────────────────────────┐  ┌────────────────────────────────────────┐
│  completionRulesService.ts      │  │  exportService.ts                       │
│  ─────────────────────────────  │  │  ────────────────────────────────────── │
│  loadCompletionRules()          │  │  loadExportableAttributes()             │
│                                 │  │                                         │
│  Source: Firestore              │  │  Source: Firestore + SDK                │
│  Path: settings/exportSettings  │  │  Path: settings/attributes/keys/*       │
│  Field: completionRules         │  │  + SDK: attributeRegistry.json          │
└─────────────────────────────────┘  └────────────────────────────────────────┘
                      │                           │
                      ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  completionEvaluationEngine.ts (PURE)                                        │
│  ─────────────────────────────────────────────────────────────────────────── │
│  evaluateCompletion(product, selectedSites, registry, rules, timestamp)     │
│                                                                              │
│  Input:                                                                      │
│  - ProductSnapshot: { productId, attributes, sites }                        │
│  - selectedSites: string[]                                                   │
│  - AttributeRegistry: { [attrId]: AttributeType }                           │
│  - CompletionRulesConfig: { segments, threshold, exclusions }               │
│                                                                              │
│  Output:                                                                     │
│  - totalCompletionPct: number (0-100)                                       │
│  - segmentResults: SegmentEvaluationResult[]                                │
│  - siteBlockingReasons: SiteBlockingReason[]                                │
│  - hasBlockingSites: boolean                                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## File: completionRulesService.ts

**Location**: `packages/api/src/services/completionRulesService.ts`

### Source of Truth
- **Firestore path**: `settings/exportSettings`
- **Field**: `completionRules`

### Data Structure
```typescript
interface CompletionRulesConfig {
  schemaVersion: string;
  rulesVersion: number;
  exportUnlockThresholdPct: number;  // e.g., 80
  segments: SegmentConfig[];          // Weighted segments for scoring
  builtInSegments: {
    [key: string]: BuiltInSegmentConfig;  // Description/SEO built-in rules
  };
  exclusions: {
    media: { affectsCompletion: boolean };
    pricing: { affectsCompletion: boolean };
  };
}
```

### Key Function
```typescript
// completionRulesService.ts:73-89
export async function loadCompletionRules(forceLatest = false): Promise<CompletionRulesConfig> {
  const db = getFirestore();
  const settingsRef = db.doc('settings/exportSettings');
  const snapshot = await settingsRef.get();
  const data = snapshot.data();
  const rules = data.completionRules;
  // ... validation ...
  return rules as CompletionRulesConfig;
}
```

---

## File: exportService.ts → loadExportableAttributes()

**Location**: `packages/api/src/services/exportService.ts:231-290`

### Source of Truth (Dual)
1. **Firestore**: `settings/attributes/keys/*` (live editable)
2. **SDK Static**: `packages/sdk/config/attributeRegistry.json` (versioned)

### Data Flow
```typescript
// exportService.ts:231-290
export async function loadExportableAttributes(
  site?: string,
  target?: ExportTarget
): Promise<Map<string, ExportAttributeDefinition>> {
  
  // 1. Load from Firestore via attributeValidator
  const registry = await loadRegistryMap();  // settings/attributes/keys/*
  
  // 2. Filter by SDK exportability
  for (const [id, def] of registry) {
    if (!isExportable(id)) continue;      // SDK helper
    if (isInternalOnly(id)) continue;     // SDK helper
    exportable.set(id, def);
  }
  
  return exportable;
}
```

### attributeValidator.ts loadRegistryMap()
```typescript
// attributeValidator.ts:83-96
export async function loadRegistryMap(): Promise<Map<string, AttributeDefinition>> {
  const db = admin.firestore();
  const snap = await db.collection('settings').doc('attributes').collection('keys').get();
  // Maps Firestore docs to AttributeDefinition
}
```

---

## File: completionDrivenExportReadiness.ts

**Location**: `packages/api/src/services/completionDrivenExportReadiness.ts`

### Registry Bridging (line 386-404)
```typescript
async function loadAttributeRegistryForCompletion(): Promise<AttributeRegistry> {
  // Load from exportService (which loads from Firestore)
  const exportableAttributes = await loadExportableAttributes();
  const registry: AttributeRegistry = {};
  
  for (const [id, def] of exportableAttributes) {
    registry[id] = {
      attribute_id: id,
      label: def.label,
      category: def.category || 'general',
      data_type: def.data_type || 'string',
      required_for_completion: def.required_for_export || def.requiredForExport || false,
      exportable: true,
      internalOnly: def.internalOnly || false
    };
  }
  
  return registry;
}
```

### Site Extraction (line 416-445)
```typescript
export function extractSelectedSites(product: ProductDocument): string[] {
  // Precedence:
  // 1. product.websites (array)
  // 2. product.sites (array)
  // 3. product.website (string)
  // 4. product.attributes.website (array or string)
  
  if (Array.isArray(product.websites) && product.websites.length > 0) {
    return product.websites;
  }
  // ... fallback chain
}
```

---

## File: completionEvaluationEngine.ts

**Location**: `packages/api/src/services/completionEvaluationEngine.ts`

### Pure Evaluation (No Side Effects)
```typescript
export function evaluateCompletion(
  product: ProductSnapshot,
  selectedSites: string[],
  registry: AttributeRegistry,
  config: CompletionRulesConfig,
  evaluatedAt?: string
): CompletionEvaluationResult {
  // Pure function - no database calls, no state mutation
  // 1. Check built-in segment blocking (Description/SEO)
  // 2. Evaluate each configured segment
  // 3. Calculate weighted completion percentage
  // 4. Return deterministic result
}
```

---

## SDK: attributeRegistry.json

**Location**: `packages/sdk/config/attributeRegistry.json`

### Structure
```json
{
  "version": "1.1.0",
  "attributes": [
    {
      "attribute_id": "sku",
      "label": "SKU",
      "category": "sku_core",
      "data_type": "text",
      "required_for_completion": true,
      "required_for_export": true,
      "exportable": true,
      "internalOnly": false,
      "requiredForExport": true
    }
    // ... more attributes
  ]
}
```

### SDK Helpers Used
- `isExportable(id)` - Check if attribute is exportable
- `isInternalOnly(id)` - Check if attribute is internal-only
- `getAttributesForTarget(target)` - Get channel-specific attributes

---

## Key Finding: Dual Source of Truth

### Attribute Registry has TWO sources:

1. **Firestore** (`settings/attributes/keys/*`)
   - Live editable via Admin UI
   - Loaded by `attributeValidator.loadRegistryMap()`

2. **SDK Static** (`packages/sdk/config/attributeRegistry.json`)
   - Version-controlled JSON file
   - Used by SDK helpers (`isExportable`, `isInternalOnly`)

### Potential Issue
If Firestore attributes diverge from SDK registry, the `isExportable()` check
in `loadExportableAttributes()` may filter out valid attributes or include
invalid ones.

**Recommendation**: Investigate Task 4 to determine authoritative source.

---

## Commands Used

```bash
# Trace completion rules loading
grep -n 'settings/exportSettings' packages/api/src/services/*.ts
grep -n 'loadCompletionRules' packages/api/src/services/*.ts

# Trace attribute registry loading
grep -n 'loadExportableAttributes' packages/api/src/services/*.ts
grep -n 'loadRegistryMap' packages/api/src/services/*.ts

# Check SDK registry structure
head -100 packages/sdk/config/attributeRegistry.json
```

---

## Completion Threshold Enforcement

**Source**: `settings/exportSettings.completionRules.exportUnlockThresholdPct`

### Threshold Check (completionDrivenExportReadiness.ts:348-352)
```typescript
const isReady = determineExportReadiness(completionResult, completionRules);
// Returns: completionResult.totalCompletionPct >= rules.exportUnlockThresholdPct
//          && !completionResult.hasBlockingSites
```

### Site Blocking (Takes Priority)
When `hasBlockingSites === true`:
- `completionPct` is forced to 0
- Export is blocked regardless of threshold

---

## Summary Table

| Component | Source | Path |
|-----------|--------|------|
| Completion Rules | Firestore | `settings/exportSettings.completionRules` |
| Attribute Registry | Firestore | `settings/attributes/keys/*` |
| SDK Registry | Static JSON | `packages/sdk/config/attributeRegistry.json` |
| Threshold | Settings | `completionRules.exportUnlockThresholdPct` |
| Site Selection | Product Doc | `product.websites`, `.sites`, `.website`, `.attributes.website` |
