# HES C Verification Plan — LP-export-ui-attr-fix-1.0.0

**Status:** READY FOR EXECUTION (awaiting deploy completion)  
**Deploy Commit:** 8e0b80c  
**PR:** #459  
**Target:** https://ropi-aoss-staging.web.app

---

## Prerequisites

- [ ] Staging deploy of commit `8e0b80c` completed successfully
- [ ] Deploy run ID and URL recorded
- [ ] Staging URL accessible and responsive
- [ ] Service account confirmation obtained
- [ ] Access to Firestore console for raw JSON dumps
- [ ] Browser DevTools ready for network capture
- [ ] Feature flag toggle access confirmed

---

## Step 1 — Baseline (SITE_SCOPED = OFF)

**Objective:** Capture system state with classification attribute enforcement disabled.

### Actions:
1. **Ensure SITE_SCOPED OFF:**
   - Check Firestore: `settings/exportSettings` → verify `exportGlobalMode` is `false` or absent
   - If present and `true`, set to `false` and wait 30s for cache refresh
   - Document exact toggle steps and actor performing toggle

2. **Capture Readiness API:**
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://ropi-bccee.web.app/api/export/readiness > readiness-baseline.json
   ```
   - Save to: `evidence/lp-export-ui-attr-fix/baseline/readiness-baseline.json`
   - Verify: `mode` field should be absent
   - Verify: `productLevelReadiness` should be absent
   - Verify: `siteStatus` should be present

3. **Capture Product Completion (sample product):**
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://ropi-bccee.web.app/api/products/{PRODUCT_ID}/completion > product-completion-baseline.json
   ```
   - Use a representative product (suggest: `18-test` or `211737-90h1-8`)
   - Save to: `evidence/lp-export-ui-attr-fix/baseline/product-completion-baseline.json`

4. **UI Screenshots:**
   - Open staging UI: https://ropi-aoss-staging.web.app
   - Navigate to Export Readiness view
   - Capture full-page screenshot → `baseline/ui-screenshots/export-readiness-baseline.png`
   - Navigate to VVP for sample product
   - Capture VVP screenshot → `baseline/ui-screenshots/vvp-baseline-product-X.png`

5. **Firestore Full JSON:**
   - Dump `settings/attributesMeta` (via Firestore console "Export document"):
     ```
     Save to: baseline/firestore-baseline/settings-attributesMeta.json
     ```
   - Dump one classification attribute document (e.g., `attributes/product_classification`):
     ```
     Save to: baseline/firestore-baseline/attribute-doc-sample.json
     ```
   - Include timestamp in filenames

### Deliverables:
- [ ] `readiness-baseline.json`
- [ ] `product-completion-baseline.json`
- [ ] `baseline/ui-screenshots/` (at least 2 screenshots)
- [ ] `baseline/firestore-baseline/` (2 JSON files)
- [ ] `baseline/toggle-evidence.txt` (actor, timestamp, Firestore path, value set)

---

## Step 2 — GLOBAL Mode Verification

**Objective:** Demonstrate classification attribute enforcement when GLOBAL mode enabled.

### Actions:
1. **Toggle to GLOBAL = ON:**
   - Set Firestore: `settings/exportSettings.exportGlobalMode = true`
   - Document exact toggle steps and actor
   - Wait 30s for cache refresh
   - Save toggle evidence → `global-mode/toggle-evidence.txt`

2. **Capture Readiness API:**
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://ropi-bccee.web.app/api/export/readiness > readiness-global.json
   ```
   - Save to: `evidence/lp-export-ui-attr-fix/global-mode/readiness-global.json`
   - Verify: `mode` field === `'GLOBAL'`
   - Verify: `productLevelReadiness` is present
   - Verify: `siteStatus` is still present (backward compatibility)

3. **Capture Product Completion:**
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://ropi-bccee.web.app/api/products/{PRODUCT_ID}/completion > product-completion-global.json
   ```
   - Same product as Step 1
   - Save to: `evidence/lp-export-ui-attr-fix/global-mode/product-completion-global.json`

