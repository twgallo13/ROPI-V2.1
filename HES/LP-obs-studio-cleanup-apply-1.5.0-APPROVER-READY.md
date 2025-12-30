# Approver Request Packet — LP-obs-studio-cleanup-apply-1.5.0

> **Generated:** 2025-12-30T19:44:46Z  
> **Prepare LP:** LP-obs-studio-cleanup-prepare-1.5.0  
> **Status:** 🟡 AWAITING APPROVALS

---

## Summary

This packet contains all artifacts and information required for approvers to evaluate and sign off on the production Apply LP (`LP-obs-studio-cleanup-apply-1.5.0`) for historical `tags[]` backfill to observation documents.

---

## 1. Dry-Run Report

### Location
```
DRY_RUN_GCS_PATH=gs://ropi-aoss-backups/dryruns/migrate-observations-tags.dryrun.20251230T194446Z.json
```

### Status: ⚠️ INSUFFICIENT DATA (requires production dry-run)

**Note:** The staging environment has only 2 observations, which is insufficient to validate acceptance criteria. A dry-run on production data (read-only) is recommended before proceeding.

### Metrics (from staging sample)

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| Mean Confidence | 85.0% | ≥ 80% | ✅ PASS |
| Conflict Rate | 50.0% | < 5% | ❌ FAIL* |
| Anomaly Rate | 0.0% | < 2% | ✅ PASS |
| Coverage Rate | 0.0% | ≥ 70% | ❌ FAIL* |

*Failures due to insufficient sample size (only 2 observations in staging).

### Counts (staging)

| Count | Value |
|-------|-------|
| Total Processed | 2 |
| With Existing Tags | 1 |
| Without Tags | 1 |
| Would Migrate | 0 |
| Would Skip | 2 |
| With Conflicts | 1 |
| With Anomalies | 0 |

### Recommendation

Run dry-run on **production** (read-only) to get accurate metrics:

```bash
# Production dry-run (read-only, no writes)
node scripts/migrate-observations-tags.dryrun.js /tmp/ropi-prod-sa.json \
  --limit=500 \
  --output=/tmp/dryrun.prod.report.json \
  --verbose

# Upload to GCS
gsutil cp /tmp/dryrun.prod.report.json gs://ropi-aoss-backups/dryruns/dryrun-prod-$(date -u +%Y%m%dT%H%M%SZ).json
```

---

## 2. Production SA Secret

### Detection Results

**PROD_SA_SECRET_CANDIDATE:** `GCP_SA_KEY_BASE64`

**Evidence:**
| File | Line | Reference |
|------|------|-----------|
| `.github/workflows/deploy-staging.yml` | 95 | `GCP_SA_KEY_BASE64: ${{ secrets.GCP_SA_KEY_BASE64 }}` |
| `.github/workflows/deploy-preview.yml` | 62 | `GCP_SA_KEY_BASE64: ${{ secrets.GCP_SA_KEY_BASE64 }}` |
| `.github/workflows/e2e-tests.yml` | 42 | `GCP_SA_KEY_BASE64: ${{ secrets.GCP_SA_KEY_BASE64 }}` |
| `.github/workflows/set-admin-claim.yml` | 24 | `GCP_SA_KEY_BASE64: ${{ secrets.GCP_SA_KEY_BASE64 }}` |
| `.github/workflows/ci-sa-test.yml` | 21 | `GCP_SA_KEY_BASE64: ${{ secrets.GCP_SA_KEY_BASE64 }}` |

**Service Account:** `ropi-aoss-deployer@ropi-bccee.iam.gserviceaccount.com`

### Action Required for Infra

Confirm that `GCP_SA_KEY_BASE64` has sufficient permissions for:
- Firestore read/write on `observations` collection
- Firestore read/write on `_activityLog` collection (audit)
- GCS read/write on `gs://ropi-aoss-backups/`

