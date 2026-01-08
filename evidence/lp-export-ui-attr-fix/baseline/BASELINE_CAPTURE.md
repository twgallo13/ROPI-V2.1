# HES C Step 1: Baseline Collection (SITE_SCOPED = OFF)

**Timestamp:** 2026-01-08T09:15:00Z  
**Actor:** Homer (automated via execute_hes_c.sh)  
**Commit:** 8e0b80c  
**Staging URL:** https://ropi-aoss-staging.web.app

## SITE_SCOPED / GLOBAL Flag Status

**Firestore Path:** `settings/exportSettings.exportGlobalMode`  
**Current Value:** false (or absent) — SITE_SCOPED mode (baseline)  
**Verification Method:** API response shows `mode` field absent

## API Captures

### 1. Catalog-Level Readiness

**Endpoint:** `GET /api/admin/exports/readiness`

**Key Fields:**
- `mode`: null/absent ✓
- `productLevelReadiness`: null/absent ✓
- `ready`: present
- `completionPct`: present
- `threshold`: present

**File:** `baseline/readiness-baseline.json`

### 2. Product-Level Completion (product: 18-test)

**Endpoint:** `GET /api/products/18-test/completion`

**Key Fields:**
- `ready`: true
- `completionPct`: 80
- `threshold`: 80
- `hasBlockingSites`: false
- `operatorExplanation.siteStatus`: present (array) ✓

**File:** `baseline/product-completion-baseline.json`

### 3. Additional Product (product: 211737-90h1-8)

**Status:** Pending capture

## UI Screenshots

**Status:** Manual step required (browser-based)

**Required:**
1. Export Readiness view (desktop) → `baseline/ui-screenshots/export-readiness-baseline.png`
2. VVP for product 18-test → `baseline/ui-screenshots/vvp-baseline-18-test.png`
3. VVP for product 211737-90h1-8 → `baseline/ui-screenshots/vvp-baseline-211737.png`

## Firestore Raw JSON Dumps

**Status:** Manual step required (Firestore Console or gcloud CLI)

**Required:**
1. `settings/attributesMeta` → `baseline/firestore-baseline/settings-attributesMeta.json`
2. Sample classification attribute (e.g., `attributes/product_classification`) → `baseline/firestore-baseline/attribute-doc-sample.json`

**Commands:**
```bash
# Via gcloud firestore
gcloud firestore export gs://BUCKET/hes-c-baseline-$(date +%Y%m%d) \
  --collection-ids=settings,attributes --project ropi-bccee

# Or via Firebase CLI
firebase firestore:document:get settings/attributesMeta \
  --project ropi-bccee --format json > baseline/firestore-baseline/settings-attributesMeta.json
```

## Verification Checklist

- [x] Catalog readiness API captured (mode absent)
- [x] Product completion API captured (product 18-test)
- [ ] Product completion API captured (product 211737-90h1-8)
- [ ] UI screenshots (export readiness + VVP)
- [ ] Firestore JSON dumps (settings/attributesMeta + sample attribute)
- [ ] Toggle evidence documented

## Next Step

Proceed to Step 2 (GLOBAL mode verification) after:
1. Completing UI screenshots
2. Completing Firestore JSON dumps
3. Toggling `exportGlobalMode` to `true`