4. **Capture Required Attributes at Runtime:**
   ```bash
   curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
     https://ropi-bccee.web.app/api/export/required-attributes > required-attributes-runtime.json
   ```
   - Save to: `evidence/lp-export-ui-attr-fix/global-mode/required-attributes-runtime.json`
   - **CRITICAL:** Verify this lists classification attributes
   - Verify snake_case and camelCase variants are normalized

5. **UI Screenshots:**
   - Refresh staging UI (clear cache if needed)
   - Navigate to Export Readiness view
   - Capture full-page screenshot → `global-mode/ui-screenshots/export-readiness-global.png`
   - Navigate to VVP for same sample product
   - Capture VVP screenshot → `global-mode/ui-screenshots/vvp-global-product-X.png`
   - Verify UI reflects GLOBAL mode indicators (if any)

### Deliverables:
- [ ] `readiness-global.json`
- [ ] `product-completion-global.json`
- [ ] `required-attributes-runtime.json` (must list classification attrs)
- [ ] `global-mode/ui-screenshots/` (at least 2 screenshots)
- [ ] `global-mode/toggle-evidence.txt`

---

## Step 3 — Classification Attribute Enforcement

**Objective:** Demonstrate normalization and enforcement of classification attributes.

### Actions:
1. **Identify Classification Attributes:**
   - From `required-attributes-runtime.json`, select 3-5 classification attributes
   - Ensure mix of:
     - Snake_case original (e.g., `product_classification`)
     - CamelCase original (e.g., `productClassification`)
     - Legacy names (if present)

2. **Capture Enforcement Evidence:**
   - For each attribute:
     - Original attribute key (as in Firestore)
     - Original flag names (`required_for_export`, `requiredForExport`, legacy)
     - Normalized flag name (result of normalization)
     - Normalized flag value (true/false)
     - Resulting completion decision (complete/incomplete)
   - Save to: `classification/classification-enforcement.json`
   - Format:
     ```json
     {
       "attributes": [
         {
           "attributeKey": "product_classification",
           "originalFlags": {
             "required_for_export": true
           },
           "normalizedFlagName": "requiredForExport",
           "normalizedFlagValue": true,
           "enforcementResult": "required for GLOBAL mode"
         },
         ...
       ]
     }
     ```

3. **Before/After VVP Screenshots:**
   - Choose a product that has classification attributes incomplete
   - Capture VVP screenshot (GLOBAL OFF) → `classification/vvp-screenshots/before-enforcement.png`
   - Capture VVP screenshot (GLOBAL ON) → `classification/vvp-screenshots/after-enforcement.png`
   - Highlight differences (e.g., completion % change, export gate status)

4. **Firestore Persistence (if enforcement writes):**
   - Check if enforcement logic writes to Firestore
   - If yes, dump affected documents → `classification/firestore-enforcement/`
   - If no, document that enforcement is read-only

### Deliverables:
- [ ] `classification-enforcement.json`
- [ ] `classification/vvp-screenshots/` (before/after)
- [ ] `classification/firestore-enforcement/` (if applicable)

---

## Step 4 — VVP Demonstration

**Objective:** Run VVP flows for canonical products and capture evidence.

### Actions:
1. **Select Canonical Products:**
   - From PR #459 or HES A, identify test products:
     - Suggested: `18-test`, `211737-90h1-8`
   - Use at least 2 products for demonstration

2. **Run VVP Flows (GLOBAL ON):**
   - For each product:
     - Open VVP in staging UI
     - Capture full VVP screen → `vvp/vvp-ui-global/product-{ID}/vvp-overview.png`
     - Navigate through attribute sections (required, classification, etc.)
     - Capture section screenshots → `vvp/vvp-ui-global/product-{ID}/section-{NAME}.png`
     - Document any enforcement messages or warnings
     - Capture HTML/DOM if enforcement logic affects rendering:
       ```
       Right-click → Inspect → Copy outer HTML
       Save to: vvp/vvp-ui-global/product-{ID}/dom-snapshot.html
       ```

3. **API Calls for VVP:**
   - Capture exact API requests used by VVP:
     ```bash
     # Example
     curl -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
       https://ropi-bccee.web.app/api/products/18-test/vvp > vvp-18-test-response.json
     ```
   - Save to: `vvp/vvp-ui-global/product-{ID}/api-response.json`
   - Document commands → `vvp/commands-used.txt`

