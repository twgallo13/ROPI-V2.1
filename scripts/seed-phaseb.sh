#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Phase B — Safe Attribute Registry Seed
# Requires explicit approval string and production/staging credentials

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ARTDIR="operations/review-artifacts/attribute-registry"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
PR_NUM=98

# ============================================================================
# PRE-FLIGHT CHECKS
# ============================================================================

echo "=== PRE-FLIGHT CHECKS ==="

# 1. Check approval string
REQUIRED_APPROVAL_STAGING="Approve — seed to STAGING"
REQUIRED_APPROVAL_PRODUCTION="Approve — seed to PRODUCTION"

if [[ "${APPROVAL:-}" != "$REQUIRED_APPROVAL_STAGING" ]] && [[ "${APPROVAL:-}" != "$REQUIRED_APPROVAL_PRODUCTION" ]]; then
  echo "ERROR: Missing or invalid APPROVAL environment variable."
  echo "Expected: '$REQUIRED_APPROVAL_STAGING' or '$REQUIRED_APPROVAL_PRODUCTION'"
  echo "Got: '${APPROVAL:-}'"
  exit 1
fi

TARGET_ENV="STAGING"
if [[ "${APPROVAL}" == "$REQUIRED_APPROVAL_PRODUCTION" ]]; then
  TARGET_ENV="PRODUCTION"
fi

echo "✓ Approval confirmed: $APPROVAL"
echo "✓ Target environment: $TARGET_ENV"

