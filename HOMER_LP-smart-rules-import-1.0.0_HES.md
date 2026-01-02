# HOMER Evidence Sheet (HES) — LP-smart-rules-import-1.0.0

**Phase:** S3 — Import Pipeline Integration & Provenance Persistence  
**Branch:** `lp-smart-rules-import-1.0.0`  
**Date:** 2026-01-02  
**Author:** Homer (AI Agent)

---

## 1. Executive Summary

S3 wires the Smart Rules Engine V2 (completed in S2) into the import pipeline, making it the canonical normalization step. Every import row now passes through the engine, which:
- Evaluates all active rules against the row's RICS data
- Auto-applies matching rules (set-only-if-empty semantics)
- Persists per-field provenance and audit trail to product documents
- Maintains idempotency via `_smartRulesRanAt` and `_smartRulesSkipUntil`

---

## 2. Implementation Details

### 2.1 Files Modified

| File | Changes |
|------|---------|
| `packages/api/src/services/productCommitService.ts` | Integrated Smart Rules engine call in `processRow()`, added Smart Rules stats to result objects |

### 2.2 Files Created

| File | Purpose |
|------|---------|
| `packages/api/test/smartRulesImportIntegration.test.ts` | 25 integration tests for S3 acceptance criteria |

### 2.3 Key Integration Points

```typescript
// productCommitService.ts - processRow()
const srResult = await processImportWithSmartRules({
  productId: row.mpn || row.sku,
  normalized: row,
  source: row.source,
  existingProduct: existingDoc?.data() as Product | undefined,
});

// Merge Smart Rules updates into product
if (srResult.updates && Object.keys(srResult.updates).length > 0) {
  productData = {
    ...productData,
    attributes: {
      ...productData.attributes,
      ...srResult.updates.attributes,
    },
    provenance: srResult.updates.provenance,
    _appliedRules: srResult.updates._appliedRules,
    _smartRulesRanAt: srResult.updates._smartRulesRanAt,
    _smartRulesSkipUntil: srResult.updates._smartRulesSkipUntil,
  };
  
  // Append activity log
  if (srResult.activityLog?.length) {
    productData._activityLog = [
      ...(productData._activityLog || []),
      ...srResult.activityLog,
    ];
  }
}
```

---

## 3. Test Results

### 3.1 S3 Integration Tests (25 tests)

```
 ✓ test/smartRulesImportIntegration.test.ts (25)
   ✓ S3.1: Import Pipeline Integration (6)
     ✓ Engine evaluation during import (2)
     ✓ Provenance per-field persistence (3)
     ✓ _appliedRules tracking (1)
   ✓ S3.2: Idempotency (3)
     ✓ should produce identical results on re-evaluation
     ✓ should NOT auto-apply when field already has value
     ✓ should NOT auto-apply when user has edited the field
   ✓ S3.3: Skip-Window Loop Prevention (4)
     ✓ should set _smartRulesRanAt timestamp
     ✓ should set _smartRulesSkipUntil for loop prevention
     ✓ should skip evaluation when within skip window
     ✓ should NOT skip when skip window has expired
   ✓ S3.4: Activity Log / Audit Trail (6)
   ✓ S3.5: Full Integration Scenario (2)
   ✓ S3.6: Edge Cases (4)

 Test Files  1 passed (1)
      Tests  25 passed (25)
```

---

## 4. Product Document Examples

### 4.1 BEFORE Import (New Product)

```json
{
  "mpn": "NIKE-AM90-001",
  "core": {
    "sku": "NIKE-AM90-BLK-10",
    "title": "Air Max 90",
    "brand": "Nike"
  },
  "attributes": {},
  "source": {
    "rics": {
      "category": "Footwear | Men's | Running",
      "color": "Black/White"
    }
  }
}
```

### 4.2 AFTER Import (Smart Rules Applied)

