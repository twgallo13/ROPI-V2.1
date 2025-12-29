# HOMER_LP-1.4.6.5_HES.md

**LP:** LP-importer-mapping-recon-1.4.6.5 — Production Rollout HES (Skeleton)

## Summary

This HES accompanies LP-importer-mapping-recon-1.4.6.5: Production rollout for LP-1.4.6.4 fixes (date normalization / UI binding).

**Goal:** Safely roll normalize-date and UI-binding fixes into **production** so production product editors accept vendor/ISO dates, display `YYYY-MM-DD` in date inputs, and saves write ISO `attributes.*` with `_meta`.

## Preconditions

| Precondition | Status | Evidence |
|--------------|--------|----------|
| PR #380 merged | ✅ | Commit `d58880275ec21f00318d14bce47ebc6f696d8540` |
| Staging verification | ✅ | LP-1.4.6.4 staging verify ok ([HOMER_LP-1.4.6.4_HES.md](./HOMER_LP-1.4.6.4_HES.md)) |
| CI/CodeRabbit | ⬜ | Attach `/tmp/prod-precond-ci.json` |
| Ops lead approval | ⬜ | `<ops-email>` |
| Backup bucket | ⬜ | `gs://<BACKUP_BUCKET>` |

## Rollout Checklist

Refer to [LP-1.4.6.5_PR_BODY.md](./LP-1.4.6.5_PR_BODY.md) for the complete production rollout checklist.

### Summary of Steps

1. **Step 0 — Readiness verification** (branch, commit, CI status)
2. **Step 1 — Production Firestore backup** (MANDATORY)
3. **Step 2 — Production dry-run validation** (non-write)
4. **Step 3 — Production pilot apply** (small, controlled write)
5. **Step 4 — Full production apply**
6. **Step 5 — Monitoring & smoke tests** (first 24h)

### Rollback Plan

- Option A: Revert using dry-run report (per-product per-attribute)
- Option B: Full Firestore restore from GCS backup

## Evidence & Attach Points

| Artifact | Path | Status |
|----------|------|--------|
| Firestore backup logs | `/tmp/firestore-export-*.log` | ⬜ |
| Dry-run pilot report | `/tmp/prod-dryrun-pilot-report.json` | ⬜ |
| Dry-run full report | `/tmp/prod-dryrun-full-report.json` | ⬜ |
| Pilot apply logs | `/tmp/prod-pilot-apply.log` | ⬜ |
| Pilot apply report | `/tmp/prod-pilot-apply-report.json` | ⬜ |
| Pilot product samples | `/tmp/prod-pilot-<productId>-firestore.json` | ⬜ |
| Full apply logs | `/tmp/prod-full-apply.log` | ⬜ |
| Full apply report | `/tmp/prod-full-apply-report.json` | ⬜ |
| Post-verify samples | `/tmp/prod-postverify-samples.json` | ⬜ |
| E2E test output | `/tmp/prod-e2e-date-tests.txt` | ⬜ |
| Ops approval | Email/sign-off | ⬜ |
| Lisa approval | LP sign-off | ⬜ |

## Acceptance Criteria

- [ ] Pilot apply success (100 products, no errors)
- [ ] Full apply success, with sampling verification (50+ products)
- [ ] No unresolved console errors (`does not conform to yyyy-MM-dd`) after rollout
- [ ] All `attributes.<date_key>` fields contain ISO timestamps
- [ ] All `_meta.<date_key>` entries have `actor` and `method` fields
- [ ] Rollback scripts prepared and tested
- [ ] 24h monitoring period with no critical errors

## Safety Controls & Hard Rules

- **No `--force-admin`** in production unless explicit, documented authorization from Lisa + business owner
- Keep `cleanup:required` and `cleanup:done` labels tracked
- All apply runs must produce `*-apply-report.json` and be attached
- Use maintenance window and notify support/business contacts before full apply

## Owner / Contacts

| Role | Contact |
|------|---------|
| Owner | John (relay) |
| Ops lead | `<ops>` |
| QA lead | `<qa>` |
| Release approver | Lisa |
| Emergency rollback | Ops lead |

## Version History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| v1.0.0 | 2025-12-29T09:15:00Z | Homer | HES skeleton created |

## References

- [LP-1.4.6.4 HES](./HOMER_LP-1.4.6.4_HES.md) — Staging verification
- [PR #380](https://github.com/twgallo13/ROPI-V2.1/pull/380) — Date UI fix merge
- Tag: `lp-1.4.6.4-d588802`
