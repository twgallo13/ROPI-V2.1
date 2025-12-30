# HOMER LP-obs-studio-cleanup-prepare-1.5.0 HES

> **Homer Execution Summary (HES)**  
> **LP:** LP-obs-studio-cleanup-prepare-1.5.0  
> **Type:** PREPARE (non-destructive)  
> **Executed:** 2025-12-30T19:44:46Z  
> **Outcome:** PREPARED (with caveats)

---

## Summary

Prepare LP executed successfully. All preparation artifacts generated. The staging dry-run was executed but shows insufficient data (only 2 observations in staging environment). A production dry-run (read-only) is recommended before proceeding with the Apply LP.

---

## Deliverables

### 1. Dry-Run Report

| Field | Value |
|-------|-------|
| **DRY_RUN_GCS_PATH** | `gs://ropi-aoss-backups/dryruns/migrate-observations-tags.dryrun.20251230T194446Z.json` |
| **DRY_RUN_STATUS** | ⚠️ INSUFFICIENT_DATA |
| **Reason** | Staging has only 2 observations; metrics not representative |

**Metrics:**
| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| meanConfidence | 0.85 (85%) | ≥ 0.80 | ✅ PASS |
| conflictRate | 0.50 (50%) | ≤ 0.05 | ❌ FAIL* |
| anomalyRate | 0.00 (0%) | ≤ 0.02 | ✅ PASS |
| coverageRate | 0.00 (0%) | ≥ 0.70 | ❌ FAIL* |

*Failures due to sample size (N=2), not heuristic quality.

**Recommendation:** Run dry-run on production (read-only) with `--limit=500` to validate acceptance criteria before Apply LP.

### 2. Production SA Secret Candidate

| Field | Value |
|-------|-------|
| **PROD_SA_SECRET_CANDIDATE** | `GCP_SA_KEY_BASE64` |
| **Status** | FOUND_IN_CODE |
| **Service Account** | `ropi-aoss-deployer@ropi-bccee.iam.gserviceaccount.com` |

**Evidence Locations:**
- `.github/workflows/deploy-staging.yml:95`
- `.github/workflows/deploy-preview.yml:62`
- `.github/workflows/e2e-tests.yml:42`
- `.github/workflows/set-admin-claim.yml:24`
- `.github/workflows/ci-sa-test.yml:21`

**Action:** Infra to confirm `GCP_SA_KEY_BASE64` has Firestore write permissions for production apply, or create dedicated `PROD_SA_KEY` secret.

### 3. Snapshot Path Proposal

| Field | Value |
|-------|-------|
| **PROPOSED_SNAPSHOT_GCS_PATH** | `gs://ropi-aoss-backups/snapshots/obs-backup-<YYYYMMDDTHHMMSSZ>` |
| **Bucket** | `gs://ropi-aoss-backups/snapshots/` |

**Runbook Command (for Infra):**
```bash
gcloud config set project ropi-bccee
gcloud auth activate-service-account --key-file=/tmp/ropi-prod-sa.json
gcloud firestore export gs://ropi-aoss-backups/snapshots/obs-backup-$(date -u +%Y%m%dT%H%M%SZ)
```

### 4. Maintenance Window Proposal

| Option | Start (UTC) | End (UTC) | Duration |
|--------|-------------|-----------|----------|
| **Primary** | 2026-01-02T02:00:00Z | 2026-01-02T04:00:00Z | 2h |
| Alternate 1 | 2026-01-03T02:00:00Z | 2026-01-03T04:00:00Z | 2h |
| Alternate 2 | 2026-01-06T02:00:00Z | 2026-01-06T04:00:00Z | 2h |

### 5. Approver Request Packet

| Field | Value |
|-------|-------|
| **Location** | `HES/LP-obs-studio-cleanup-apply-1.5.0-APPROVER-READY.md` |
| **Status** | CREATED |

Contents:
- Dry-run report summary and GCS path
- Production SA detection results
- Snapshot path template and runbook
- Maintenance window proposals
- Approver sign-off format
- Preconditions checklist
- PR comment template (ready to post)

---

## Artifacts Generated

| Artifact | Path/Location | Status |
|----------|---------------|--------|
| Dry-run JSON | `gs://ropi-aoss-backups/dryruns/migrate-observations-tags.dryrun.20251230T194446Z.json` | ✅ Uploaded |
| Dry-run local | `/tmp/migrate-observations-tags.dryrun.20251230T194446Z.json` | ✅ Created |
| Approver Packet | `HES/LP-obs-studio-cleanup-apply-1.5.0-APPROVER-READY.md` | ✅ Created |
| Prepare HES | `HOMER_LP-obs-studio-cleanup-prepare-1.5.0_HES.md` | ✅ Created |