### Deliverables:
- [ ] `vvp/vvp-ui-global/product-18-test/` (screenshots, HTML, API responses)
- [ ] `vvp/vvp-ui-global/product-211737-90h1-8/` (screenshots, HTML, API responses)
- [ ] `vvp/commands-used.txt`

---

## Step 5 — Network Evidence

**Objective:** Capture request/response traces to demonstrate API behavior changes.

### Actions:
1. **Setup Network Capture:**
   - Open Chrome DevTools → Network tab
   - Enable "Preserve log"
   - Filter by XHR/Fetch

2. **Capture Attribute Save (if applicable):**
   - In staging UI, edit an attribute and save
   - Capture request/response from DevTools:
     - Right-click on request → Copy → Copy as cURL
     - Right-click on request → Copy → Copy response
   - Save to: `network/attr-save-network.json`
   - Format:
     ```json
     {
       "timestamp": "2026-01-08T12:34:56Z",
       "request": {
         "method": "POST",
         "url": "...",
         "headers": {...},
         "body": {...}
       },
       "response": {
         "status": 200,
         "headers": {...},
         "body": {...}
       }
     }
     ```

3. **Capture Completion Fetch (before & after GLOBAL):**
   - GLOBAL OFF: Fetch product completion → `network/completion-fetch-baseline.json`
   - GLOBAL ON: Fetch product completion → `network/completion-fetch-global.json`
   - Include headers, bodies, timestamps
   - Match to UI screenshots (include screenshot filename in JSON)

4. **Capture Readiness Fetch (before & after GLOBAL):**
   - GLOBAL OFF: Fetch catalog readiness → `network/readiness-fetch-baseline.json`
   - GLOBAL ON: Fetch catalog readiness → `network/readiness-fetch-global.json`
   - Include headers, bodies, timestamps
   - Match to UI screenshots

### Deliverables:
- [ ] `network/attr-save-network.json` (if applicable)
- [ ] `network/completion-fetch-baseline.json`
- [ ] `network/completion-fetch-global.json`
- [ ] `network/readiness-fetch-baseline.json`
- [ ] `network/readiness-fetch-global.json`
- [ ] Each JSON includes matching UI screenshot reference

---

## Step 6 — Persistence Bug Reproduction

**Objective:** Attempt to reproduce the persistence bug from HES A (if applicable).

### Context:
- HES A (LP-export-ui-attr-triage-1.0.0) identified a persistence bug
- Bug: Certain attribute flags not persisting to Firestore correctly
- PR #459 includes normalization fix — verify bug is resolved

### Actions:
1. **Review HES A Bug Description:**
   - Read: `docs/HES_A_LP-export-ui-attr-triage-1.0.0.json`
   - Identify exact steps to reproduce persistence bug
   - Document steps → `persistence/reproduction-steps.txt`

2. **Attempt Reproduction:**
   - Follow exact steps from HES A
   - Try to trigger persistence bug in staging
   - Capture:
     - UI actions (screenshots of each step)
     - Firestore state before action → `persistence/firestore-before.json`
     - Firestore state after action → `persistence/firestore-after.json`
     - API request/response if applicable

3. **Record Outcome:**
   - If bug reproduced: Document evidence → `persistence/bug-reproduced.json`
   - If bug NOT reproduced: Document negative evidence → `persistence/bug-not-reproduced.json`
   - Include:
     - Steps taken
     - Expected result (bug behavior)
     - Actual result
     - Firestore documents (raw JSON)
     - Hypothesis for why bug did/did not reproduce

### Deliverables:
- [ ] `persistence/reproduction-steps.txt`
- [ ] `persistence/persistence-repro.json`
- [ ] `persistence/firestore-persisted-state/` (before/after JSON)
- [ ] If not reproducible: Evidence showing attempts and why it didn't reproduce

---

## Step 7 — HES C Manifest Creation

**Objective:** Create governance-compliant HES C manifest.

### Template: `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json`

