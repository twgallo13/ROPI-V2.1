# PR: RetailOps Import/Export CLI and API Preview Endpoint

## Overview

Implements the RetailOps pipeline for file-based import/export workflow. Enables Theo to:
- Import RetailOps CSVs locally via CLI with detailed feedback
- Export CoreProducts back to RetailOps format
- Preview CSV imports via REST API without persistence

**Version:** aoss.v0.7.0  
**Branch:** feature/cli-api/retailops-pipeline  
**Target:** aoss-main

---

## Changes

### CLI Package (`packages/cli`)

#### New Commands

**`ropi retailops:import <csvPath> [--jsonOut <path>] [--detailsOut <path>]`**

- Reads RetailOps CSV file
- Parses using `retailOpsCsvToCoreProductsWithDetails` from SDK
- Outputs summary to console (total rows, created products, skipped count)
- Optional: writes prettified CoreProducts JSON (--jsonOut)
- Optional: writes detailed import report (--detailsOut)
- Exit codes: 0 = success, 1 = error

Example:
```bash
ropi retailops:import data.csv --jsonOut products.json --detailsOut details.json
```

**`ropi retailops:export --from-json <jsonPath> [--out <csvPath>]`**

- Reads JSON array of CoreProduct objects
- Builds RetailOps CSV format using `buildRetailOpsCsv` from SDK
- Handles CSV escaping (commas, quotes, newlines)
- Outputs to file (--out) or stdout
- Exit codes: 0 = success, 1 = error

Example:
```bash
ropi retailops:export --from-json products.json --out output.csv
```

#### Implementation Details

- **retailopsImport.ts**: Import command handler with file I/O and summary reporting
- **retailopsExport.ts**: Export command handler with JSON parsing and CSV building
- **Updated index.ts**: Command routing dispatcher, help text
- **README.md**: Complete usage documentation with examples

#### Tests

- `test/retailops.cli.test.ts`: 4 unit tests
  - Import with JSON output
  - Import with skipped rows handling
  - Export to CSV
  - Error handling for missing files

**Test Status:** ✅ 4/4 PASSED

### API Package (`packages/api`)

#### New Endpoint

**`POST /api/retailops/import-preview`** (Admin-only)

- Accepts multipart/form-data with CSV file
- Returns JSON preview (no persistence)
- Response structure:
  ```json
  {
    "stats": {
      "totalRows": 10,
      "coreProducts": 8,
      "skipped": 2
    },
    "skipped": [
      { "rowNumber": 3, "reason": "Non-NIKE brand" },
      ...
    ],
    "sampleCoreProducts": [ /* first 3-5 products */ ]
  }
  ```

#### Error Handling

- **400 Bad Request**: Missing file, invalid content-type
- **422 Unprocessable Entity**: CSV parse error with details
- **500 Internal Server Error**: Unexpected errors
- **401 Unauthorized**: Authentication required

#### Implementation Details

- **retailopsImportPreview.ts**: Endpoint handler with multipart parsing, CSV processing, CORS
- **Updated apiApp.ts**: Mounted at `/api/retailops/import-preview` with requireAdmin middleware

#### Tests

- `test/endpoints/retailopsImportPreview.test.ts`: 7 integration tests
  - Valid CSV upload returns 200
  - Correct stats calculation
  - Sample products included (max 5)
  - Skipped rows with reasons
  - Invalid CSV returns 422
  - Missing file returns 400
  - Sample limiting works

**Test Status:** ✅ 7/7 PASSED

### SDK Integration

No SDK changes needed. Existing exports used:
- `retailOpsCsvToCoreProductsWithDetails` — Import with details
- `buildRetailOpsCsv` — Export to CSV format
- Both already exported from `@ropi-aoss/sdk` root in index.ts

### Dependencies

Added to packages:
- **cli**: `@ropi-aoss/sdk` (workspace dependency)
- **api**: `@ropi-aoss/sdk` (workspace dependency)

---

## Build & Test Status

| Package | Build | Tests |
|---------|-------|-------|
| @ropi-aoss/sdk | ✅ | 11/11 apiFetch passing (existing) |
| @ropi-aoss/cli | ✅ | ✅ 4/4 passing |
| @ropi-aoss/api | ✅ | ✅ 7/7 RetailOps tests passing |

### Build Commands

