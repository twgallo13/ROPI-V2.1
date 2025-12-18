# Normalize Dry-Run Report — Staging
**Generated:** 2025-12-18T08:42:39.949Z

## Summary

| Metric | Count |
|--------|-------|
| Total attribute docs scanned | 422 |
| Deprecated stub docs (skipped) | 251 |
| Valid docs (no diffs) | 171 |
| Docs with diffs | 0 |
| Docs with validation errors | 0 |

## Schema Mapping Notes

The Firestore attribute documents use a different schema than `AttributeSchema`:

| Firestore Field | AttributeSchema Field |
|-----------------|----------------------|
| `dataType` | `data_type` |
| `required` | `required_for_completion` |
| `export` | `required_for_export` |
| `description` | `ai_usage_notes` |
| `allowedValues` | `allowed_values` |

## Deprecated Stubs (Not Processed)

251 documents are deprecated stubs with only `status`, `deprecated_in_favor_of`, and `deprecatedAt` fields. These were skipped.

**Sample deprecated stubs:**

- `AgeGroup` → deprecated in favor of `age_group`
- `Brand` → deprecated in favor of `brand`
- `Category` → deprecated in favor of `category`
- `Class` → deprecated in favor of `class`
- `Closure` → deprecated in favor of `closure_type`
- `ClosureType` → deprecated in favor of `closure_type`
- `CollectionName` → deprecated in favor of `collection_name`
- `Color` → deprecated in favor of `primary_color`
- `Colour` → deprecated in favor of `primary_color`
- `CustomMessage` → deprecated in favor of `custom_message`
