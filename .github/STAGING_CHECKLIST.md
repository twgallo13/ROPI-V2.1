# LP Staging Checklist

**Required for every LP-x.x.x Pull Request**

This checklist must be completed and evidence provided before an LP PR can be merged.

---

## Pre-Deployment Checklist

### 1. Firestore Backup
- [ ] **Backup ID (GCS path):** `gs://ropi-aoss-backups/lp-X.X.X-firestore-backup-YYYYMMDDTHHMMSSZ`
- [ ] **Timestamp:** YYYY-MM-DD HH:MM:SS UTC
- [ ] **Collections backed up:** (list collections)
- [ ] **Backup verified:** Confirmed export completed successfully

```bash
# Example backup command:
gcloud firestore export gs://ropi-aoss-backups/lp-X.X.X-firestore-backup-$(date -u +%Y%m%dT%H%M%SZ) \
  --collection-ids=products,settings \
  --project=ropi-bccee
```

---

### 2. CI/CD Status
- [ ] **CI Pass Link:** [GitHub Actions Run URL]
- [ ] All lint checks pass
- [ ] All tests pass
- [ ] Build succeeds

---

### 3. Firebase Deploy (Staging)
- [ ] **Deploy Type:** (firestore:rules / functions / hosting / all)
- [ ] **Deploy Command:** `firebase deploy --only <target> --project=ropi-bccee`
- [ ] **Deploy Logs:** (paste or link to logs)

```
# Paste firebase deploy output here:
=== Deploying to 'ropi-bccee'...
✔ Deploy complete!
```

---

## Validation Tests

### Test A: [Primary Validation]
- [ ] **Test Type:** (unit / integration / manual)
- [ ] **Description:** 
- [ ] **Command/Steps:** 
- [ ] **Expected Result:** 
- [ ] **Actual Result:** 
- [ ] **Status:** PASS / FAIL

```
# Paste test output here
```

---

### Test B: [Secondary Validation]
- [ ] **Test Type:** (unit / integration / manual)
- [ ] **Description:** 
- [ ] **Command/Steps:** 
- [ ] **Expected Result:** 
- [ ] **Actual Result:** 
- [ ] **Status:** PASS / FAIL

```
# Paste test output here
```

---

### Test C: [Integration/API Validation]
- [ ] **Test Type:** (API / E2E / manual)
- [ ] **Description:** 
- [ ] **Command/Steps:** 
- [ ] **Expected Result:** 
- [ ] **Actual Result:** 
- [ ] **Status:** PASS / FAIL

```
# Paste test output here
```

---

## Migration/Normalization Tasks (if applicable)

### Dry-Run Output
- [ ] **Dry-run executed:** Yes / No / N/A
- [ ] **Dry-run command:** 
- [ ] **Dry-run output:** (paste or attach file)

### Limited Staging Run
- [ ] **Batch size:** (e.g., 100 products)
- [ ] **Run command:** 
- [ ] **Run output:** (paste or attach)

### Sample Document Snapshots
- [ ] **Before snapshot:** (JSON or screenshot)
- [ ] **After snapshot:** (JSON or screenshot)
- [ ] **Verified fields updated correctly:** Yes / No

---

## Breaking Changes Assessment

- [ ] **Any breaking changes?** Yes / No
- [ ] If Yes, **Remediation Plan:**

```
# Describe remediation steps if any client behaviors break
```

---

## Final Sign-off

- [ ] All checklist items completed
- [ ] All tests pass (PASS)
- [ ] No unresolved errors or warnings
- [ ] Ready for merge

**Completed by:** @username
**Date:** YYYY-MM-DD

---

## Quick Reference: LP Naming Conventions

| Item | Format | Example |
|------|--------|---------|
| Branch | `lp/<version>-<short-desc>` | `lp/2.0.1-firestore-lockdown` |
| PR Title | `LP-X.X.X: Short description` | `LP-2.0.1: Firestore — restrict product writes to admin/server` |
| Commit | `LP-X.X.X: Action description` | `LP-2.0.1: Firestore — restrict product writes to admin/server` |
| Backup | `gs://ropi-aoss-backups/lp-X.X.X-...` | `gs://ropi-aoss-backups/lp-2.0.1-firestore-backup-20251221T071151Z` |