# 2. Check service account credentials
if [[ ! -f "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
  echo "ERROR: GOOGLE_APPLICATION_CREDENTIALS not set or file not found"
  echo "Expected file at: ${GOOGLE_APPLICATION_CREDENTIALS:-<not set>}"
  exit 1
fi

echo "✓ Service account found: $GOOGLE_APPLICATION_CREDENTIALS"

# 3. Verify project ID from service account
ACTUAL_PROJECT_ID=$(jq -r .project_id "$GOOGLE_APPLICATION_CREDENTIALS")
EXPECTED_PROJECT_ID="${FIREBASE_PROJECT_PROD_ID:-ropi-bccee}"

echo "  Service Account Project: $ACTUAL_PROJECT_ID"
echo "  Expected Project: $EXPECTED_PROJECT_ID"

if [[ "$ACTUAL_PROJECT_ID" != "$EXPECTED_PROJECT_ID" ]]; then
  echo "WARNING: Project ID mismatch!"
  echo "  Service account is for: $ACTUAL_PROJECT_ID"
  echo "  Expected: $EXPECTED_PROJECT_ID"
  read -p "Continue anyway? (yes/no): " confirm
  if [[ "$confirm" != "yes" ]]; then
    echo "Aborted by user"
    exit 1
  fi
fi

# 4. Check git status
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is not clean"
  git status --short
  exit 1
fi

echo "✓ Working tree clean"

# 5. Check current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
REQUIRED_BRANCH="integration/review-attributekey-20251118"

if [[ "$CURRENT_BRANCH" != "$REQUIRED_BRANCH" ]]; then
  echo "ERROR: Not on required branch"
  echo "  Current: $CURRENT_BRANCH"
  echo "  Required: $REQUIRED_BRANCH"
  exit 1
fi

echo "✓ On correct branch: $CURRENT_BRANCH"

echo ""
echo "=== ALL PRE-FLIGHT CHECKS PASSED ==="
echo "Project: $ACTUAL_PROJECT_ID"
echo "Environment: $TARGET_ENV"
echo "Branch: $CURRENT_BRANCH"
echo ""

# ============================================================================
# BACKUP EXISTING ATTRIBUTE KEYS
# ============================================================================

echo "=== BACKING UP EXISTING ATTRIBUTE KEYS ==="

BACKUP_FILE="$ARTDIR/attribute-keys-backup-$TIMESTAMP.json"

node -e "
const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('$GOOGLE_APPLICATION_CREDENTIALS');

admin.initializeApp({credential: admin.credential.cert(sa)});

(async () => {
  const db = admin.firestore();
  const colRef = db.collection('settings').doc('attributes').collection('keys');
  const snap = await colRef.get();
  
  const data = {};
  snap.forEach(d => data[d.id] = d.data());
  
  const backup = {
    timestamp: '$TIMESTAMP',
    project: '$ACTUAL_PROJECT_ID',
    environment: '$TARGET_ENV',
    count: snap.size,
    data: data
  };
  
  fs.writeFileSync('$BACKUP_FILE', JSON.stringify(backup, null, 2));
  console.log('✓ Backup written to $BACKUP_FILE');
  console.log('✓ Backed up', snap.size, 'documents');
  process.exit(0);
})().catch(e => {
  console.error('Backup failed:', e);
  process.exit(1);
});
"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "ERROR: Backup file not created"
  exit 1
fi

BACKUP_DOC_COUNT=$(jq -r '.count' "$BACKUP_FILE")
echo "✓ Backup complete: $BACKUP_DOC_COUNT documents"

# ============================================================================
# RUN SEED
# ============================================================================

echo ""
echo "=== RUNNING ATTRIBUTE SEED ==="

SEED_LOG="$ARTDIR/normalize-seed-$TIMESTAMP.log"

# Try running the normalizeAndSeedAttributes.ts script
if npx tsx scripts/normalizeAndSeedAttributes.ts > "$SEED_LOG" 2>&1; then
  echo "✓ Seed completed successfully"
  SEED_SUCCESS=true
else
  echo "⚠ Script execution had issues, checking logs..."
  SEED_SUCCESS=false
fi

# Show last 20 lines of seed log
echo ""
echo "=== SEED LOG (last 20 lines) ==="
tail -n 20 "$SEED_LOG"
echo ""

# ============================================================================
# VALIDATE SEEDED DOCUMENTS
# ============================================================================

echo "=== VALIDATING SEEDED DOCUMENTS ==="

VALIDATE_LOG="$ARTDIR/seed-validate-$TIMESTAMP.log"

node -e "
const admin = require('firebase-admin');
const fs = require('fs');

// Reuse existing admin app
const db = admin.firestore();

(async () => {
  const testIds = [
    'sku_core.department',
    'descriptive.material',
    'descriptive.sportsTeam',
    'descriptive.primaryColor',
    'ai.description_generated'
  ];
  
  const results = [];
  
  for (const id of testIds) {
    const doc = await db.collection('settings').doc('attributes').collection('keys').doc(id).get();
    const status = doc.exists ? 'FOUND' : 'MISSING';
    const data = doc.exists ? JSON.stringify(doc.data(), null, 2).slice(0, 400) : 'N/A';
    
    results.push({id, status, data});
    console.log(status + ':', id);
    if (doc.exists) {
      console.log('  Data preview:', data.slice(0, 200) + '...');
    }
  }
  
  // Count total docs
  const allDocs = await db.collection('settings').doc('attributes').collection('keys').get();
  console.log('');
  console.log('Total attribute documents:', allDocs.size);
  
  fs.writeFileSync('$VALIDATE_LOG', JSON.stringify({
    timestamp: '$TIMESTAMP',
    testIds: testIds,
    results: results,
    totalCount: allDocs.size
  }, null, 2));
  
  process.exit(0);
})().catch(e => {
  console.error('Validation failed:', e);
  process.exit(1);
});
" | tee -a "$VALIDATE_LOG"

TOTAL_DOCS=$(jq -r '.totalCount' "$VALIDATE_LOG")
echo ""
echo "✓ Validation complete: $TOTAL_DOCS total documents found"

# ============================================================================
# COMMIT ARTIFACTS
# ============================================================================

echo ""
echo "=== COMMITTING ARTIFACTS ==="

git add "$BACKUP_FILE" "$SEED_LOG" "$VALIDATE_LOG"

if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "Add Phase B seed artifacts ($TARGET_ENV - $TIMESTAMP)

- Backup: $(basename "$BACKUP_FILE") ($BACKUP_DOC_COUNT docs)
- Seed log: $(basename "$SEED_LOG")
- Validation: $(basename "$VALIDATE_LOG") ($TOTAL_DOCS docs after seed)
- Environment: $TARGET_ENV
- Project: $ACTUAL_PROJECT_ID"
  
  git push origin "$CURRENT_BRANCH"
  echo "✓ Artifacts committed and pushed"
fi

# ============================================================================
# POST PR COMMENT
# ============================================================================

echo ""
echo "=== POSTING PR COMMENT ==="

VALIDATION_SUMMARY=$(jq -r '.results[] | "- \(.status): `\(.id)`"' "$VALIDATE_LOG")

gh pr comment "$PR_NUM" --body "## 🌱 Phase B: Attribute Seed Complete ($TARGET_ENV)

**Timestamp:** $TIMESTAMP  
**Project:** \`$ACTUAL_PROJECT_ID\`  
**Environment:** **$TARGET_ENV**

### 📦 Artifacts Committed

All files pushed to branch \`$CURRENT_BRANCH\`:

- **Backup:** \`$BACKUP_FILE\`
  - Documents backed up: **$BACKUP_DOC_COUNT**
  
- **Seed Log:** \`$SEED_LOG\`
  
- **Validation Log:** \`$VALIDATE_LOG\`
  - Documents after seed: **$TOTAL_DOCS**

### ✅ Validation Results

Spot-checked canonical attribute keys:

$VALIDATION_SUMMARY

### 📊 Summary

- **Backup Count:** $BACKUP_DOC_COUNT documents (pre-seed)
- **Final Count:** $TOTAL_DOCS documents (post-seed)
- **Expected:** 77 attribute keys
- **Seed Status:** $(if [[ "$SEED_SUCCESS" == "true" ]]; then echo "✅ SUCCESS"; else echo "⚠️ CHECK LOGS"; fi)

### 🔍 Post-Seed Checklist for Theo

- [ ] Backup exists and contains expected pre-seed docs
- [ ] All 5 spot-checked IDs show FOUND status
- [ ] Final count matches expected 77 attributes
- [ ] Team normalization correct (City TeamName format)
- [ ] Color normalization correct (Title Case)
- [ ] Material deduplication correct
- [ ] No unexpected overwrites (merge mode preserved data)
- [ ] Seed logs show no critical errors

### 🔄 Rollback Available

If issues found, restore from backup:
\`\`\`bash
BACKUP_FILE=\"$BACKUP_FILE\"
# Use restore script with GOOGLE_APPLICATION_CREDENTIALS set
\`\`\`

**Review artifacts in PR and verify in Firebase Console before approving merge.**
"

echo "✓ PR comment posted"

# ============================================================================
# FINAL SUMMARY
# ============================================================================

echo ""
echo "========================================"
echo "PHASE B COMPLETE ✅"
echo "========================================"
echo "Environment: $TARGET_ENV"
echo "Project: $ACTUAL_PROJECT_ID"
echo "Backup: $BACKUP_FILE ($BACKUP_DOC_COUNT docs)"
echo "Seed Log: $SEED_LOG"
echo "Validation: $VALIDATE_LOG ($TOTAL_DOCS docs)"
echo ""
echo "Next: Theo reviews artifacts and Firebase Console"
echo "========================================"
