# PVS-0.2.2 — Normalize Legacy Attribute Schema on GET

**Date**: 2025-12-19  
**Branch**: `lisa/PVS-0.2.2/normalize-attributes-get`

---

## Summary

This patch fixes the "blank until resave" issue in the Attributes Console by normalizing legacy Firestore documents on read (GET), ensuring the frontend always receives canonical field names.

---

## Fields Normalized

| Legacy Field (camelCase) | Canonical Field (snake_case) | Notes |
|--------------------------|------------------------------|-------|
| `dataType` | `data_type` | Direct rename |
| `allowedValues` | `allowed_values` | Direct rename |
| `export` | `required_for_export` | Semantic mapping |
| `required` | `import_required` | Semantic mapping |
| `description` | `ai_usage_notes` | Semantic mapping (fallback only) |
| `importerColumns[0]` | `external_header` | First element used |

### Defaults Applied

| Field | Default Value |
|-------|---------------|
| `data_type` | `'string'` |
| `status` | `'active'` |
| `required_for_completion` | `false` |
| `required_for_export` | `false` |
| `import_required` | `false` |

---

## Endpoints Now Returning Canonical Payloads

| Endpoint | Normalized? |
|----------|-------------|
| `GET /api/admin/settings/attributes` (list) | ✅ Yes |
| `GET /api/admin/settings/attributes/:id` (single) | ✅ Yes |
| `PUT /api/admin/settings/attributes/:id` (update) | ✅ Yes (via Zod) |
| `POST /api/admin/settings/attributes` (create) | ✅ Yes (via Zod) |

---

## How This Resolves Blank-on-Load

### Before (PVS-0.2.1 audit finding)

```
Firestore doc: { dataType: "string", ... }
       ↓ fromFirestore() (raw spread)
API response: { dataType: "string", ... }
       ↓ Frontend openEdit()
Form expects: data_type → gets undefined → shows default "string"
```

**Result**: UI shows defaults, not actual values. Appears "blank."

### After (PVS-0.2.2 fix)

```
Firestore doc: { dataType: "string", ... }
       ↓ fromFirestore() (normalized)
API response: { data_type: "string", status: "active", ... }
       ↓ Frontend openEdit()
Form expects: data_type → gets "string" ✓
```

**Result**: UI shows actual values immediately.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/api/src/services/attributesService.ts` | `fromFirestore()` now normalizes legacy fields and applies Zod defaults |
| `packages/web/src/pages/Settings/AttributeManager.tsx` | `openEdit()` includes defensive fallback normalization |
| `packages/api/test/unit/attributeNormalization.spec.ts` | 12 unit tests for normalization logic |
| `scripts/normalize-legacy-attributes.js` | Migration script (dry-run/apply modes) |

---

## Migration Script

A migration script is provided but NOT executed as part of this PVS:

```bash
# Preview what would change (safe)
node scripts/normalize-legacy-attributes.js --dry

# Apply changes to Firestore (use with caution)
node scripts/normalize-legacy-attributes.js --apply
```

The `--dry` mode reports:
- Total documents
- Documents needing normalization
- Field-by-field changes that would be made

---

## Testing

```bash
# Run normalization unit tests
cd packages/api && npm test -- test/unit/attributeNormalization.spec.ts --run
```

**Manual verification**:
1. Open staging at `/settings/attributes`
2. Click Edit on a legacy attribute (e.g., `rics_source.brand`)
3. Confirm Data Type shows "String" and Status shows "Active" immediately
4. No resave required

---

## Backward Compatibility

- ✅ Legacy documents still work (normalized on read)
- ✅ Canonical documents unchanged
- ✅ No Firestore writes on GET
- ✅ Unknown legacy fields preserved in response
