# PR: `LP-obs-studio-cleanup-apply-1.5.0 — Apply historical tags[] backfill (Apply LP)`

**Summary (one line)**
Apply historical `tags[]` to observation documents in **production** based on the accepted dry-run report and under an explicit maintenance window. This PR contains the runbook, commands, acceptance criteria, and approvals required for the production apply.

---

## Important: This is an **Apply LP** — production writes

**Do NOT merge or execute** until ALL preconditions below are satisfied and the approvers listed in this PR have approved.

---

## Preconditions (must be met before any production writes)

* [ ] All Phase LP HESs (LP-1.0.0 → LP-1.4.0) are present and `VERIFIED SUCCESS`. (Check PR HES comments.)
* [ ] **Dry-run report accepted** — `migrate-observations-tags.dryrun.report.json` (staging) has been produced and accepted by approvers. Provide GCS path: `gs://.../<dryrun-file.json>` → `<DRY_RUN_GCS_PATH>`
* [ ] **Pre-snapshot**: Firestore export snapshot created and accessible. Provide GCS path: `gs://.../obs-backup-<TS>` → `<SNAPSHOT_GCS_PATH>`
* [ ] **Maintenance window** scheduled and communicated:

  * Start: `<MAINTENANCE_WINDOW_START (UTC)>`
  * End: `<MAINTENANCE_WINDOW_END (UTC)>`
  * Contact/On-call: `<OPS_CONTACT_EMAIL/PHONE>`
* [ ] **Approvals** (explicit sign-off; comment in PR or approval checkbox):

  * Product owner: `<NAME> — Approved: <timestamp>`
  * Platform/Infra owner: `<NAME> — Approved: <timestamp>`
  * Data Governance owner: `<NAME> — Approved: <timestamp>`
  * Release Manager: `<NAME> — Approved: <timestamp>`
* [ ] **Prod SA available in CI**: secret name `<PROD_SA_SECRET_NAME>` or file path `/tmp/ropi-prod-sa.json` for runner. Confirmed by Infra.
* [ ] Dry-run thresholds satisfied (below). If not satisfied, the Apply LP must not run.

---

## Dry-run acceptance criteria (report must include and pass)

From the enhanced dry-run script. Copy the JSON and verify these fields:

* `metrics.meanConfidence >= 0.80` (80%)
* `metrics.conflictRate <= 0.05` (5%)
* `metrics.anomalyRate <= 0.02` (2%)
* `metrics.coverageRate >= 0.70` (70%)

**Required:** All four must be `PASS`. If any fail, do *not* apply. Fix heuristics or adjust scope and re-run dry-run.

---

## Dry-run verification commands (run on staging)

(You should have the staging SA at `/tmp/ropi-deploy-staging-sa.json`.)

```bash
# Generate dry-run (already available): example
node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-deploy-staging-sa.json --limit=100 --output=/tmp/dryrun.report.json --verbose

# Quick checks with jq:
jq '.metrics | {meanConfidence, conflictRate, anomalyRate, coverageRate}' /tmp/dryrun.report.json

# Evaluate thresholds (example bash)
jq -r '.metrics | "\(.meanConfidence) \(.conflictRate) \(.anomalyRate) \(.coverageRate)"' /tmp/dryrun.report.json | \
  read meanConfidence conflictRate anomalyRate coverageRate
# Then assert values in your CI or by eyeballing.
```

If accepted, upload to GCS:

```bash
gsutil cp /tmp/dryrun.report.json gs://ropi-aoss-backups/dryruns/<DRY_RUN_FILENAME>.json
# Set <DRY_RUN_GCS_PATH> to this GCS URI
```

---

## Pre-apply Snapshot (exact commands)

Take a Firestore export of the `observations` collection (run right before the full apply):

```bash
# Example (requires prod SA / gcloud access & correct project)
gcloud config set project ropi-bccee
gcloud auth activate-service-account --key-file=/tmp/ropi-prod-sa.json
gcloud firestore export gs://<BACKUP_BUCKET>/snapshots/obs-backup-$(date -u +%Y%m%dT%H%M%SZ)
# Save the created GCS path to <SNAPSHOT_GCS_PATH>
```