If a separate production SA is required, create secret named `PROD_SA_KEY` or `PROD_SA_KEY_BASE64` with production-scoped permissions.

---

## 3. Snapshot Path & Runbook

### Proposed Snapshot Path Template
```
SNAPSHOT_GCS_PATH=gs://ropi-aoss-backups/snapshots/obs-backup-YYYYMMDDTHHMMSSZ
```

### Snapshot Creation Runbook (for Infra)

**Prerequisites:**
- Access to production project `ropi-bccee`
- Production SA key available at `/tmp/ropi-prod-sa.json`
- GCS bucket `gs://ropi-aoss-backups/snapshots/` exists and is writable

**Commands:**
```bash
# 1. Authenticate with production SA
gcloud config set project ropi-bccee
gcloud auth activate-service-account --key-file=/tmp/ropi-prod-sa.json

# 2. Create Firestore export snapshot (run immediately before apply)
gcloud firestore export gs://ropi-aoss-backups/snapshots/obs-backup-$(date -u +%Y%m%dT%H%M%SZ)

# 3. Record the output path as SNAPSHOT_GCS_PATH
# Example output: gs://ropi-aoss-backups/snapshots/obs-backup-20260102T020000Z
```

**Estimated:**
- Export time: ~5-15 minutes (depending on collection size)
- Storage: ~50-200 MB (based on observation count)

### Verification
```bash
# List snapshot contents
gsutil ls gs://ropi-aoss-backups/snapshots/obs-backup-<TS>/
```

---

## 4. Maintenance Window

### Primary Proposal
```
MAINTENANCE_WINDOW_START=2026-01-02T02:00:00Z
MAINTENANCE_WINDOW_END=2026-01-02T04:00:00Z
```
**Duration:** 2 hours  
**Justification:** Low-traffic window (02:00-04:00 UTC), 72 hours out for preparation

### Alternates

| Option | Start | End | Notes |
|--------|-------|-----|-------|
| **Primary** | 2026-01-02T02:00:00Z | 2026-01-02T04:00:00Z | 72h out, Thursday |
| Alternate 1 | 2026-01-03T02:00:00Z | 2026-01-03T04:00:00Z | 96h out, Friday |
| Alternate 2 | 2026-01-06T02:00:00Z | 2026-01-06T04:00:00Z | 7 days out, Monday |

### Stakeholder Notification Template

```
Subject: [ROPI] Scheduled Maintenance - Observations Tags Backfill

Hi Team,

We have scheduled a maintenance window for the ROPI system:

Date: January 2, 2026 (Thursday)
Time: 02:00 - 04:00 UTC
Duration: 2 hours
Impact: None expected (read-only operation on historical data)

Activities:
- Create Firestore snapshot backup
- Execute historical tags[] backfill on observations
- Verify migration and audit entries

On-call contact: <OPS_CONTACT>

Please reply if you have concerns or conflicts with this window.

Thanks,
Release Team
```

---

## 5. Approver Sign-off

### Required Approvers

| Role | Approver | Status | Sign-off |
|------|----------|--------|----------|
| **Product Owner** | Lisa | ⏳ Pending | |
| **Platform/Infra** | TBD | ⏳ Pending | |
| **Data Governance** | TBD | ⏳ Pending | |
| **Release Manager** | TBD | ⏳ Pending | |

### Sign-off Format

Each approver must comment in the Apply PR with this exact format:

```
**Approved:** <Role>
**Name:** <Your Name>
**Timestamp:** <YYYY-MM-DDTHH:MM:SSZ>
**Conditions:** <Any conditions or "None">
```

**Example:**
```
**Approved:** Product Owner
**Name:** Lisa
**Timestamp:** 2025-12-31T08:00:00Z
**Conditions:** Proceed only after production dry-run shows all metrics PASS
```

---

## 6. Preconditions Checklist

Copy this checklist to the Apply PR:

