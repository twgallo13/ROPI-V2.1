# Phase B Seed Instructions

**Status:** ⏳ Ready to execute, waiting for Theo's approval  
**Created:** 2025-11-18  
**Branch:** integration/review-attributekey-20251118

## Prerequisites Completed ✅

- [x] Phase A dry-run complete (77 attributes normalized)
- [x] Artifacts reviewed and committed to PR #98
- [x] Phase B runner script created (`scripts/seed-phaseb.sh`)
- [x] GitHub Actions workflow created (`.github/workflows/seed-attributes-phaseb.yml`)
- [x] All safety checks implemented

## Execution Options

### Option 1: GitHub Actions (Recommended)

**Advantages:**
- Uses existing `SERVICE_ACCOUNT_JSON` secret (secure)
- Creates downloadable artifacts
- Full audit trail in GitHub
- No local credential exposure

**Steps:**

1. Navigate to workflow:
   ```
   https://github.com/twgallo13/ROPI-V2.1/actions/workflows/seed-attributes-phaseb.yml
   ```

2. Click "Run workflow" (top right)

3. Configure inputs:
   - **Use workflow from:** `integration/review-attributekey-20251118`
   - **environment:** `PRODUCTION`
   - **approval:** `Approve — seed to PRODUCTION` (exact match)

4. Click "Run workflow" (green button)

5. Monitor execution in Actions tab

6. Review PR comment automatically posted with results

7. Download artifacts from workflow run (90-day retention)

### Option 2: Local Execution

**Requirements:**
- Production service account JSON file
- File must be for project: `ropi-bccee`

**Steps:**

```bash
cd /workspaces/ROPI-V2.1

# Set environment variables
export APPROVAL="Approve — seed to PRODUCTION"
export FIREBASE_PROJECT_PROD_ID="ropi-bccee"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/ropi-bccee-service-account.json"

# Verify credentials
jq -r .project_id "$GOOGLE_APPLICATION_CREDENTIALS"
# Should output: ropi-bccee

# Run Phase B
./scripts/seed-phaseb.sh
```

## Safety Checks (Built-in)

The Phase B script will automatically verify:

1. **Approval String:**
   - Must exactly match: `Approve — seed to PRODUCTION`
   - Prevents accidental execution

2. **Service Account Project:**
   - Extracts `project_id` from service account JSON
   - Compares to `FIREBASE_PROJECT_PROD_ID`
   - Prompts for confirmation if mismatch

3. **Git Working Tree:**
   - Must be clean (no uncommitted changes)
   - Prevents conflicts during artifact commit

4. **Git Branch:**
   - Must be on: `integration/review-attributekey-20251118`
   - Ensures artifacts go to correct PR

## Expected Outputs

### Artifacts Created

All files committed to `operations/review-artifacts/attribute-registry/`:

1. **`attribute-keys-backup-<TIMESTAMP>.json`**
   - Complete backup of pre-seed state
   - Includes: timestamp, project, environment, count, data
   - Used for rollback if needed

2. **`normalize-seed-<TIMESTAMP>.log`**
   - Full output from seed script execution
   - Shows each attribute key processed
   - Any errors or warnings

3. **`seed-validate-<TIMESTAMP>.log`**
   - Validation results for 5 spot-checked IDs
   - Total document count post-seed
   - JSON format for easy parsing

### PR Comment Posted

Automated comment includes:
- Artifact file paths
- Backup count vs. final count
- Validation results (FOUND/MISSING for each ID)
- Post-seed checklist for Theo
- Rollback instructions

## Validation Spot-Checks

Phase B automatically validates these 5 canonical IDs:

1. `sku_core.department` - Core product categorization
2. `descriptive.material` - Material normalization
3. `descriptive.sportsTeam` - Team normalization (City TeamName)
4. `descriptive.primaryColor` - Color normalization (Title Case)
5. `ai.description_generated` - AI tracking field

Expected: All 5 should show **FOUND** status

## Rollback Procedure

If issues discovered after seeding, restore from backup:

```bash
cd /workspaces/ROPI-V2.1

# Set the backup file (use actual timestamp)
BACKUP_FILE="operations/review-artifacts/attribute-registry/attribute-keys-backup-<TIMESTAMP>.json"

# Verify backup exists and contains data
jq -r '.count' "$BACKUP_FILE"

# Set credentials (same as for seed)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/ropi-bccee-service-account.json"

# Run restore script
node -e '
const admin = require("firebase-admin");
const fs = require("fs");

const sa = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({credential: admin.credential.cert(sa)});

(async () => {
  const backup = JSON.parse(fs.readFileSync(process.argv[1]));
  const db = admin.firestore();
  
  console.log("Restoring from:", backup.timestamp);
  console.log("Document count:", backup.count);
  
  const keys = backup.data;
  for (const id of Object.keys(keys)) {
    await db.collection("settings").doc("attributes").collection("keys").doc(id).set(keys[id], {merge: true});
    console.log("Restored:", id);
  }
  
  console.log("Restore complete:", Object.keys(keys).length, "documents");
  process.exit(0);
})().catch(e => {
  console.error("Restore failed:", e);
  process.exit(1);
});
' "$BACKUP_FILE"
```

## Post-Seed Verification (Theo)

After Phase B completes, verify in Firebase Console:

### 1. Navigate to Firestore
```
https://console.firebase.google.com/project/ropi-bccee/firestore
```

### 2. Check Collection Path
```
settings (document) → attributes (subcollection) → keys (subcollection)
```

### 3. Verify Document Count
- Should see 77 documents (or expected count from dry-run)
- Each document ID = canonical path (e.g., `sku_core.department`)

### 4. Spot-Check Normalizations

**Team Normalization:**
- Document: `descriptive.sportsTeam`
- Field: `normalizedValues` or similar
- Expected: City TeamName format (e.g., "Los Angeles Lakers")

**Color Normalization:**
- Document: `descriptive.primaryColor`
- Field: `normalizedValues` or similar
- Expected: Title Case (e.g., "Navy Blue")

**Material Deduplication:**
- Document: `descriptive.material`
- Field: `normalizedValues` or similar
- Expected: Standardized (e.g., "Man-Made")

### 5. Verify Merge Behavior
- Check a few documents for unexpected field overwrites
- Seed uses `merge: true` - should preserve existing fields

### 6. Review Seed Logs
- Check `normalize-seed-<TIMESTAMP>.log` for errors
- Confirm all 77 attributes processed
- No critical exceptions

## Timeline

- **Phase A (Dry-run):** ✅ Completed 2025-11-18 07:19 UTC
- **Phase B Infrastructure:** ✅ Ready 2025-11-18 07:31 UTC
- **Phase B Execution:** ⏳ Waiting for Theo's approval
- **Estimated Duration:** 2-5 minutes (backup + seed + validate)

## Contact

**Questions or Issues:**
- Post in PR #98 comments
- Tag @theo or @homer in Slack
- Reference artifact paths for debugging

## Final Checklist

Before triggering Phase B:

- [ ] Reviewed dry-run artifacts (CSV + JSON)
- [ ] Confirmed 77 attributes is correct count
- [ ] Verified normalization rules look correct
- [ ] Ready to approve with exact phrase
- [ ] Know how to access Firebase Console for verification
- [ ] Understand rollback procedure if needed

**Ready to proceed when Theo approves.**