**Note:** Keep the snapshot path in the PR and HES for rollback.

---

## Sample apply (test subset)

**MUST** be executed and verified before full apply:

1. Prepare a sample list of observation IDs (50-100) from the dry-run `samples.wouldMigrate` or `samples.conflicts`. Save to `/tmp/sample_ids.txt`.

2. Run sample apply (idempotent):

```bash
node scripts/migrate-observations-tags.apply.js /tmp/ropi-prod-sa.json \
  --report=gs://<DRY_RUN_GCS_PATH> \
  --sampleFile=/tmp/sample_ids.txt \
  --applyMode=sample \
  --batchSize=50 \
  --maxRetries=3 \
  --auditCollection=_activityLog \
  --output=/tmp/apply.sample.report.json
```

3. Verify sample results:

```bash
jq '.appliedCount, .failedCount, .skippedCount' /tmp/apply.sample.report.json
# Check _activityLog entries for sample via Firestore console or query
```

4. Run sample rollback test:

   * Remove added tags for sample or restore docs from snapshot for the sample set. Confirm rollback success.

**Only after sample apply & rollback success** proceed to full apply.

---

## Full apply (idempotent, resumable)

**Run during the maintenance window.**

```bash
# Full apply - example:
node scripts/migrate-observations-tags.apply.js /tmp/ropi-prod-sa.json \
  --report=gs://<DRY_RUN_GCS_PATH> \
  --batchSize=500 \
  --concurrency=4 \
  --maxRetries=3 \
  --auditCollection=_activityLog \
  --dryRun=false \
  --checkpointGcs=gs://<BACKUP_BUCKET>/apply-checkpoints/obs-tags-apply.checkpoint.json \
  --output=/tmp/migrate-observations-tags.apply.report.json
```

The script SHOULD:

* Use `FieldValue.arrayUnion()` or a deduped `update` to add tags (avoid duplicates).
* Skip observations that already have tags unless `--overwrite=true` (not recommended).
* Maintain a checkpoint and be resumable.

---

## Post-apply verification

1. Run a **random sample verification** (default N=100):

```bash
node scripts/migrate-observations-tags.verify-sample.js /tmp/ropi-prod-sa.json \
  --applyReport=/tmp/migrate-observations-tags.apply.report.json \
  --sampleSize=100 \
  --output=/tmp/apply.verify.report.json
```

2. Check metrics:

```bash
jq '.sampleMatches, .sampleFailures' /tmp/apply.verify.report.json
# Expect sampleMatches/sampleSize >= 0.99 (99%)
```

3. Ensure `_activityLog` contains audit entries for applied updates (count ~ appliedCount).

4. Attach apply report to HES.

---

## HES & Artifacts to publish after apply

* `apply_report.json` (`/tmp/migrate-observations-tags.apply.report.json`) — includes appliedCount, failedCount, skippedCount, errors[]
* `failed_docs.json` — list of observationIds that failed and reasons
* `audit_summary.json` — aggregated audit entries or path to `_activityLog` subset
* `checkpoint` file (GCS) showing final progress
* Final HES JSON (use the Apply HES template from the Apply LP)

---

## Rollback runbook (tested on sample)

**Preferred rollback: restore from Firestore snapshot**

1. Use Firestore import to restore collection from `<SNAPSHOT_GCS_PATH>`. This is heavier but restores full state.
2. Alternatively (fast rollback): For all docs listed in `apply_report.appliedDocs`, run:

```bash
# Remove tags field OR restore previous value if saved in audit log
node scripts/migrate-observations-tags.rollback.js /tmp/ropi-prod-sa.json \
  --appliedDocs=/tmp/applied_docs_list.json \
  --auditCollection=_activityLog \
  --output=/tmp/rollback.report.json
```

3. Verify restored docs match snapshot or audit log.

**IMPORTANT:** Test rollback on sample before full apply.

---

## Security & audit

* All apply actions must be logged to `_activityLog` with `appliedBy: "LP-obs-studio-cleanup-apply-1.5.0"` and `dryRunReportRef: "<DRY_RUN_GCS_PATH>"`.
* Only users with correct prod permissions may approve/trigger apply.

