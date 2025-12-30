# Apply LP Notification — LP-obs-studio-cleanup-apply-1.5.0

> **Status:** 🟡 AWAITING APPROVALS & DRY-RUN ACCEPTANCE
> **Branch:** `obs-studio-cleanup/LP-1.5.0-apply`
> **Risk Level:** HIGH (production Firestore writes)

---

## Summary

This Apply LP will backfill `tags[]` to historical observation documents in production Firestore. The migration is based on the completed `obs-studio-cleanup.v1` phase (LP-1.0.0 → LP-1.4.0), which added the `tags[]` field to the observations schema and integrated it into the AI suggestions workflow.

**Scope:** Observations without existing tags that have parseable text content.

---

## Approvers Required

Please review the artifacts below and provide explicit approval by commenting on this PR:

| Role | Approver | Status | Approval Comment |
|------|----------|--------|------------------|
| **Product Owner** | @lisa | ⏳ Pending | `Approved: Lisa @<timestamp>` |
| **Platform/Infra Owner** | @infra-lead | ⏳ Pending | `Approved: <name> @<timestamp>` |
| **Data Governance** | @data-gov | ⏳ Pending | `Approved: <name> @<timestamp>` |
| **Release Manager** | @release-mgr | ⏳ Pending | `Approved: <name> @<timestamp>` |

---

## What You Need to Review

### 1. Dry-Run Report (when available)

**Location:** `gs://ropi-aoss-backups/dryruns/<DRY_RUN_FILENAME>.json`

Key metrics to verify:

| Criterion | Threshold | Actual | Status |
|-----------|-----------|--------|--------|
| Mean confidence | ≥ 80% | _TBD_ | ⏳ |
| Conflict rate | < 5% | _TBD_ | ⏳ |
| Anomaly rate | < 2% | _TBD_ | ⏳ |
| Coverage rate | ≥ 70% | _TBD_ | ⏳ |

**All four must pass before apply.**

### 2. Scripts to Review

| Script | Purpose | Location |
|--------|---------|----------|
| Dry-run | Generate migration candidates & metrics | `scripts/migrate-observations-tags.dryrun.js` |
| Apply | Execute production migration | `scripts/migrate-observations-tags.apply.js` |
| Verify | Post-apply sample verification | `scripts/migrate-observations-tags.verify-sample.js` |
| Rollback | Undo migration if needed | `scripts/migrate-observations-tags.rollback.js` |

### 3. PR Body (Full Runbook)

See: `HES/LP-obs-studio-cleanup-apply-1.5.0-PR-BODY.md`

Contains:
- Complete preconditions checklist
- Snapshot commands
- Sample apply → verify → rollback test sequence
- Full apply with checkpointing
- Rollback runbook

---

## Maintenance Window Request

**Proposed window:** `<MAINTENANCE_WINDOW_START>` to `<MAINTENANCE_WINDOW_END>` (UTC)

**Duration:** ~2 hours

**On-call contact:** `<OPS_CONTACT>`

**Activities during window:**
1. Create Firestore snapshot
2. Execute sample apply (50-100 docs)
3. Verify sample & test rollback
4. Execute full apply with checkpointing
5. Post-apply verification

**User impact:** None expected (read-only operation on historical data)

---

## Preconditions Checklist (for approvers)

- [ ] All Phase LP HESs (LP-1.0.0 → LP-1.4.0) are `VERIFIED SUCCESS`
- [ ] Dry-run report produced and acceptance criteria pass
- [ ] Firestore snapshot capability confirmed (Infra)
- [ ] Production SA secret available in CI (`PROD_SA_KEY`)
- [ ] Maintenance window approved (Release Manager)
- [ ] All 4 approvers have signed off

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Data corruption | Pre-snapshot required; rollback script tested on sample |
| Quota exhaustion | Configurable batch size & concurrency; checkpoint/resume |
| Incorrect tags | Dry-run acceptance criteria; sample apply verification |
| Production outage | Read-only migration; maintenance window; monitoring |

---

## Commands for Approvers to Run (optional)

```bash
# View dry-run summary (when available)
gsutil cat gs://ropi-aoss-backups/dryruns/<DRY_RUN_FILENAME>.json | jq '.metrics, .acceptanceCriteria'

# View sample candidates
gsutil cat gs://ropi-aoss-backups/dryruns/<DRY_RUN_FILENAME>.json | jq '.samples.wouldMigrate[:5]'
```

---

## How to Approve

Comment on this PR with your approval in this format:

```
**Approved:** <Your Name>
**Role:** <Product Owner | Platform/Infra | Data Governance | Release Manager>
**Timestamp:** <ISO timestamp>
**Notes:** <Any conditions or observations>
```

Example:
```
**Approved:** Lisa
**Role:** Product Owner
**Timestamp:** 2025-12-30T08:00:00Z
**Notes:** Reviewed dry-run report. Metrics pass all thresholds. Proceed with sample apply.
```

---

## Questions?

Contact:
- **Technical:** Homer (agent)
- **Product:** Lisa
- **Infra:** <infra-lead>

---

## Timeline

| Milestone | Target Date | Status |
|-----------|-------------|--------|
| Dry-run produced & accepted | TBD | ⏳ |
| All approvals collected | TBD | ⏳ |
| Maintenance window scheduled | TBD | ⏳ |
| Snapshot created | TBD | ⏳ |
| Sample apply & rollback test | TBD | ⏳ |
| Full apply | TBD | ⏳ |
| HES published | TBD | ⏳ |

---

_This notification was generated for LP-obs-studio-cleanup-apply-1.5.0. Do not proceed with execution until all checkboxes above are complete._
