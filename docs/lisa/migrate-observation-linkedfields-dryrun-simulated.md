# Migrate Observations linkedField → fieldLink — Dry Run

**Generated:** 2025-12-19T10:25:00.000Z

**Mode:** DRY RUN (SIMULATED - no Firestore access)

## ⚠️ SIMULATED OUTPUT

This is a simulated dry-run report. Actual execution requires staging Firestore credentials.

**To run actual dry-run:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/staging-service-account.json"
node scripts/migrate-observation-linkedfields.js --dry
```

## Summary

| Metric | Count |
|--------|-------|
| Total observations with linkedField | _Pending actual run_ |
| Proposed mappings (auto) | _Pending actual run_ |
| Manual review required | _Pending actual run_ |
| No action (empty/null) | _Pending actual run_ |

## Script Mapping Rules

The migration script (`scripts/migrate-observation-linkedfields.js`) applies these rules:

### Product-Level Fields → `product.<field>`

| linkedField Pattern | Maps To | Reason |
|---------------------|---------|--------|
| `title`, `name`, `product_name` | `product.title` | top-level title |
| `sku`, `product_sku` | `product.sku` | top-level sku |
| `brand`, `product_brand` | `product.brand` | top-level brand |
| `category`, `product_category` | `product.category` | top-level category |
| `department`, `product_department` | `product.department` | top-level department |
| `description`, `product_description` | `product.description` | top-level description |
| `mpn`, `manufacturer_part_number` | `product.mpn` | per LP-1.0.3 constraint |
| `styleid`, `style_id`, `style` | `product.styleId` | top-level styleId |
| `launchdate`, `launch_date` | `product.launchDate` | top-level launchDate |
| `launchstatus`, `launch_status` | `product.launchStatus` | top-level launchStatus |

### Explicit Prefixes

| linkedField Pattern | Maps To | Reason |
|---------------------|---------|--------|
| `product.<field>` | `product.<field>` | explicit product key |
| `attributes.<id>` | `attributes.<id>` (if valid) | explicit attributes.<id> |

### Attribute Aliases → `attributes.<id>`

Uses `canonicalAttributeMap.approved.json` and `attributeRegistry.json` to resolve aliases:

| linkedField | Maps To | Reason |
|-------------|---------|--------|
| `color`, `Color`, `primary_color` | `attributes.primary_color` | alias matched attribute |
| `gender`, `sex`, `target_gender` | `attributes.gender` | alias matched attribute |
| `age_group`, `ageGroup` | `attributes.age_group` | alias matched attribute |

### Manual Review (no mapping)

Fields that don't match any rule go to `manual_review`:
- Unknown field names not in registry or canonical map
- Typos or custom field names
- New aliases that need to be added to canonicalAttributeMap

## Sample Proposed Mappings

```
linkedField: "title"
  fieldLink: {"type":"product","key":"product.title"}
  reason: top-level title

linkedField: "sku"
  fieldLink: {"type":"product","key":"product.sku"}
  reason: top-level sku

linkedField: "brand"
  fieldLink: {"type":"product","key":"product.brand"}
  reason: top-level brand

linkedField: "mpn"
  fieldLink: {"type":"product","key":"product.mpn"}
  reason: product.mpn (per LP-1.0.3 constraint)

linkedField: "color"
  fieldLink: {"type":"attribute","key":"attributes.primary_color"}
  reason: alias matched attribute

linkedField: "attributes.gender"
  fieldLink: {"type":"attribute","key":"attributes.gender"}
  reason: explicit attributes.<id>

linkedField: "product.description"
  fieldLink: {"type":"product","key":"product.description"}
  reason: explicit product key
```

## Manual Review Required

_Pending actual dry-run execution_

## Next Steps

1. **Execute actual dry-run** with staging credentials:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/staging-sa.json"
   node scripts/migrate-observation-linkedfields.js --dry 2>&1 | tee logs/migrate-dryrun.log
   ```

2. **Review the actual dry-run output** in `docs/lisa/migrate-observation-linkedfields-dryrun-<timestamp>.json`

3. **Review manual_review items** and update `canonicalAttributeMap.approved.json` if needed

4. **Business signoff** before running apply mode

5. **After signoff**, take backup and run:
   ```bash
   node scripts/backup-firestore-collections.js --collections=observations --out=backups/observations-pre-apply.json
   node scripts/migrate-observation-linkedfields.js --apply
   ```

---

Lisa LP-1.0.3