```json
{
  "from": "Homer",
  "to": "Lisa",
  "lp": "LP-export-ui-attr-fix-1.0.0",
  "date": "2026-01-08T__:__:__Z",
  "checkpoint": "C",
  "title": "HES C - Staging Verification for Attribute Normalization",
  "deployInfo": {
    "prNumber": 459,
    "prURL": "https://github.com/twgallo13/ROPI-V2.1/pull/459",
    "mergeCommitSHA": "8e0b80c805f1c30defad6e8f11ffe13f09f2aa0b",
    "mergedAt": "2026-01-07T09:36:39Z",
    "stagingDeployRunId": "__FILL_FROM_MAINTAINER__",
    "stagingDeployURL": "__FILL_FROM_MAINTAINER__",
    "deployStatus": "__success_or_failure__",
    "deployedCommitSHA": "8e0b80c",
    "deployedAt": "__FILL_FROM_MAINTAINER__",
    "serviceAccountUsed": "__FILL_FROM_MAINTAINER__",
    "secretsUsed": ["GCP_SA_KEY_BASE64", "VITE_FIREBASE_API_KEY"],
    "stagingURLs": {
      "stable": "https://ropi-aoss-staging.web.app",
      "preview": "__FILL_IF_CREATED__"
    }
  },
  "verification": {
    "step_1_baseline": {
      "status": "__PASS_or_FAIL__",
      "artifacts": [
        "evidence/lp-export-ui-attr-fix/baseline/readiness-baseline.json",
        "evidence/lp-export-ui-attr-fix/baseline/product-completion-baseline.json",
        "evidence/lp-export-ui-attr-fix/baseline/ui-screenshots/",
        "evidence/lp-export-ui-attr-fix/baseline/firestore-baseline/"
      ]
    },
    "step_2_global_mode": {
      "status": "__PASS_or_FAIL__",
      "artifacts": [
        "evidence/lp-export-ui-attr-fix/global-mode/readiness-global.json",
        "evidence/lp-export-ui-attr-fix/global-mode/product-completion-global.json",
        "evidence/lp-export-ui-attr-fix/global-mode/required-attributes-runtime.json",
        "evidence/lp-export-ui-attr-fix/global-mode/ui-screenshots/"
      ]
    },
    "step_3_classification_enforcement": {
      "status": "__PASS_or_FAIL__",
      "artifacts": [
        "evidence/lp-export-ui-attr-fix/classification/classification-enforcement.json",
        "evidence/lp-export-ui-attr-fix/classification/vvp-screenshots/"
      ]
    },
    "step_4_vvp_demonstration": {
      "status": "__PASS_or_FAIL__",
      "artifacts": [
        "evidence/lp-export-ui-attr-fix/vvp/vvp-ui-global/",
        "evidence/lp-export-ui-attr-fix/vvp/commands-used.txt"
      ]
    },
    "step_5_network_evidence": {
      "status": "__PASS_or_FAIL__",
      "artifacts": [
        "evidence/lp-export-ui-attr-fix/network/attr-save-network.json",
        "evidence/lp-export-ui-attr-fix/network/completion-fetch-network.json",
        "evidence/lp-export-ui-attr-fix/network/readiness-fetch-network.json"
      ]
    },
    "step_6_persistence_bug": {
      "status": "__PASS_or_FAIL__",
      "artifacts": [
        "evidence/lp-export-ui-attr-fix/persistence/persistence-repro.json",
        "evidence/lp-export-ui-attr-fix/persistence/firestore-persisted-state/"
      ]
    }
  },
  "ciRunIDs": [
    "__FILL_WITH_CI_RUNS__"
  ],
  "firestoreEvidence": {
    "attributesMetaDoc": "evidence/lp-export-ui-attr-fix/baseline/firestore-baseline/settings-attributesMeta.json",
    "attributeDocSample": "evidence/lp-export-ui-attr-fix/baseline/firestore-baseline/attribute-doc-sample.json"
  },
  "commandOutputs": [
    "evidence/lp-export-ui-attr-fix/vvp/commands-used.txt",
    "evidence/lp-export-ui-attr-fix/deploy/deploy-logs.txt"
  ],
  "result": "__VERIFIED_SUCCESS_or_VERIFIED_FAILURE__",
  "resultJustification": "__1-2_sentence_summary__",
  "summary": {
    "normalization": "__WORKING_or_BROKEN__",
    "classification_enforcement": "__WORKING_or_BROKEN__",
    "backward_compatibility": "__VERIFIED_or_REGRESSED__",
    "persistence_bug": "__RESOLVED_or_PERSISTS__"
  },
  "nextSteps": [
    "Review HES C artifacts",
    "Approve or request changes",
    "Proceed with next LP phase"
  ]
}
```

