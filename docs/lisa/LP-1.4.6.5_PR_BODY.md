# LP-importer-mapping-recon-1.4.6.5 — Production Rollout

## Summary

Production rollout for LP-1.4.6.4 date normalization and UI binding fixes.

**Goal:** Safely roll normalize-date and UI-binding fixes into **production** so production product editors accept vendor/ISO dates, display `YYYY-MM-DD` in date inputs, and saves write ISO `attributes.*` with `_meta`.

## Prerequisites (ALL must be satisfied before proceeding)

- [x] PR #380 merged to `aoss-main` (commit `d58880275ec21f00318d14bce47ebc6f696d8540`)
- [x] Staging verification completed (LP-1.4.6.4 staging verify ok)
- [ ] All CI checks pass on `aoss-main`
- [ ] Ops lead confirms production deploy window & rollback readiness
- [ ] Production Firestore backup destination exists (GCS bucket)

**If any precondition is missing — STOP. Document missing items and do not proceed.**

---

## Roles & Approvals

| Role | Contact | Approval Required |
|------|---------|-------------------|
| Owner | John (relay) | — |
| Ops lead | `<ops>` | ✅ |
| QA lead | `<qa>` | — |
| Release approver | Lisa | ✅ |
| Emergency rollback | Ops lead | — |

---

## Production Rollout Checklist

### Step 0 — Readiness Verification (T-0)

```bash
# Confirm branch and commit
git checkout aoss-main
git pull origin aoss-main
git rev-parse --abbrev-ref HEAD > /tmp/prod-precond-branch.txt
git rev-parse HEAD > /tmp/prod-precond-commit.txt
# CI & CodeRabbit status
gh api repos/twgallo13/ROPI-V2.1/commits/$(cat /tmp/prod-precond-commit.txt)/status | jq . > /tmp/prod-precond-ci.json
```

**Attach:**
- `/tmp/prod-precond-branch.txt`
- `/tmp/prod-precond-commit.txt`
- `/tmp/prod-precond-ci.json`

**Lisa must sign-off on these files before proceeding.**

---

### Step 1 — Production Firestore Backup (MANDATORY)

⚠️ **This is mandatory and must complete successfully before any writes.**

```bash
BACKUP_PATH="gs://<BACKUP_BUCKET>/normalize-dates-backup-$(date +%Y%m%dT%H%M%S)"
gcloud firestore export "${BACKUP_PATH}" --project=<GCP_PROJECT_ID> > /tmp/firestore-export.log 2>&1 || true
echo $? > /tmp/firestore-export-exitcode.txt

# Verify export
gsutil ls "${BACKUP_PATH}/" > /tmp/firestore-export-list.txt
```

**Attach:**
- `/tmp/firestore-export.log`
- `/tmp/firestore-export-exitcode.txt` (must be `0`)
- `/tmp/firestore-export-list.txt`
- GCS path: `BACKUP_PATH`

**Do not proceed if exit code ≠ 0 or files missing.**

---

### Step 2 — Production Dry-Run Validation (Non-Write)

#### 2a. Pilot Dry-Run (100 products)

```bash
pnpm --filter @ropi-aoss/api build
node dist/tasks/normalizeProductDates.js -- --limit=100 > /tmp/prod-dryrun-pilot.log 2>&1
cp $(ls -1t reports/normalize-dates | head -n1) /tmp/prod-dryrun-pilot-report.json || true
```

**Verify:**
- `skippedUnparseable: 0` (or acceptable number documented)
- `skippedAdminProtected` reported and justified
- Sample entries show ISO `to` values

#### 2b. Full Dry-Run

```bash
node dist/tasks/normalizeProductDates.js > /tmp/prod-dryrun-full.log 2>&1
cp $(ls -1t reports/normalize-dates | head -n1) /tmp/prod-dryrun-full-report.json || true
```

