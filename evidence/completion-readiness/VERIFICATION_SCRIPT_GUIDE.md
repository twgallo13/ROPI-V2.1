# LP Completion-Readiness Verification Script

**Script:** `scripts/verify-completion-readiness.sh`  
**Purpose:** Automated collection of artifacts and evidence for LP-completion-readiness phase  
**Owner:** Homer

---

## Overview

This script automates the verification workflow for all 9 LP completion-readiness Learning Plans by:
- Running registry sync and verification
- Executing deterministic completion tests
- Calling Product completion and Export readiness APIs
- Capturing Firestore snapshots
- Validating HES templates

---

## Prerequisites

Before running the script, ensure you have:

1. **pnpm** - For running package scripts and tests
2. **gcloud CLI** - Authenticated with access to the staging project
3. **jq** - For JSON validation and processing
4. **Node.js** - For running verification scripts
5. **Service Account JSON** - For Firestore access (if required)
6. **Bearer Token** - For authenticated API calls to staging

---

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PROJECT_ID` | Yes | GCP project ID for staging | `ropi-aoss-staging` |
| `SA_KEY` | Optional | Path to service account JSON | `./service-account.json` |
| `TOKEN` | Yes* | Bearer token for API auth | `ya29.a0Aa4xrXPT...` |
| `PRODUCT_ID` | Optional | Product ID for API testing | `product-123` |
| `ATTRIBUTE_ID` | Optional | Attribute ID for snapshot | `attr.sku` |

\* Required for LP-004 and LP-005 API calls

---

## Usage

### Basic Execution

```bash
PROJECT_ID=ropi-aoss-staging \
SA_KEY=./service-account.json \
TOKEN="ya29.a0Aa4xrXPT..." \
PRODUCT_ID=product-123 \
ATTRIBUTE_ID=attr.sku \
./scripts/verify-completion-readiness.sh
```

### Obtaining a Bearer Token

```bash
# For Firebase Auth
TOKEN=$(gcloud auth print-identity-token)

# Or use your preferred authentication method
```

### Minimal Execution (No API Calls)

```bash
PROJECT_ID=ropi-aoss-staging \
./scripts/verify-completion-readiness.sh
```

---

## What the Script Does

### LP-001: Registry Sync & Verification
- Runs `pnpm --filter @ropi-aoss/api run sync:attributes -- --dryRun=false`
- Executes `scripts/verify-attributes-meta.js` (if SA_KEY provided)
- Captures Firestore `settings/attributesMeta` snapshot

**Outputs:**
- `artifacts/LP-completion-readiness-001/registry-sync-{timestamp}.log`
- `artifacts/LP-completion-readiness-001/verify-attributes-meta-{timestamp}.txt`
- `artifacts/LP-completion-readiness-001/attributesMeta-{timestamp}.json`

### LP-002: Completion Rules Validation
- Captures Firestore `settings/exportSettings` snapshot

**Outputs:**
- `artifacts/LP-completion-readiness-002/exportSettings-{timestamp}.json`

### LP-003: Deterministic Engine Tests
- Runs `pnpm --filter @ropi-aoss/api test -- tests/evaluateCompletion.test.ts`

**Outputs:**
- `artifacts/LP-completion-readiness-003/eval-tests-{timestamp}.log`

### LP-004: Product Completion API
- Calls `GET /api/products/{id}/completion`

**Outputs:**
- `artifacts/LP-completion-readiness-004/api-product-completion-{product-id}-{timestamp}.json`

### LP-005: Export Readiness
- Calls `GET /api/admin/exports/readiness`
- Reports HTTP status (200 or 423)

**Outputs:**
- `artifacts/LP-completion-readiness-005/readiness-{timestamp}.json`

### LP-006: Attributes Console
- Captures attribute document snapshot

**Outputs:**
- `artifacts/LP-completion-readiness-006/attribute-{attribute-id}-{timestamp}.json`

### LP-007: Live Updates
- Creates timeline note stub (manual VVP required)

**Outputs:**
- `artifacts/LP-completion-readiness-007/timeline-note.txt`

### LP-008: HES Validation
- Validates all HES templates have required fields:
  - `branch`
  - `commitShas`
  - `ciRuns`
  - `deployInfo`
  - `verification`
  - `result`
  - `homer_approved`

**Console output** with validation results

### LP-009: Normalization Tests
- Runs `pnpm --filter @ropi-aoss/api test -- tests/attribute-normalization.test.ts`

**Outputs:**
- `artifacts/LP-completion-readiness-009/normalization-test-{timestamp}.log`

---

## After Running the Script

1. **Review artifacts** in `artifacts/LP-completion-readiness-00X/`
2. **Complete VVPs** by executing UI verification steps and capturing screenshots
3. **Populate HES templates** with evidence from artifacts
4. **Set sign-off fields**:
   - `homer_approved: true`
   - `result: "VERIFIED SUCCESS"`
5. **Update SIGN_OFF_CHECKLIST.md**

---

## Troubleshooting

### "SA_KEY not set or file missing"
- Set `SA_KEY` environment variable pointing to your service account JSON
- Or skip this step if verify-attributes-meta.js doesn't require it

### "TOKEN not set. Set TOKEN env var"
- Obtain a bearer token (see above)
- API calls (LP-004, LP-005) will be skipped without it

### "failed to fetch [firestore doc]"
- Ensure gcloud is authenticated: `gcloud auth login`
- Verify PROJECT_ID is correct
- Check IAM permissions for Firestore access

### Test failures
- Tests may not exist yet; create them per LP specifications
- Review test logs in artifacts directories

### HES validation errors
- Check that all HES templates in `evidence/completion-readiness/hes/` have required fields
- Run `jq . evidence/completion-readiness/hes/LP-completion-readiness-001.json` to validate JSON syntax

---

## Manual Steps Still Required

This script automates **artifact collection** but does not replace:
- **UI verification** (VVPs with screenshots)
- **Manual testing** of attribute toggles and rule changes
- **Before/after comparisons** for state changes
- **Operator workflow validation**

See individual VVP templates in `evidence/completion-readiness/vvp/` for UI verification procedures.

---

## Example Output

```
[INFO] Artifacts root: /workspaces/ROPI-V2.1/artifacts
[LP-001] Running registry sync (dryRun=false)...
[LP-001] Sync log saved to artifacts/LP-completion-readiness-001/registry-sync-20260108T120000Z.log
[LP-001] Running verify-attributes-meta.js...
[LP-001] verify output saved to artifacts/LP-completion-readiness-001/verify-attributes-meta-20260108T120000Z.txt
[LP-001] Capturing Firestore settings/attributesMeta...
[LP-001] attributesMeta saved to artifacts/LP-completion-readiness-001/attributesMeta-20260108T120000Z.json
[LP-002] Snapshot settings/exportSettings...
[LP-002] exportSettings saved to artifacts/LP-completion-readiness-002/exportSettings-20260108T120000Z.json
...
[LP-008] HES templates basic validation PASSED.
[DONE] Script completed. Check artifacts/ for outputs.
```

---

## References

- **HES Templates:** `evidence/completion-readiness/hes/`
- **VVP Templates:** `evidence/completion-readiness/vvp/`
- **Artifact Conventions:** `evidence/completion-readiness/ARTIFACT_CONVENTIONS.md`
- **Sign-Off Checklist:** `evidence/completion-readiness/SIGN_OFF_CHECKLIST.md`

---

**Created:** 2026-01-08  
**Owner:** Homer  
**Status:** Ready to run