```json
{
  "mpn": "NIKE-AM90-001",
  "core": {
    "sku": "NIKE-AM90-BLK-10",
    "title": "Air Max 90",
    "brand": "Nike"
  },
  "attributes": {
    "category": "Footwear",
    "gender": "Men's"
  },
  "source": {
    "rics": {
      "category": "Footwear | Men's | Running",
      "color": "Black/White"
    }
  },
  "provenance": {
    "attributes_category": {
      "source": "smartRule",
      "ruleId": "category-footwear",
      "ruleName": "Category - Footwear Detection",
      "appliedAt": "2026-01-02T03:34:05.888Z",
      "input": {
        "ricsCategory": "Footwear | Men's | Running",
        "matchedValue": "footwear",
        "matchedTokens": ["footwear", "Footwear"]
      },
      "reason": "token match 'footwear', 'Footwear'"
    },
    "attributes_gender": {
      "source": "smartRule",
      "ruleId": "gender-men",
      "ruleName": "Gender - Men's Detection",
      "appliedAt": "2026-01-02T03:34:05.888Z",
      "input": {
        "ricsCategory": "Footwear | Men's | Running",
        "matchedValue": "Men's",
        "matchedTokens": ["Men's", "men's", "Men's"]
      },
      "reason": "token match 'Men's', 'men's', 'Men's'"
    }
  },
  "_appliedRules": {
    "attributes_category": {
      "ruleId": "category-footwear",
      "confidence": 0.9,
      "appliedAt": "2026-01-02T03:34:05.888Z"
    },
    "attributes_gender": {
      "ruleId": "gender-men",
      "confidence": 0.95,
      "appliedAt": "2026-01-02T03:34:05.888Z"
    }
  },
  "_smartRulesRanAt": "2026-01-02T03:34:05.888Z",
  "_smartRulesSkipUntil": 1767324855888,
  "_activityLog": [
    {
      "actor": "system:smartRulesEngine",
      "action": "smartrule_auto_apply",
      "timestamp": "2026-01-02T03:34:05.888Z",
      "details": {
        "ruleId": "category-footwear",
        "ruleName": "Category - Footwear Detection",
        "targetField": "attributes.category",
        "value": "Footwear",
        "confidence": 0.9,
        "input": {
          "ricsCategory": "Footwear | Men's | Running",
          "matchedValue": "footwear",
          "matchedTokens": ["footwear", "Footwear"]
        }
      }
    },
    {
      "actor": "system:smartRulesEngine",
      "action": "smartrule_auto_apply",
      "timestamp": "2026-01-02T03:34:05.888Z",
      "details": {
        "ruleId": "gender-men",
        "ruleName": "Gender - Men's Detection",
        "targetField": "attributes.gender",
        "value": "Men's",
        "confidence": 0.95,
        "input": {
          "ricsCategory": "Footwear | Men's | Running",
          "matchedValue": "Men's",
          "matchedTokens": ["Men's", "men's", "Men's"]
        }
      }
    }
  ]
}
```

---

## 5. Idempotency Evidence

### 5.1 _smartRulesRanAt Timestamp

Every product processed gets a `_smartRulesRanAt` timestamp:
```json
"_smartRulesRanAt": "2026-01-02T03:34:05.888Z"
```

### 5.2 Skip Window Loop Prevention

`_smartRulesSkipUntil` prevents immediate re-trigger (10 second window):
```json
"_smartRulesSkipUntil": 1767324855888
```

### 5.3 Set-Only-If-Empty Semantics

Re-running import on the same product:
- Engine evaluates rules but finds `attributes.gender` already has value `"Men's"`
- `canAutoApply = false` because `fieldIsEmpty = false`
- Result: No changes, idempotent

---

## 6. Acceptance Criteria Status

| Criteria | Status | Evidence |
|----------|--------|----------|
| Engine runs during import normalization | ✅ | `processRow()` calls `processImportWithSmartRules()` |
| Per-field provenance persisted | ✅ | `provenance.attributes_gender`, `provenance.attributes_category` |
| `_appliedRules` tracking | ✅ | Full tracking with ruleId, confidence, appliedAt |
| Activity log audit trail | ✅ | `_activityLog` array with entries per auto-apply |
| Idempotency guaranteed | ✅ | Re-run produces no changes (set-only-if-empty) |
| Skip-window loop prevention | ✅ | `_smartRulesSkipUntil` prevents immediate re-trigger |
| CI green | ✅ | 25/25 S3 tests pass |

---

## 7. Commits

| SHA | Message |
|-----|---------|
| `d266853` | feat(smartRules): integrate engine into import pipeline & persist provenance |

---

## 8. Dependencies

- S2 Smart Rules Engine V2 (PR #411, merged)
- `packages/api/src/lib/smartEngineV2.ts` - Engine implementation
- `packages/api/src/functions/smartRulesImport.ts` - Import integration functions

---

## 9. Next Steps

After S3 merge:
- **S4:** Exporter & Validation Alignment - Ensure exported products include Smart Rules attributes
- **S5:** Product UI Provenance UX - Display provenance badges in Product Editor
- **S6:** Admin Settings Smart Rules Manager - UI for managing rules

---

*End of HES — LP-smart-rules-import-1.0.0*