---

## Stopping & escalation (abort conditions)

* Dry-run acceptance not confirmed or fails thresholds.
* Snapshot failed or inaccessible.
* Approvals missing.
* Sample apply/rollback fails.
* Production quota or infra issue detected (e.g., Firestore rate limits or errors).
* Any change to `packages/sdk/config/attributeRegistry.json` detected.

If any condition happens: abort, collect logs, and open a remediation LP.

---

## Approvals (enter actual signoffs here)

* Product Owner: `<Lisa — signoff timestamp>`
* Platform/Infra: `<name — signoff timestamp>`
* Data Governance: `<name — signoff timestamp>`
* Release Manager: `<name — signoff timestamp>`

---

## PR metadata & labels

* **Branch:** `obs-studio-cleanup/LP-1.5.0-apply`
* **Title:** `LP-obs-studio-cleanup-apply-1.5.0 — Apply historical tags[] backfill to production`
* **Labels:** `lp:LP-obs-studio-cleanup-apply-1.5.0`, `state:apply`, `type:apply`, `risk:high`
* **Reviewers:** Lisa, Platform/Infra owner, Data Governance owner, Release Manager

---

## Example PR checklist (copy into PR)

* [ ] Preconditions satisfied and documented (dry-run path, snapshot path, maintenance window, approvers)
* [ ] Sample apply executed and rollback tested (attach `apply.sample.report.json` and `rollback.sample.report.json`)
* [ ] Prod SA key validated in CI (`PROD_SA_KEY` secret)
* [ ] `scripts/migrate-observations-tags.apply.js` reviewed and accessible
* [ ] HES template included for final reporting

---

## Helpful quick commands (summary)

```bash
# Dry-run (staging)
node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-deploy-staging-sa.json --limit=100 --output=/tmp/dryrun.json --verbose

# Snapshot (production)
gcloud firestore export gs://<BACKUP_BUCKET>/snapshots/obs-backup-$(date -u +%Y%m%dT%H%M%SZ)

# Sample apply
node scripts/migrate-observations-tags.apply.js /tmp/ropi-prod-sa.json --report=gs://<DRY_RUN_GCS_PATH> --sampleFile=/tmp/sample_ids.txt --applyMode=sample

# Full apply
node scripts/migrate-observations-tags.apply.js /tmp/ropi-prod-sa.json --report=gs://<DRY_RUN_GCS_PATH> --batchSize=500 --concurrency=4 --checkpointGcs=gs://<BACKUP_BUCKET>/apply-checkpoints/obs-tags-apply.checkpoint.json --output=/tmp/apply.report.json

# Post-apply verify sample
node scripts/migrate-observations-tags.verify-sample.js /tmp/ropi-prod-sa.json --applyReport=/tmp/apply.report.json --sampleSize=100
```

---

## HES template (Apply LP final)

```json
{
  "lp": "LP-obs-studio-cleanup-apply-1.5.0",
  "type": "apply",
  "status": "<PENDING|SUCCESS|FAILED|ROLLED_BACK>",
  "executedAt": "<ISO_TIMESTAMP>",
  "executedBy": "Homer",
  "preSnapshot": "<SNAPSHOT_GCS_PATH>",
  "dryRunReport": "<DRY_RUN_GCS_PATH>",
  "applyReport": "<APPLY_REPORT_GCS_PATH>",
  "maintenanceWindow": {
    "start": "<MAINTENANCE_WINDOW_START>",
    "end": "<MAINTENANCE_WINDOW_END>"
  },
  "metrics": {
    "appliedCount": 0,
    "failedCount": 0,
    "skippedCount": 0,
    "durationMs": 0
  },
  "approvals": {
    "productOwner": "<NAME — timestamp>",
    "platformOwner": "<NAME — timestamp>",
    "dataGovernance": "<NAME — timestamp>",
    "releaseManager": "<NAME — timestamp>"
  },
  "rollback": {
    "tested": false,
    "executed": false,
    "snapshotUsed": null
  },
  "artifacts": []
}
```