**Attach:**
- `/tmp/prod-dryrun-pilot.log`
- `/tmp/prod-dryrun-pilot-report.json`
- `/tmp/prod-dryrun-full.log`
- `/tmp/prod-dryrun-full-report.json`

**Lisa must review and approve dry-run reports before pilot apply.**

---

### Step 3 — Production Pilot Apply (Small, Controlled Write)

```bash
node dist/tasks/normalizeProductDates.js -- --apply --limit=100 > /tmp/prod-pilot-apply.log 2>&1
cp $(ls -1t reports/normalize-dates | head -n1) /tmp/prod-pilot-apply-report.json || true
```

**Pilot Verification (5 products including `211737-90h1-8`):**

For each product verify:
- `attributes.<date_key>` is ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`)
- `_meta.<date_key>` has `actor` and `method` fields
- UI date inputs show `YYYY-MM-DD`
- No `does not conform to yyyy-MM-dd` console errors
- Authenticated save persists to Firestore

**Attach:**
- `/tmp/prod-pilot-apply.log`
- `/tmp/prod-pilot-apply-report.json`
- `/tmp/prod-pilot-<productId>-firestore.json` (5 products)
- UI screenshots and console logs

**If pilot fails any checks, abort and run rollback plan.**

---

### Step 4 — Full Production Apply

⚠️ **Only after pilot OK and approvals.**

```bash
node dist/tasks/normalizeProductDates.js -- --apply > /tmp/prod-full-apply.log 2>&1
cp $(ls -1t reports/normalize-dates | head -n1) /tmp/prod-full-apply-report.json || true
```

**Post-Apply Verification:**
- Random sample 50 products + original 5 pilot products
- Verify UI date inputs, Firestore attributes, `_meta`, save flows

**Attach:**
- `/tmp/prod-full-apply.log`
- `/tmp/prod-full-apply-report.json`
- `/tmp/prod-postverify-samples.json`

---

### Step 5 — Monitoring & Smoke Tests (First 24h)

```bash
pnpm --filter @ropi-aoss/web test:e2e -- --grep "DateInput" > /tmp/prod-e2e-date-tests.txt 2>&1 || true
```

**Monitor:**
- Error tracking (Sentry/console) for `does not conform` errors
- Product-save failure rate
- API latency

**Attach:** `/tmp/prod-e2e-date-tests.txt`

---

## Rollback Plan

### Option A — Revert Using Dry-Run Report (Recommended)

Use `/tmp/prod-full-apply-report.json` to build revert payloads:
- Per-product per-attribute updates via Firestore
- Set `actor: "system:migrator:revert"`

### Option B — Full Firestore Restore (Emergency Only)

```bash
gcloud firestore import "${BACKUP_PATH}" --project=<GCP_PROJECT_ID>
```

⚠️ Restores entire collection — use only for major outage.

---

## Safety Controls

- **No `--force-admin`** without explicit Lisa + business owner authorization
- All apply runs must produce `*-apply-report.json`
- Use maintenance window; notify support/business before full apply
- Keep `cleanup:required` label until LP closes

---

## Evidence Checklist

| Artifact | Attached |
|----------|----------|
| Firestore backup logs | ⬜ |
| Dry-run pilot report | ⬜ |
| Dry-run full report | ⬜ |
| Pilot apply logs/report | ⬜ |
| Pilot sample artifacts | ⬜ |
| Full apply logs/report | ⬜ |
| Post-verify samples | ⬜ |
| E2E test output | ⬜ |
| Approvals (Ops, Lisa) | ⬜ |
| Rollback scripts | ⬜ |

---

## References

- [HOMER_LP-1.4.6.5_HES.md](docs/lisa/HOMER_LP-1.4.6.5_HES.md) — HES skeleton
- [HOMER_LP-1.4.6.4_HES.md](docs/lisa/HOMER_LP-1.4.6.4_HES.md) — Staging verification
- [PR #380](https://github.com/twgallo13/ROPI-V2.1/pull/380) — Date UI fix
- Tag: `lp-1.4.6.4-d588802`
