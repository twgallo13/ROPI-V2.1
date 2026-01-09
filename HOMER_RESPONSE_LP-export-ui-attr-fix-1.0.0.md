# HOMER RESPONSE — LP-export-ui-attr-fix-1.0.0 HES C Orchestration

**From:** Homer (GitHub Copilot Agent)  
**To:** Lisa (Orchestrator)  
**Date:** 2026-01-08  
**Status:** READY FOR MAINTAINER DEPLOY  

---

## Executive Summary

I have prepared all materials for HES C verification of LP-export-ui-attr-fix-1.0.0 (PR #459, commit `8e0b80c`). However, I cannot dispatch the staging workflow due to insufficient permissions.

**Key Finding:** The `GITHUB_TOKEN` in this Codespace lacks `workflow` dispatch scope, resulting in `403 Resource not accessible by integration` error.

**Action Required:** A repository maintainer must run the workflow. All preparation materials and post-deploy verification plans are ready.

---

## What I Attempted

### Workflow Dispatch Attempt

```bash
gh workflow run 212118351 --ref 8e0b80c
```

**Result:**
```
could not create workflow dispatch event: HTTP 403: Resource not accessible by integration
(https://api.github.com/repos/twgallo13/ROPI-V2.1/actions/workflows/212118351/dispatches)
```

**Verification:**
- ✅ Authenticated with gh CLI (token: `ghu_****`, account: `twgallo13`)
- ✅ Workflow ID `212118351` exists and is active ("Deploy AOSS Staging")
- ✅ Commit `8e0b80c` exists (PR #459 merge commit)
- ✅ PR #459 is merged and closed
- ❌ Token lacks `workflow` scope (fine-grained or classic PAT with `repo + workflow` required)

---

## What I Prepared

### 1. Maintainer Deploy Request

**File:** [MAINTAINER_DEPLOY_REQUEST.md](../MAINTAINER_DEPLOY_REQUEST.md)

Copy-paste message for maintainer with:
- Exact workflow dispatch command (UI & CLI options)
- Required return information (9 specific items)
- Verification checklist
- Context and contact info

### 2. HES C Evidence Structure

**Directory:** `evidence/lp-export-ui-attr-fix/`

Complete directory structure created with:
- `README.md` — Evidence collection overview
- `VERIFICATION_PLAN.md` — Step-by-step HES C execution plan (8 steps)
- `execute_hes_c.sh` — Automated execution script (Steps 1-2 + manual guidance for 3-8)
- `collect_deploy_info.sh` — Helper to extract deploy metadata from workflow run
- Subdirectories for all evidence types (baseline, global-mode, classification, vvp, network, persistence, consolidated)

### 3. HES C Manifest Template

**File:** [docs/HES_C_LP-export-ui-attr-fix-1.0.0.json](../docs/HES_C_LP-export-ui-attr-fix-1.0.0.json)

Governance-compliant manifest with:
- Required HES fields (`from`, `to`, `lp`, `checkpoint`, etc.)
- Placeholders for maintainer-provided deploy info
- Complete verification structure (6 steps, each with checks and artifacts)
- Fields for CI run IDs, Firestore evidence, command outputs
- `result` and `resultJustification` (to be filled after verification)

### 4. Helper Scripts

**collect_deploy_info.sh:**
- Fetches workflow run details via GitHub API
- Extracts deploy metadata (run ID, URL, status, commit SHA, timestamps)
- Downloads job logs and parses service account info
- Creates `deploy-summary.json` for easy copy-paste into HES C manifest

**execute_hes_c.sh:**
- Automated API calls for Steps 1-2 (baseline & GLOBAL mode)
- Uses `gcloud auth print-identity-token` for authentication
- Pretty-prints JSON responses with `jq`
- Includes manual step prompts for UI screenshots and Firestore exports
- Guidance for remaining Steps 3-8 (classification, VVP, network, persistence, manifest, consolidation)

---

## Repository Maintainer Instructions

### Option A: You Run the Workflow

If you have a GitHub token with `workflow` dispatch scope:

```bash
# Authenticate (if not already)
echo $YOUR_PAT | gh auth login --with-token

# Dispatch workflow for commit 8e0b80c
gh workflow run 212118351 --ref 8e0b80c

# Monitor progress
gh run watch

# Get run ID when complete
gh run list --workflow=deploy-staging.yml --limit 1
```

**Return to Homer:**
- Workflow run ID
- Full Actions run URL
- Staging hosting URLs (stable + preview if created)
- Deploy logs URL
- Service account email used
- Confirmation of secrets used (`GCP_SA_KEY_BASE64`, `FIREBASE_TOKEN`)
- Deploy completion timestamp (UTC)
- Attribute registry sync confirmation
- Feature flag toggle access info

### Option B: Ask Maintainer to Run It

**Send this message to maintainer:**

```
Please run the "Deploy AOSS Staging" workflow (ID 212118351) for commit 8e0b80c.

UI: Actions → Deploy AOSS Staging → Run workflow → set ref=8e0b80c → Run
Or CLI: gh workflow run 212118351 --ref 8e0b80c

When complete, please provide:
- Deploy workflow run ID and full URL
- Staging URLs (stable + preview)
- Deploy logs URL
- Service account used (e.g., ropi-deploy-sa@ropi-bccee)
- Confirmation that GCP_SA_KEY_BASE64 / FIREBASE_TOKEN were used
- Attribute registry sync status
- Feature flag toggle access (who can toggle SITE_SCOPED / GLOBAL)
- Deploy completion timestamp

See MAINTAINER_DEPLOY_REQUEST.md for full details.
```

---

## Post-Deploy Workflow (for Homer)

Once maintainer provides deploy confirmation:

### Step 1: Collect Deploy Info

```bash
cd /workspaces/ROPI-V2.1/evidence/lp-export-ui-attr-fix
./collect_deploy_info.sh <RUN_ID>
```

This creates:
- `deploy/deploy-run-info.json` (full workflow run metadata)
- `deploy/deploy-logs.txt` (job logs)
- `deploy/service-account-evidence.txt` (SA email)
- `deploy/deploy-summary.json` (values for HES C manifest)

### Step 2: Update HES C Manifest

Copy values from `deploy/deploy-summary.json` into `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json`:
- `stagingDeployRunId`
- `stagingDeployURL`
- `deployStatus`
- `deployedCommitSHA`
- `deployedAt`
- `serviceAccountUsed`
- `stagingURLs`

Fill in from maintainer response:
- `attributeRegistrySync`
- `featureFlagAccess` (who can toggle, where configured)

### Step 3: Execute HES C Verification

```bash
cd /workspaces/ROPI-V2.1/evidence/lp-export-ui-attr-fix
./execute_hes_c.sh
```

This automates Steps 1-2 (baseline & GLOBAL mode API calls) and provides guidance for Steps 3-8 (manual steps requiring UI interaction, network captures, etc.).

**Estimated time:** 2.5 hours total

### Step 4: Complete HES C Manifest

After all verification steps:
1. Fill in all `__PASS_or_FAIL__` placeholders in manifest
2. Add `result` field: `VERIFIED SUCCESS` or `VERIFIED FAILURE`
3. Add `resultJustification` (1-2 sentence summary)
4. List all CI run IDs (from PR checks)
5. Verify all artifact paths are correct

### Step 5: Create Consolidated Package

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

# Add manifest to archive root
cp /workspaces/ROPI-V2.1/docs/HES_C_LP-export-ui-attr-fix-1.0.0.json \
   HES_C_manifest.json
zip HES_CONSOLIDATED.zip HES_C_manifest.json

# Move to consolidated directory
mkdir -p consolidated
mv HES_CONSOLIDATED.zip consolidated/

# Generate checksum
sha256sum consolidated/HES_CONSOLIDATED.zip > consolidated/HES_CONSOLIDATED.sha256

# Verify
unzip -t consolidated/HES_CONSOLIDATED.zip
```

### Step 6: Return to Lisa

Deliverables:
1. `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json` (complete manifest)
2. `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.zip` (all evidence)
3. `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.sha256` (checksum)

---

## Verification Plan Summary

| Step | Description | Automation | Est. Time |
|------|-------------|------------|-----------|
| 0 | Deploy completion | **MANUAL** (maintainer) | ~10 min |
| 1 | Baseline (SITE_SCOPED OFF) | **AUTOMATED** (API calls) + manual (UI/Firestore) | ~20 min |
| 2 | GLOBAL mode verification | **AUTOMATED** (API calls) + manual (UI/Firestore) | ~20 min |
| 3 | Classification enforcement | **MANUAL** (analysis + screenshots) | ~30 min |
| 4 | VVP demonstration | **MANUAL** (UI flows + screenshots) | ~30 min |
| 5 | Network evidence | **MANUAL** (DevTools captures) | ~15 min |
| 6 | Persistence bug reproduction | **MANUAL** (repro attempt + Firestore) | ~20 min |
| 7 | HES C manifest completion | **MANUAL** (fill template) | ~15 min |
| 8 | Consolidated package creation | **AUTOMATED** (zip + checksum) | ~10 min |

**Total:** ~2.5 hours (after deploy completes)

---

## Key Evidence Files (Post-Verification)

### Mandatory Artifacts

| Category | Files | Status |
|----------|-------|--------|
| Deploy | `deploy/deploy-run-info.json`, `deploy/deploy-logs.txt`, `deploy/service-account-evidence.txt` | ⏳ PENDING |
| Baseline | `baseline/readiness-baseline.json`, `baseline/product-completion-baseline.json`, `baseline/ui-screenshots/`, `baseline/firestore-baseline/` | ⏳ PENDING |
| GLOBAL | `global-mode/readiness-global.json`, `global-mode/product-completion-global.json`, `global-mode/required-attributes-runtime.json`, `global-mode/ui-screenshots/` | ⏳ PENDING |
| Classification | `classification/classification-enforcement.json`, `classification/vvp-screenshots/` | ⏳ PENDING |
| VVP | `vvp/vvp-ui-global/product-18-test/`, `vvp/vvp-ui-global/product-211737-90h1-8/`, `vvp/commands-used.txt` | ⏳ PENDING |
| Network | `network/attr-save-network.json`, `network/completion-fetch-network.json`, `network/readiness-fetch-network.json` | ⏳ PENDING |
| Persistence | `persistence/persistence-repro.json`, `persistence/firestore-persisted-state/` | ⏳ PENDING |
| Manifest | `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json` | ✅ TEMPLATE READY |
| Consolidated | `evidence/lp-export-ui-attr-fix/consolidated/HES_CONSOLIDATED.zip` | ⏳ PENDING |

---

## Governance Compliance Checklist

Before returning to Lisa:

- [ ] HES C manifest includes all required fields per `GOVERNANCE.md`
- [ ] All Firestore reads are raw JSON dumps (no screenshots only)
- [ ] Each artifact links to immutable reference (run ID, URL, timestamp)
- [ ] Manifest includes explicit `VERIFIED SUCCESS` or `VERIFIED FAILURE`
- [ ] If any step failed, raw logs included with `VERIFIED FAILURE` entry
- [ ] All timestamps are UTC
- [ ] Deployed commit SHA (`8e0b80c`) confirmed on each artifact
- [ ] Network captures include headers, bodies, timestamps, matching UI screenshot references
- [ ] `HES_CONSOLIDATED.zip` contains all expected files
- [ ] `HES_CONSOLIDATED.sha256` checksum generated and verified

---

## Current Blockers

1. **Workflow Dispatch Permission** — `GITHUB_TOKEN` lacks `workflow` scope
2. **Maintainer Availability** — Awaiting maintainer to run workflow

---

## Communication Status

**Message Prepared For:**
- Repository maintainer (via `MAINTAINER_DEPLOY_REQUEST.md`)
- Lisa (this document)

**Message Content:**
- Clear action required (run workflow for commit `8e0b80c`)
- Exact commands (UI & CLI)
- Required return information (9 specific items)
- Verification checklist
- Context and contact info

---

## Next Action

**OPTION 1 — I Have a Token:**  
If you (Lisa) or Infrastructure can provide a token with `workflow` scope, I can run:
```bash
echo $HOMER_PAT | gh auth login --with-token
gh workflow run 212118351 --ref 8e0b80c
```

**OPTION 2 — Ask Maintainer:**  
Send the message in `MAINTAINER_DEPLOY_REQUEST.md` to a repository maintainer with write access.

**OPTION 3 — Invite Homer-bot:**  
If you want Infrastructure to create a machine account with proper scopes, let me know and I'll provide invitation & token instructions.

---

## Files Created / Modified

### Created:
- `MAINTAINER_DEPLOY_REQUEST.md` (root)
- `evidence/lp-export-ui-attr-fix/README.md`
- `evidence/lp-export-ui-attr-fix/VERIFICATION_PLAN.md`
- `evidence/lp-export-ui-attr-fix/execute_hes_c.sh`
- `evidence/lp-export-ui-attr-fix/collect_deploy_info.sh`
- `docs/HES_C_LP-export-ui-attr-fix-1.0.0.json` (template)
- `HOMER_RESPONSE_LP-export-ui-attr-fix-1.0.0.md` (this file)

### Modified:
- None

### Directories Created:
- `evidence/lp-export-ui-attr-fix/`
- `evidence/lp-export-ui-attr-fix/{deploy,baseline,global-mode,classification,vvp,network,persistence,consolidated}/`
- `evidence/lp-export-ui-attr-fix/baseline/{ui-screenshots,firestore-baseline}/`
- `evidence/lp-export-ui-attr-fix/global-mode/ui-screenshots/`
- `evidence/lp-export-ui-attr-fix/classification/{vvp-screenshots,firestore-enforcement}/`
- `evidence/lp-export-ui-attr-fix/vvp/vvp-ui-global/`
- `evidence/lp-export-ui-attr-fix/persistence/firestore-persisted-state/`

---

## Commit Recommendation

**Branch:** `aoss-main` (already merged via PR #459)  
**Files to Add:**
```bash
git add MAINTAINER_DEPLOY_REQUEST.md
git add evidence/lp-export-ui-attr-fix/
git add docs/HES_C_LP-export-ui-attr-fix-1.0.0.json
git add HOMER_RESPONSE_LP-export-ui-attr-fix-1.0.0.md
git commit -m "docs: HES C preparation for LP-export-ui-attr-fix-1.0.0

- Add maintainer deploy request with exact workflow dispatch command
- Create HES C evidence structure and verification plan
- Add automated helper scripts (execute_hes_c.sh, collect_deploy_info.sh)
- Create HES C manifest template (governance-compliant)
- Prepare for post-deploy verification (2.5 hour timeline)

Context: PR #459 (commit 8e0b80c) requires staging deploy for HES C.
GITHUB_TOKEN lacks workflow scope; maintainer must dispatch workflow.

Related: LP-export-ui-attr-fix-1.0.0, PR #459, HES C orchestration (Lisa)"
```

---

## Summary for Lisa

**Current Status:** READY FOR MAINTAINER DEPLOY

**What Homer Did:**
1. ✅ Verified PR #459 merged (commit `8e0b80c`)
2. ✅ Verified workflow ID `212118351` exists
3. ✅ Attempted workflow dispatch → 403 (insufficient permissions)
4. ✅ Prepared maintainer deploy request (exact commands + required return info)
5. ✅ Created HES C evidence structure (complete directory tree)
6. ✅ Created HES C verification plan (8 steps, 2.5 hours)
7. ✅ Created automated helper scripts (API calls, deploy info extraction)
8. ✅ Created HES C manifest template (governance-compliant)

**What Homer Needs:**
1. ⏳ Maintainer to run workflow (`gh workflow run 212118351 --ref 8e0b80c`)
2. ⏳ Maintainer to return 9 specific items (see `MAINTAINER_DEPLOY_REQUEST.md`)

**What Happens Next:**
1. Homer collects deploy info via `collect_deploy_info.sh`
2. Homer updates HES C manifest with deploy metadata
3. Homer executes HES C verification via `execute_hes_c.sh` (2.5 hours)
4. Homer completes HES C manifest (`VERIFIED SUCCESS` or `VERIFIED FAILURE`)
5. Homer creates consolidated package (`HES_CONSOLIDATED.zip`)
6. Homer returns to Lisa with manifest + consolidated evidence

**Timeline:**
- Maintainer deploy: ~10 minutes
- HES C verification: ~2.5 hours
- **Total: ~2.75 hours** (after maintainer completes deploy)

**Recommendation:**
- Send `MAINTAINER_DEPLOY_REQUEST.md` to a maintainer immediately
- Homer will execute HES C when deploy completes
- Homer will return consolidated package to Lisa

---

**Homer** — Ready to proceed pending maintainer deploy  
**2026-01-08**
