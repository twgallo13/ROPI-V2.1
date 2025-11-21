# Staging Registry Application & Import Test Guide

## Overview
This guide walks through applying the updated attribute registry to staging and running an import test.

## Prerequisites
- Staging service account JSON file available at `/secrets/staging-service-account.json`
- Network access to `ropi-staging` Firestore project
- Node.js installed with firebase-admin package

## Files Created
- `operations/apply-registry-to-staging.sh` - Main script to apply registry
- `operations/test-import.csv` - Test CSV with single product
- `operations/remediate-rics-color-duplicate.sh` - Fix script if rics_color is duplicated
- `operations/verify-test-product.sh` - Verify imported product in Firestore

## Step 1: Apply Registry to Staging

### Set Credentials
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/secrets/staging-service-account.json"
export FIRESTORE_PROJECT_ID="ropi-staging"
```

### Run Application Script
```bash
cd /workspaces/ROPI-V2.1
./operations/apply-registry-to-staging.sh
```

### Expected Output
1. Backup file created: `operations/review-artifacts/attribute-registry/attribute-keys-backup-<timestamp>.json`
2. List of updated attribute keys (79 keys)
3. Validation showing no duplicate importerColumns

### If Duplicates Found
If the validation shows `rics_color` or other duplicates, run:
```bash
./operations/remediate-rics-color-duplicate.sh
```

## Step 2: Import Test

### Option A: Manual UI Import
1. Navigate to staging importer UI
2. Upload `operations/test-import.csv`
3. Verify all headers auto-map correctly
4. Run import for single row
5. Document any unmapped headers

### Option B: Programmatic Import
(Requires importer API endpoint and authentication)

## Step 3: Verify Product

### Run Verification Script
```bash
./operations/verify-test-product.sh
```

### Expected Verification Results
All fields should match:
- `sku_core.sku` = "TEST-001"
- `descriptive.primaryColor` = "Black"
- `technical.storeInv` = 20
- `technical.warehouseInv` = 50
- `technical.whsInv` = 10
- `pricing.scomRegularPrice` = 120.00
- `pricing.scomSalePrice` = 99.00
- `launch.launchDate` = "2025-10-01"
- `launch.klPostDate` = "2025-10-01"
- `technical.mediaStatus` = "Images Ready"

## What to Report

### From Step 1 (Apply Registry)
1. Backup file path
2. Number of keys updated
3. Contents of `/tmp/duplicate-importer-columns.txt` (should be empty)

### From Step 2 (Import Test)
1. Screenshot of importer mapping screen OR list of unmapped headers
2. Import success/failure status
3. Any warnings or errors

### From Step 3 (Verify Product)
1. Full Firestore product document JSON
2. Verification results (passed/failed checks)

## Troubleshooting

### Service Account Not Found
Ensure the service account JSON is placed at the correct path and has permissions for the staging project.

### Import Mapping Errors
If headers don't auto-map:
1. Copy exact unmapped header text
2. Check `scripts/attribute-registry-normalized.json` for that importerColumn
3. Verify the registry was applied successfully (check Firestore console)

### Verification Failures
If fields don't match expected values:
1. Check importer logs for transformation errors
2. Verify CSV data was correctly parsed
3. Check for any SmartDetect or validation rules that modified values

## Safety Notes
- All operations use `{merge:true}` for safe updates
- Backup is created before any changes
- Only affects staging environment (ropi-staging)
- No production writes occur
