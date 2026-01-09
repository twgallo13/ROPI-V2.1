# LP-phase2b-001: Ready to Execute Staging Verification

**Status:** ✅ ALL SCRIPTS READY — AWAITING STAGING CREDENTIALS  
**Date:** 2026-01-09  
**Commit:** 3c593cd

---

## Infrastructure Readiness Checklist

### ✅ COMPLETE: Code & Scripts

- [x] MPN implementation in API (commit 4ff837c)
- [x] MPN display in CompletionCard and ExportGatePanel (commit 4ff837c)
- [x] Playwright MPN verification test (commit 5626d14)
- [x] API MPN verification script: `scripts/verify-api-mpn.sh` (commit 5626d14)
- [x] Export gate E2E script: `scripts/run_export_gate_three_times.sh` (commit 3c593cd)
- [x] Stability check script: `scripts/run_stability_check.js` (commit 3c593cd)
- [x] Axe accessibility audit script: `scripts/run-axe-on-preview.js` (commit 3c593cd)
- [x] Evidence directory structure created
- [x] HES governance policies documented
- [x] Comprehensive status report created

### 🚫 BLOCKED: Staging Access

**Required from Lisa/Platform:**

1. **Environment Variables** (set these in CI or provide to Homer):
   ```bash
   export STAGING_HOST="staging.api.shiekh.example.com"  # Or actual staging URL
   export STAGING_API_TOKEN="<bearer-token>"              # From CI/vault
   export PREVIEW_URL="https://preview.staging.shiekh.example.com"  # Preview app URL
   export VITE_E2E_ADMIN_EMAIL="theo@shiekh.com"         # Already set
   export VITE_E2E_ADMIN_PASSWORD="<password>"            # Set in CI secrets
   ```

2. **Product Confirmation** (populate this file):
   - File: `inventory/LP-phase2b-001/evidence/STAGING_PRODUCTS_NOTICE.json`
   - Confirm products exist on staging: product-0001, product-0004, product-0007
   - Confirm expected states: ready, partial, blocked

3. **Dependencies** (verify installed in execution environment):
   - Node.js 18+
   - Playwright ^1.57.0 (already in package.json)
   - axe-core (need to add `@axe-core/playwright` to package.json)
   - jq (for JSON parsing in shell scripts)
   - curl (for API calls)

---

## Exact Execution Sequence (Once Credentials Provided)

### Step 1: API MPN Verification
```bash
export STAGING_HOST="<provided>"
export STAGING_API_TOKEN="<provided>"

./scripts/verify-api-mpn.sh
# Generates:
# - inventory/LP-phase2b-001/evidence/api_product_product-0001.json
# - inventory/LP-phase2b-001/evidence/api_product_product-0004.json
# - inventory/LP-phase2b-001/evidence/api_product_product-0007.json
# - inventory/LP-phase2b-001/evidence/api_mpn_verification.log
# - inventory/LP-phase2b-001/evidence/api_product_*_summary.json

# Exit code 0 = PASS, non-zero = FAIL
```

### Step 2: Feature Flag Verification
```bash
curl -sS "https://$STAGING_HOST/api/feature-flags" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" | \
  jq '.features["features.completion.phase2b.enabled"]' \
  > inventory/LP-phase2b-001/evidence/feature_flag_config.txt

# Verify flag is true/enabled
```

### Step 3: Playwright UI E2E + MPN Checks
```bash
cd packages/web

# Run all E2E tests
npx playwright test --project=chromium --config=playwright.config.ts \
  --reporter=list > ../../inventory/LP-phase2b-001/evidence/ui_e2e_playwright.log

# Run MPN-specific tests
npx playwright test --grep "LP-phase2b-001: MPN Display Verification" \
  --project=chromium --config=playwright.config.ts \
  --reporter=list > ../../inventory/LP-phase2b-001/evidence/ui_mpn_checks.log

# Screenshots auto-saved to inventory/LP-phase2b-001/evidence/screenshots/
```

### Step 4: Export Gate 3 Consecutive Runs
```bash
export TEST_PRODUCT_ID="product-0001"
export STAGING_HOST="<provided>"
export VITE_E2E_ADMIN_PASSWORD="<provided>"

./scripts/run_export_gate_three_times.sh > \
  inventory/LP-phase2b-001/evidence/export_gate_e2e.log

# Generates 3 screenshots: /tmp/export_gate_run_{1,2,3}.png
# Move to evidence: mv /tmp/export_gate_run_*.png inventory/LP-phase2b-001/evidence/screenshots/
```

### Step 5: Stability Runs (3 identical runs × 5 flows)
```bash
export BASE_URL="https://$STAGING_HOST"
export VITE_E2E_ADMIN_PASSWORD="<provided>"

node ./scripts/run_stability_check.js --runs 3 \
  --output inventory/LP-phase2b-001/evidence/stability_runs.json

# Generates:
# - inventory/LP-phase2b-001/evidence/stability_runs.json
# - inventory/LP-phase2b-001/evidence/stability_runs_equality_proof.txt
# Exit code 0 = deterministic (all identical), non-zero = variance
```

### Step 6: Unit Tests & Axe Accessibility Audit
```bash
# Unit tests with coverage
pnpm test --filter @ropi-aoss/web -- --coverage > \
  inventory/LP-phase2b-001/evidence/unit_test_output.txt

# Axe accessibility audit
export PREVIEW_URL="<provided>"
export VITE_E2E_ADMIN_PASSWORD="<provided>"

node ./scripts/run-axe-on-preview.js $PREVIEW_URL > \
  inventory/LP-phase2b-001/evidence/axe_report.json

# Target: 0 critical, 0 serious violations
# Exit code 0 = PASS, non-zero = violations
```