---

## Outcome

**Status:** PREPARED (with caveats)

**Caveats:**
1. Staging dry-run has insufficient data (N=2); production dry-run recommended
2. Acceptance criteria cannot be validated on staging sample
3. Infra confirmation needed for SA permissions

**Next Steps:**
1. Run production dry-run (read-only) to validate metrics
2. Post Approver Request Packet to Apply PR
3. Collect approver sign-offs
4. When all preconditions met, relay Apply LP

---

## HES JSON

```json
{
  "from": "Homer",
  "to": "Lisa",
  "lp": "LP-obs-studio-cleanup-prepare-1.5.0",
  "branch": "obs-studio-cleanup/LP-1.4.0",
  "pr": null,
  "dryRun": {
    "gcsPath": "gs://ropi-aoss-backups/dryruns/migrate-observations-tags.dryrun.20251230T194446Z.json",
    "status": "INSUFFICIENT_DATA",
    "metrics": {
      "meanConfidence": 0.85,
      "conflictRate": 0.50,
      "anomalyRate": 0.00,
      "coverageRate": 0.00
    },
    "counts": {
      "totalProcessed": 2,
      "wouldMigrate": 0,
      "wouldSkip": 2
    },
    "note": "Staging has only 2 observations; run on production for valid metrics"
  },
  "prodSaCandidate": "GCP_SA_KEY_BASE64",
  "prodSaEvidence": [
    ".github/workflows/deploy-staging.yml:95",
    ".github/workflows/e2e-tests.yml:42"
  ],
  "snapshotProposal": "gs://ropi-aoss-backups/snapshots/obs-backup-<TS>",
  "maintenanceWindow": {
    "primary": {
      "start": "2026-01-02T02:00:00Z",
      "end": "2026-01-02T04:00:00Z"
    },
    "alternates": [
      { "start": "2026-01-03T02:00:00Z", "end": "2026-01-03T04:00:00Z" },
      { "start": "2026-01-06T02:00:00Z", "end": "2026-01-06T04:00:00Z" }
    ]
  },
  "approverPacket": "HES/LP-obs-studio-cleanup-apply-1.5.0-APPROVER-READY.md",
  "outcome": "PREPARED",
  "caveats": [
    "Staging dry-run insufficient (N=2)",
    "Production dry-run required for valid metrics",
    "Infra SA confirmation pending"
  ],
  "timestamp": "2025-12-30T19:44:46Z"
}
```

---

## Commands for Lisa (Next Steps)

### 1. Run production dry-run (read-only)
```bash
# Decode SA and run dry-run on production data
echo "$GCP_SA_KEY_BASE64" | base64 -d > /tmp/ropi-prod-sa.json
node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-prod-sa.json --limit=500 --output=/tmp/dryrun.prod.json --verbose

# Check metrics
jq '.metrics, .acceptanceCriteria' /tmp/dryrun.prod.json

# If PASS, upload
gsutil cp /tmp/dryrun.prod.json gs://ropi-aoss-backups/dryruns/dryrun-prod-$(date -u +%Y%m%dT%H%M%SZ).json
```

### 2. Post Approver Notification
Copy the PR comment template from `HES/LP-obs-studio-cleanup-apply-1.5.0-APPROVER-READY.md` Section 7 and post to the Apply PR.

### 3. Collect Approvals
Ensure all 4 approvers sign off in the PR comment format.

### 4. When Ready, Paste Values for Apply LP Relay
```
DRY_RUN_GCS_PATH=gs://ropi-aoss-backups/dryruns/dryrun-prod-<TS>.json
SNAPSHOT_GCS_PATH=gs://ropi-aoss-backups/snapshots/obs-backup-<TS>
MAINTENANCE_WINDOW_START=2026-01-02T02:00:00Z
MAINTENANCE_WINDOW_END=2026-01-02T04:00:00Z
PROD_SA_SECRET_NAME=GCP_SA_KEY_BASE64

APPROVALS:
  - Product Owner: Lisa — Approved: <timestamp>
  - Platform/Infra: <name> — Approved: <timestamp>
  - Data Governance: <name> — Approved: <timestamp>
  - Release Manager: <name> — Approved: <timestamp>
```

---

_HES generated by Homer for LP-obs-studio-cleanup-prepare-1.5.0_
