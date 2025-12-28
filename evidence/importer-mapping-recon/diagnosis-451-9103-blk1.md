# LP-1.3.8 Diagnosis: Product Attributes Not Rendering

**Date:** 2025-12-28
**Products:** 451-9103-blk1, 451-9201-blk1, 211737-90h1

---

## Summary

**Root Cause:** Attribute fields in `product.attributes.*` were not being merged to top-level for UI components that expect `product.class`, `product.category`, etc.

## Investigation Findings

### Raw Firestore Data (✅ Present)
```json
{
  "attributes": {
    "class": "Sandle",
    "category": "Slides", 
    "department": "Footwear",
    "gender": "Men's",
    "primary_color": "Green",
    "descriptive_color": "Green Croc",
    "material": "Pholyester",
    "fit": "True to Size",
    "fast_fashion": "TRUE"
  }
}
```

### UI Component Expectations
| Component | Reads | Location |
|-----------|-------|----------|
| CoreInformationTab | `product.class` | Top-level |
| CoreInformationTab | `product.category` | Top-level |
| CoreInformationTab | `product.department` | Top-level |
| ProductAttributesTab | `product.attributes.primary_color` | Nested |
| ProductHeader | `product.mpn` | Top-level |

### Gap Identified
`mergeCoreFieldsToTopLevel()` in LP-1.3.7 only merged:
- `core.*` → top-level
- `inventory.*` → top-level

It did NOT merge:
- `attributes.*` → top-level ❌

## Fix Applied: Fix A (Frontend mapping)

Added `ATTRIBUTE_FIELDS_TO_TOP_LEVEL` array and merged attribute fields in `mergeCoreFieldsToTopLevel()`:

```typescript
const ATTRIBUTE_FIELDS_TO_TOP_LEVEL = [
  'department', 'class', 'category', 'subcategory',
  'gender', 'age_group', 'ageGroup',
  'primary_color', 'primaryColor', 'descriptive_color', 'descriptiveColor',
  'material', 'materials', 'fit', 'cut_type', 'closure_type',
  'league', 'sports_team', 'collection_name',
  'fast_fashion', 'heel_height', 'platform_height', 'heel_type',
  'hype', 'kl_post_date', 'promo', 'product_is_active',
  'gtin', 'tax_class', 'height', 'length', 'width', 'weight',
];
```

## Unit Tests Added
10 tests in `test/unit/useProduct.mergeFields.test.ts`:
1. ✅ should merge MPN from core to top-level
2. ✅ should not overwrite existing top-level fields
3. ✅ should merge inventory fields to top-level
4. ✅ should handle missing core and inventory gracefully
5. ✅ should merge all fields from exact Firestore structure
6. ✅ should merge class and category from attributes to top-level
7. ✅ should merge primary_color and descriptive_color from attributes
8. ✅ should merge fast_fashion and related fields from attributes
9. ✅ should merge all fields from exact 211737-90h1 Firestore structure
10. ✅ should not overwrite existing top-level attribute fields

## Expected Result

After deployment:
- CoreInformationTab shows: Class, Category, Department, Gender
- ProductAttributesTab shows: Primary Color, Descriptive Color, Material, Fit
- LaunchMediaTab shows: Fast Fashion, Hype, Promo