### Step 7: Admin Rules Snapshot
```bash
curl -sS "https://$STAGING_HOST/api/admin/completionRules" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -o inventory/LP-phase2b-001/evidence/admin_rules_view.json

# Also capture screenshot via Playwright (add to E2E test)
```

### Step 8: i18n Strings Extraction
```bash
# Extract i18n strings from components
jq -r 'keys[]' packages/web/src/i18n/en.json | grep -i "completion\|export" > \
  inventory/LP-phase2b-001/evidence/i18n_strings_extracted.txt

# Copy full en.json
cp packages/web/src/i18n/en.json \
  inventory/LP-phase2b-001/evidence/i18n/en.json
```

---

## Post-Execution: HES Updates Required

After all commands complete successfully, Homer will update `inventory/LP-phase2b-001/HES-LP-phase2b-001.json`:

### 1. Add commands_executed[] entries

For each command above, add entry with:
- `timestamp`: ISO 8601
- `command`: Exact command executed
- `exit_code`: 0 for success, non-zero for failure
- `output_summary`: First 200 chars of output
- `evidence_path`: Path to generated artifact

### 2. Update preconditions[]

- `preconditions[1]` (Stable Engine APIs): status → "SATISFIED", evidence_path → api_product_*.json files
- `preconditions[3]` (Feature flag): status → "SATISFIED", evidence_path → feature_flag_config.txt

### 3. Update evidence_links

Point all evidence_links to actual generated files:
- `api_product_product-0001.json` ✓
- `api_product_product-0004.json` ✓
- `api_product_product-0007.json` ✓
- `api_mpn_verification.log` ✓
- `ui_e2e_playwright.log` ✓
- `ui_mpn_checks.log` ✓
- `export_gate_e2e.log` ✓
- `stability_runs.json` ✓
- `stability_runs_equality_proof.txt` ✓
- `unit_test_output.txt` ✓
- `axe_report.json` ✓
- `admin_rules_view.json` ✓
- `screenshots/*.png` ✓

### 4. Update sample_checks[] verdicts

Set `verdict: "PASS"` for each flow ONLY after:
- Stability proof shows deterministic behavior (exit code 0)
- Screenshots show MPN displayed, product_id not visible
- API responses include productIdentifiers.mpn

### 5. Update vvp.* sections

- `unit_verification.status` → "PASS" if all unit tests passed
- `unit_verification.tests_passed` → "X/Y" from unit test output
- `integration_verification.status` → "PASS" if all E2E tests passed
- `integration_verification.tests_passed` → "X/Y" from E2E output
- `accessibility_verification.status` → "PASS" if 0 critical, 0 serious violations

### 6. Keep result = "IN_PROGRESS"

Do NOT set `result: "VERIFIED_SUCCESS"` — Lisa will review and make that decision.

---

## Missing Dependency to Install

```bash
# Add axe-core Playwright integration
cd packages/web
pnpm add -D @axe-core/playwright
```

---

## Ready State Summary

| Component | Status | Blocker |
|-----------|--------|---------|
| MPN Code Implementation | ✅ DONE | None |
| API Verification Script | ✅ READY | STAGING_HOST, STAGING_API_TOKEN |
| Playwright MPN Tests | ✅ READY | STAGING_HOST, credentials |
| Export Gate E2E Script | ✅ READY | STAGING_HOST, credentials |
| Stability Check Script | ✅ READY | STAGING_HOST, credentials |
| Axe Audit Script | ✅ READY | PREVIEW_URL, credentials |
| Evidence Directory | ✅ CREATED | None |
| HES Framework | ✅ READY | None |

---

## What Homer Needs from Lisa RIGHT NOW

**Option 1: Provide Credentials Directly**
```bash
# Post these as GitHub secrets or provide in secure channel
STAGING_HOST="..."
STAGING_API_TOKEN="..."
PREVIEW_URL="..."
VITE_E2E_ADMIN_PASSWORD="..."
```

**Option 2: Confirm CI Environment Available**
If staging credentials are in CI:
- Trigger GitHub Actions workflow
- Homer will execute all steps in CI
- Artifacts pushed to evidence/ directory

**Option 3: Product ID Alternatives**
If product-0001, product-0004, product-0007 don't exist on staging:
- Provide 3 alternative product IDs
- Confirm their expected states (ready/partial/blocked)
- Homer will update test scripts

---

## Timeline Once Credentials Provided

**Immediate (< 5 minutes):**
- Step 1: API verification (3 curl calls + jq checks)
- Step 2: Feature flag check (1 curl call)

**Short (5-15 minutes):**
- Step 3: Playwright E2E + MPN tests (17 existing tests + 3 new MPN tests)
- Step 7: Admin rules snapshot (1 curl call)

**Medium (15-30 minutes):**
- Step 4: Export gate 3 runs (3 × Playwright flow)
- Step 6: Unit tests + coverage (~5-10 minutes)

**Long (30-60 minutes):**
- Step 5: Stability check (3 runs × 5 flows = 15 Playwright executions)
- Step 6: Axe audit (3 pages × WCAG checks)

**Total Estimated Time: 60-90 minutes** for full verification execution + HES updates.

---

## Homer's Commitment

Once you provide:
1. Staging credentials (STAGING_HOST, STAGING_API_TOKEN)
2. Preview URL (or confirm it's same as STAGING_HOST)
3. Test credentials (VITE_E2E_ADMIN_PASSWORD)
4. Product confirmation (or alternatives to product-0001/0004/0007)

I will **immediately execute all 7 steps** and **update HES with truthful evidence**. No fake outputs, no mock data — only real staging verification results.

**Current Branch:** feature/lp-phase2b-001-ui-export-gate  
**Current Commit:** 3c593cd  
**Status:** READY TO EXECUTE — AWAITING CREDENTIALS
