# Post-Migration Verification — LP-1.3.4

**LP:** LP-importer-mapping-recon-1.3.4  
**Completed:** 2025-12-28  
**By:** Homer  

---

## Migration Summary

| Step | Status | Details |
|------|--------|---------|
| Backup created | ✅ | `attribute-registry-backup-live-20251228T120038Z.json` |
| Migration preview | ✅ | `attribute-registry-migration.json` |
| Migration applied | ✅ | 5 attributes updated |
| Post-apply audit | ✅ | Only MPN has `import_required:true` |

---

## Changes Applied

| Attribute | Before | After |
|-----------|--------|-------|
| mpn | `import_required: true` | `import_required: true` (unchanged) |
| category | `import_required: true` | `import_required: false` |
| department | `import_required: true` | `import_required: false` |
| gender | `import_required: true` | `import_required: false` |
| primary_color | `import_required: true` | `import_required: false` |
| material | `import_required: true` | `import_required: false` |

---

## Dry-Run Validation

| CSV File | Rows | Valid | Invalid | Mapping Errors |
|----------|------|-------|---------|----------------|
| sample-mpn-only.csv | 5 | 5 | 0 | ✅ None |
| sample-mixed.csv | 7 | 4 | 3 | ✅ None |

Both validation scripts passed with **no ATTRIBUTE_NOT_FOUND** or unmapped attribute errors.

---

## Manual UI Verification Checklist

> **Staging URL:** https://ropi-aoss-staging.web.app

### RICS/Warehouse Fields

- [ ] Upload CSV with columns: `RICS Color`, `RICS Category`, `Warehouse Inv`
- [ ] Go to Map Columns step
- [ ] Verify RICS/warehouse fields appear in mapping dropdown (via SDK fallback)
- [ ] Map the fields and preview rows
- [ ] Confirm preview shows mapped values correctly

### Brand Persistence

- [ ] Map `Brand` column to `brand` attribute
- [ ] Run full import (not dry-run)
- [ ] Navigate to imported product record
- [ ] Confirm Brand value appears on persisted product

### Required Field Checks

- [ ] **MPN Missing Test:** Upload CSV without MPN column → Import should be blocked with warning referencing MPN
- [ ] **Other Fields Missing Test:** Upload CSV missing other fields (age group, brand, etc.) → Import should be allowed; missing fields can be empty

---

## Evidence Artifacts

| Artifact | Path |
|----------|------|
| Backup (pre-migration) | `evidence/importer-mapping-recon/attribute-registry-backup-live-20251228T120038Z.json` |
| Migration file | `evidence/importer-mapping-recon/attribute-registry-migration.json` |
| Apply log | `evidence/importer-mapping-recon/migration-apply-log.txt` |
| Audit (post-migration) | `evidence/importer-mapping-recon/audit-import-required-post-migration.txt` |
| Audit JSON | `evidence/importer-mapping-recon/audit-import-required.json` |
| Dry-run MPN | `evidence/importer-mapping-recon/staging-dryrun-mpn-post-migration.json` |
| Dry-run Mixed | `evidence/importer-mapping-recon/staging-dryrun-mixed-post-migration.json` |
| Validation MPN | `evidence/importer-mapping-recon/validate-staging-dryrun-mpn-post-migration.txt` |
| Validation Mixed | `evidence/importer-mapping-recon/validate-staging-dryrun-mixed-post-migration.txt` |

---

## Acceptance Criteria Status

| Criteria | Status |
|----------|--------|
| `audit-import-required-post-migration.json` contains only MPN | ✅ |
| Staging dry-runs pass (no mapping errors) | ✅ |
| RICS/Warehouse fields mappable | ⏳ Manual verification required |
| Brand persists on import | ⏳ Manual verification required |
| Only MPN blocks import | ⏳ Manual verification required |
| Evidence artifacts committed | ⏳ Pending |
| Lisa confirms final sign-off | ⏳ Pending |

---

## Notes

- The attribute registry is a **local JSON file** (`evidence/importer-mapping-recon/attribute-registry.json`), not a Firestore collection.
- The migration was applied to this local file. If the registry is also stored in Firestore for production, an additional deployment step may be required.
- All automated validations passed. Manual UI verification at staging is required for final sign-off.

---

**Signed:** Homer  
**Date:** 2025-12-28  
**LP Version:** LP-importer-mapping-recon-1.3.4