### Actions:
1. Fill in all placeholders with actual values
2. Ensure all artifact paths are correct and files exist
3. Include explicit `VERIFIED SUCCESS` or `VERIFIED FAILURE` in `result` field
4. Add 1-2 sentence justification in `resultJustification`

### Deliverables:
- [ ] `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json` (complete)

---

## Step 8 — Consolidated Package Creation

**Objective:** Create single consolidated artifact package for Lisa.

### Actions:
1. **Create Consolidated Archive:**
   ```bash
   cd /workspaces/ROPI-V2.1/evidence/lp-export-ui-attr-fix
   zip -r HES_CONSOLIDATED.zip \
     deploy/ \
     baseline/ \
     global-mode/ \
     classification/ \
     vvp/ \
     network/ \
     persistence/ \
     README.md \
     VERIFICATION_PLAN.md
   mv HES_CONSOLIDATED.zip consolidated/
   ```

2. **Include Manifest in Archive Root:**
   ```bash
   cp /workspaces/ROPI-V2.1/docs/HES_C_LP-export-ui-attr-fix-1.0.0.json \
      /workspaces/ROPI-V2.1/evidence/lp-export-ui-attr-fix/HES_C_manifest.json
   # Re-zip to include manifest
   cd /workspaces/ROPI-V2.1/evidence/lp-export-ui-attr-fix
   zip HES_CONSOLIDATED.zip HES_C_manifest.json
   mv HES_CONSOLIDATED.zip consolidated/
   ```

3. **Verify Archive Contents:**
   ```bash
   unzip -l consolidated/HES_CONSOLIDATED.zip
   ```
   - Ensure all expected files are present
   - Verify archive size is reasonable (<50MB if possible)

4. **Generate Checksums:**
   ```bash
   sha256sum consolidated/HES_CONSOLIDATED.zip > consolidated/HES_CONSOLIDATED.sha256
   ```

### Deliverables:
- [ ] `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.zip`
- [ ] `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.sha256`
- [ ] Archive verified via `unzip -t`

---

## Important Checks & Confirmations

Before returning evidence to Lisa:

- [ ] All Firestore reads are raw JSON dumps (no screenshots only)
- [ ] Each artifact links to immutable reference (workflow run, log URL, timestamp)
- [ ] Manifest includes explicit `VERIFIED SUCCESS` or `VERIFIED FAILURE`
- [ ] If any step failed, raw logs included with `VERIFIED FAILURE` entry (no interpretation)
- [ ] All timestamps are UTC
- [ ] Deployed commit SHA (8e0b80c) confirmed on each artifact
- [ ] Network captures include headers, bodies, timestamps, and matching UI screenshot references
- [ ] HES_CONSOLIDATED.zip contains all expected files

---

## Execution Timeline (Estimated)

| Step | Est. Time | Status |
|------|-----------|--------|
| Deploy Completion | ~10 min | ⏳ PENDING MAINTAINER |
| Step 1: Baseline | ~20 min | ⏳ AWAITING DEPLOY |
| Step 2: GLOBAL Mode | ~20 min | ⏳ AWAITING DEPLOY |
| Step 3: Classification | ~30 min | ⏳ AWAITING DEPLOY |
| Step 4: VVP Demo | ~30 min | ⏳ AWAITING DEPLOY |
| Step 5: Network | ~15 min | ⏳ AWAITING DEPLOY |
| Step 6: Persistence | ~20 min | ⏳ AWAITING DEPLOY |
| Step 7: Manifest | ~15 min | ⏳ AWAITING DEPLOY |
| Step 8: Consolidation | ~10 min | ⏳ AWAITING DEPLOY |
| **Total** | **~2.5 hrs** | ⏳ AWAITING DEPLOY |

---

## Contact / Questions

- Issue tracker: PR #459
- Orchestrator: Lisa
- Agent: Homer
- Repository: twgallo13/ROPI-V2.1