```bash
pnpm --filter @ropi-aoss/sdk build    # ✅ 52.64 KB CJS + 50.15 KB ESM
pnpm --filter @ropi-aoss/cli build    # ✅ tsc compiled
pnpm --filter @ropi-aoss/api build    # ✅ 225.9 KB esbuild
```

### Test Commands

```bash
pnpm --filter @ropi-aoss/cli test     # ✅ 4/4 PASSED
pnpm --filter @ropi-aoss/api test retailopsImportPreview  # ✅ 7/7 PASSED
```

---

## Staging Verification (Test Cases for John)

After deployment, verify:

### 1. CLI Import

```bash
# Create sample CSV
echo 'SKU,Product Name,Brand,Description,Department,Category,Color,Size,MSRP,Cost,Retail Price,Currency,Quantity,Warehouse,First Received,Launch Date,Images,Primary Image
NK-001,Nike Air Max 270,NIKE,Sneaker,Mens,Running,Black,10,159.99,100.00,139.99,USD,25,WH-001,,2024-12-15,https://example.com/img1.jpg,https://example.com/img1.jpg' > sample.csv

# Test import
ropi retailops:import sample.csv --jsonOut tmp.json --detailsOut details.json

# Expected: Summary printed, tmp.json and details.json created
```

### 2. CLI Export

```bash
# Test export from JSON
ropi retailops:export --from-json tmp.json --out out.csv

# Expected: CSV header and data written, proper escaping
```

### 3. API Preview

```bash
# Test API endpoint with curl
curl -X POST \
  -H "Authorization: Bearer <adminToken>" \
  -F "file=@sample.csv" \
  https://ropi-aoss-staging.web.app/api/retailops/import-preview

# Expected: JSON response with stats, skipped, sampleCoreProducts
```

### 4. Error Cases

```bash
# Invalid brand (should be skipped)
ropi retailops:import sample-with-adidas.csv

# Expected: Skipped rows shown in summary

# Missing file
ropi retailops:import nonexistent.csv

# Expected: Error message, exit code 1

# API with invalid CSV
curl -X POST -F "file=@invalid.csv" ...

# Expected: 422 response with error details
```

---

## Files Changed

### Created
- `packages/cli/src/commands/retailopsImport.ts` (90 lines)
- `packages/cli/src/commands/retailopsExport.ts` (75 lines)
- `packages/cli/test/retailops.cli.test.ts` (180 lines)
- `packages/cli/README.md` (complete documentation)
- `packages/api/src/endpoints/retailopsImportPreview.ts` (190 lines)
- `packages/api/test/endpoints/retailopsImportPreview.test.ts` (240 lines)

### Modified
- `packages/cli/src/index.ts` (command routing, help text)
- `packages/cli/package.json` (dependencies, scripts)
- `packages/api/src/apiApp.ts` (endpoint mounting)
- `packages/api/package.json` (SDK dependency)

---

## Summary back to Lisa

**Completion Status:** ✅ READY FOR MERGE

**Key Metrics:**
- CLI commands fully implemented and tested
- API endpoint implemented and tested (7/7 tests passing)
- All builds succeed with 0 TypeScript errors
- Documentation complete (CLI README with examples)
- Staging verification checklist prepared for John

**Test Results:**
- CLI tests: 4/4 passing ✅
- API tests: 7/7 passing ✅
- SDK exports verified and used ✅

**Commands Ready:**
```bash
ropi retailops:import <csv> [--jsonOut] [--detailsOut]
ropi retailops:export --from-json <json> [--out <csv>]
POST /api/retailops/import-preview
```

**Next Steps:**
1. Merge this PR to aoss-main
2. Deploy to staging
3. John runs verification tests (test cases documented above)
4. Report results back to Lisa

**Branch Cleanup:** Source branch will be deleted after merge.

---

## Quality Checklist

- ✅ Code follows existing patterns (CLI command structure, API endpoint middleware)
- ✅ All new code has tests
- ✅ No TypeScript errors
- ✅ Dependencies properly added to package.json
- ✅ Documentation included (CLI README)
- ✅ Error handling implemented (400/422/500 responses)
- ✅ Admin authentication enforced on API endpoint
- ✅ CORS configured for staging/production origins
- ✅ Exit codes correct (0 = success, 1 = error)
- ✅ CSV escaping handled properly

---

## Related PRs

- PR #247: apiFetch 204 handling (aoss.v0.8.1)
- PR #248: ConfirmModal component (aoss.v0.8.1)

This PR builds on stable merge of #247 and #248 to staging.
