# Staging Dry-Run Migration Instructions
## PR #238 Role System Migration - DRY RUN

**Date:** December 9, 2025  
**Status:** ⏳ READY TO EXECUTE (Requires Firebase credentials)

---

## Prerequisites

### Required
- ✅ PR #238 merged to aoss-main
- ✅ Staging deployment completed
- ✅ `GOOGLE_APPLICATION_CREDENTIALS` environment variable set
- ✅ Service account with Firestore access

### Command Setup
```bash
# Set credentials (replace with actual path)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/staging-sa.json"

# Navigate to repo
cd /workspaces/ROPI-V2.1

# Install dependencies (if not done)
pnpm install
```

---

## Dry-Run Execution

### Command
```bash
# Create reports directory
mkdir -p reports

# Run dry-run migration
pnpm ts-node scripts/migrate-user-claims.ts --dry-run
```

### Expected Output

#### Console Output
```
🚀 Starting user claims migration...
Mode: DRY RUN

⏭️  Skipping user@example.com: already has role 'admin'
🔍 [DRY RUN] Would migrate user2@example.com: 'catalog_editor' → 'merch'
🔍 [DRY RUN] Would migrate user3@example.com: 'viewer' → 'viewer'

📊 Migration Summary:
Total users: 3
Migrated: 1
Skipped: 1
Errors: 0

📄 Report saved to: reports/user_claims_migration_dryrun.csv

⚠️  This was a DRY RUN. No changes were made.
Run without --dry-run to apply changes.
```

#### CSV Output Format
File: `reports/user_claims_migration_dryrun.csv`

```csv
uid,email,old_role,new_role,status,error,timestamp
user123,admin@shiekh.com,platform_admin,admin,skipped,,2025-12-09T14:15:00Z
user456,merch@shiekh.com,catalog_editor,merch,success,,2025-12-09T14:15:01Z
user789,user@shiekh.com,viewer,viewer,success,,2025-12-09T14:15:02Z
```

---

## Dry-Run Verification Checklist

After the dry-run completes, verify:

### CSV Report
- [ ] File exists: `reports/user_claims_migration_dryrun.csv`
- [ ] Header row present: `uid,email,old_role,new_role,status,error,timestamp`
- [ ] Data rows match user count in Firebase Auth
- [ ] All statuses are 'success', 'skipped', or 'error'
- [ ] No actual Firestore changes made (dry-run mode)

### Migration Accuracy
- [ ] **Total users:** Match Firebase Auth user count
- [ ] **platform_admin → admin:** Correct mapping
- [ ] **district_manager → admin:** Correct mapping
- [ ] **automation_service → admin:** Correct mapping
- [ ] **catalog_editor → merch:** Correct mapping
- [ ] **store_manager → merch:** Correct mapping
- [ ] **viewer → viewer:** Correct mapping
- [ ] **Unknown roles → viewer:** Default mapping applied
- [ ] **null/undefined roles → viewer:** Default mapping applied

### Data Integrity
- [ ] No duplicate UIDs in report
- [ ] All emails valid and unique
- [ ] Timestamps consistent (chronological)
- [ ] No sensitive data exposed in CSV

### Error Handling
- [ ] If errors present, error messages are clear
- [ ] No unknown errors
- [ ] All expected success/skip combinations present

---

## Sample User Migration Matrix

Test the following scenarios in the dry-run:

| Email | Current Role | Expected New Role | Expected Status |
|-------|--------------|-------------------|-----------------|
| admin@shiekh.com | platform_admin | admin | success |
| manager@shiekh.com | district_manager | admin | success |
| service@shiekh.com | automation_service | admin | success |
| merch@shiekh.com | catalog_editor | merch | success |
| sales@shiekh.com | store_manager | merch | success |
| viewer@shiekh.com | viewer | viewer | success |
| new@shiekh.com | (none) | viewer | success |
| already-admin@shiekh.com | admin | admin | skipped |

---

## Dry-Run Results Expected

### Total User Count
- Should match: `gcloud auth list --filter="status:ACTIVE"` count
- Expected for ropi-bccee project: ~10-20 staging users

### Migration Breakdown
- **Skipped:** Users already with new roles
- **Success:** Users needing role migration
- **Errors:** (Should be zero if no permission issues)

### Common Statistics
```
Total users processed:     ~15
Successfully migrated:     ~8
Already correct role:      ~6
Errors:                    0
```

---

## Troubleshooting

### Issue: `GOOGLE_APPLICATION_CREDENTIALS not set`
**Solution:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
# Verify:
echo $GOOGLE_APPLICATION_CREDENTIALS
```

### Issue: `Permission denied on Firestore`
**Solution:**
- Verify service account has `roles/firebase.firebaseAgent`
- Check Firestore rules allow `settings/user-migrations`
- Ensure project ID matches environment variable

### Issue: `ts-node not found`
**Solution:**
```bash
pnpm install -D ts-node
# Or use pnpm ts-node (auto-discovery)
```

### Issue: CSV file not created
**Solution:**
- Verify `reports/` directory exists
- Check file system permissions
- Ensure script completes without errors

---

## Next Steps After Dry-Run

### If Dry-Run Looks Good ✅
1. Review CSV report for accuracy
2. Confirm all user mappings correct
3. Proceed to Firestore backup
4. Run live migration (Step 4)

### If Issues Found ❌
1. Document specific issues in this file
2. Create GitHub issue for investigation
3. Do NOT proceed to live migration
4. Wait for fixes before retrying dry-run

---

## Firestore Backup (Before Live Migration)

Only run this after confirming dry-run results are correct:

```bash
# Set timestamp
export TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")

# Create Firestore backup
gcloud firestore export gs://ropi-aoss-backups/migrations/user-claims-backup-${TIMESTAMP} \
  --project=ropi-bccee \
  --quiet

# Verify backup created
gsutil ls -l gs://ropi-aoss-backups/migrations/user-claims-backup-${TIMESTAMP}
```

**Backup Location:** `gs://ropi-aoss-backups/migrations/user-claims-backup-{TIMESTAMP}`

---

## Dry-Run Completion Checklist

- [ ] Migration script executed successfully
- [ ] CSV report generated: `reports/user_claims_migration_dryrun.csv`
- [ ] All user mappings correct
- [ ] No errors encountered
- [ ] Report reviewed and approved
- [ ] Results match expectations
- [ ] Ready to proceed with live migration

---

## Sign-Off

**Dry-Run Executor:** [Name]  
**Execution Time:** [Date/Time]  
**Results Status:** [ ] PASS / [ ] FAIL  
**Issues Found:** [List any]  
**Approval to Proceed:** [ ] YES / [ ] NO  

---

## Commands Reference

```bash
# Setup
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa.json"
cd /workspaces/ROPI-V2.1
mkdir -p reports

# Dry-run
pnpm ts-node scripts/migrate-user-claims.ts --dry-run

# Inspect results
cat reports/user_claims_migration_dryrun.csv
wc -l reports/user_claims_migration_dryrun.csv  # Count rows

# Firestore backup (after dry-run approved)
export TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
gcloud firestore export gs://ropi-aoss-backups/migrations/user-claims-backup-${TIMESTAMP} \
  --project=ropi-bccee

# Live migration (after backup verified)
pnpm ts-node scripts/migrate-user-claims.ts
```

---

**Document Status:** Ready for staging execution  
**Created:** December 9, 2025, 14:00 UTC  
**Last Updated:** December 9, 2025, 14:00 UTC