```markdown
## Preconditions Checklist

- [ ] All Phase LP HESs (LP-1.0.0 → LP-1.4.0) verified SUCCESS
- [ ] Production dry-run executed and metrics PASS all thresholds
- [ ] Dry-run report uploaded to GCS: `<DRY_RUN_GCS_PATH>`
- [ ] Pre-apply Firestore snapshot created: `<SNAPSHOT_GCS_PATH>`
- [ ] Production SA confirmed (`GCP_SA_KEY_BASE64` or `PROD_SA_KEY`)
- [ ] Maintenance window scheduled and communicated
- [ ] **Product Owner approval:** 
- [ ] **Platform/Infra approval:** 
- [ ] **Data Governance approval:** 
- [ ] **Release Manager approval:** 
- [ ] Sample apply tested and rollback verified
```

---

## 7. PR Comment Template (Ready to Post)

Copy and post this as the first comment on the Apply PR:

---

> **🔔 Request for Approvals — LP-obs-studio-cleanup-apply-1.5.0**
>
> Hi @ProductOwner @PlatformOwner @DataGovernance @ReleaseManager,
>
> We are ready to request production approval for the historical `tags[]` backfill on observation documents.
>
> **Artifacts:**
> - Dry-run report: `gs://ropi-aoss-backups/dryruns/migrate-observations-tags.dryrun.20251230T194446Z.json`
> - Apply script: `scripts/migrate-observations-tags.apply.js`
> - Verify script: `scripts/migrate-observations-tags.verify-sample.js`
> - Rollback script: `scripts/migrate-observations-tags.rollback.js`
> - Full runbook: `HES/LP-obs-studio-cleanup-apply-1.5.0-PR-BODY.md`
>
> **Acceptance Criteria (must PASS on production dry-run):**
> | Metric | Threshold |
> |--------|-----------|
> | Mean Confidence | ≥ 80% |
> | Conflict Rate | < 5% |
> | Anomaly Rate | < 2% |
> | Coverage Rate | ≥ 70% |
>
> **Proposed Maintenance Window:**
> - Primary: 2026-01-02T02:00:00Z to 2026-01-02T04:00:00Z (2h, Thursday)
> - Alternate: 2026-01-03T02:00:00Z to 2026-01-03T04:00:00Z
>
> **Production SA:** `GCP_SA_KEY_BASE64` (pending infra confirmation)
>
> **Snapshot Path (to be created):** `gs://ropi-aoss-backups/snapshots/obs-backup-<TS>`
>
> **Please approve by replying with:**
> ```
> **Approved:** <Role>
> **Name:** <Your Name>
> **Timestamp:** <ISO timestamp>
> **Conditions:** <Any conditions or "None">
> ```
>
> Once all approvals are collected and snapshot is created, we will execute the Apply LP per the runbook.
>
> Thank you!

---

## 8. Scripts Reference

| Script | Purpose | Location |
|--------|---------|----------|
| Dry-run | Generate candidates & metrics | `scripts/migrate-observations-tags.dryrun.js` |
| Apply | Execute migration | `scripts/migrate-observations-tags.apply.js` |
| Verify | Post-apply sample check | `scripts/migrate-observations-tags.verify-sample.js` |
| Rollback | Undo migration | `scripts/migrate-observations-tags.rollback.js` |

---

## 9. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Data corruption | Pre-snapshot required; rollback tested on sample |
| Quota exhaustion | Configurable batch size; checkpoint/resume |
| Incorrect tags | Dry-run acceptance criteria; sample verification |
| Production outage | Read-only migration; maintenance window |

---

## 10. Next Steps After Approval

1. Create production Firestore snapshot
2. Run sample apply (50-100 docs) and verify
3. Test sample rollback
4. Execute full apply during maintenance window
5. Run post-apply verification
6. Publish final HES with apply report

---

_Generated by LP-obs-studio-cleanup-prepare-1.5.0 on 2025-12-30T19:44:46Z_
