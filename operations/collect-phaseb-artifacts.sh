#!/bin/bash
# Homer: Phase B Artifact Collection Script
# Run this after the Phase B workflow completes
# Usage: ./operations/collect-phaseb-artifacts.sh <RUN_ID>

set -euo pipefail
IFS=$'\n\t'

REPO="twgallo13/ROPI-V2.1"
RUN_ID="${1:-}"
PR_NUM=98
ART_DIR="operations/review-artifacts/attribute-registry"
TS=$(date -u +"%Y%m%dT%H%M%SZ")
ART_BRANCH="artifacts/seed-${TS}"

if [[ -z "$RUN_ID" ]]; then
  echo "❌ ERROR: RUN_ID required"
  echo "Usage: $0 <RUN_ID>"
  echo ""
  echo "Get RUN_ID from: https://github.com/$REPO/actions/workflows/seed-attributes-phaseb.yml"
  echo "Or run: gh run list --repo $REPO --workflow=seed-attributes-phaseb.yml --branch main --limit 1"
  exit 1
fi

echo "🤖 Homer: Collecting Phase B artifacts for run $RUN_ID"
echo ""

echo "1️⃣ Checking run status..."
RUN_STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion --jq '.status + " " + (.conclusion // "pending")')
echo "   Status: $RUN_STATUS"

if [[ "$RUN_STATUS" != "completed"* ]]; then
  echo "⚠️  Run is not completed yet. Current status: $RUN_STATUS"
  echo "   Wait for the run to complete, then run this script again."
  exit 0
fi

echo ""
echo "2️⃣ Downloading workflow artifacts..."
mkdir -p "$ART_DIR"
gh run download "$RUN_ID" --repo "$REPO" --dir "$ART_DIR" || {
  echo "⚠️  No artifacts to download or download failed"
  echo "   Check if workflow uploaded artifacts: https://github.com/$REPO/actions/runs/$RUN_ID"
}

echo ""
echo "3️⃣ Listing downloaded artifacts..."
if ls -lh "$ART_DIR"/*.json "$ART_DIR"/*.log 2>/dev/null; then
  echo "✅ Artifacts found!"
else
  echo "⚠️  No JSON or log files found in $ART_DIR"
  echo "   Listing directory contents:"
  ls -lh "$ART_DIR" || echo "   Directory empty or doesn't exist"
fi

echo ""
echo "4️⃣ Creating artifact branch off main..."
git fetch origin
git checkout -b "$ART_BRANCH" origin/main

echo ""
echo "5️⃣ Adding artifacts and committing..."
git add "$ART_DIR"
if git diff --cached --quiet; then
  echo "⚠️  No changes to commit (artifacts may already be committed)"
else
  git -c user.name='Homer (automation)' -c user.email='homer@shiekhshoes.org' \
    commit -m "chore(seed): add Phase B production seed artifacts ($TS)

Run ID: $RUN_ID
Run URL: https://github.com/$REPO/actions/runs/$RUN_ID

Artifacts:
- Pre-seed backup JSON
- Seed execution log
- Post-seed validation log

Related: PR #$PR_NUM"
  echo "✅ Artifacts committed!"
fi

echo ""
echo "6️⃣ Pushing artifact branch..."
git push -u origin "$ART_BRANCH"

echo ""
echo "7️⃣ Creating artifacts PR..."
ART_PR_URL=$(gh pr create --repo "$REPO" --title "chore(seed): Phase B production seed artifacts ($TS)" \
  --body "$(cat <<EOF
# Phase B Production Seed Artifacts

**Run ID**: $RUN_ID  
**Run URL**: https://github.com/$REPO/actions/runs/$RUN_ID  
**Timestamp**: $TS

## Contents

Artifacts stored in \`$ART_DIR\`:
- **Backup JSON**: Pre-seed state of attribute_keys collection
- **Seed Log**: Execution log from normalizeAndSeedAttributes.ts
- **Validation Log**: Post-seed validation results

## Purpose

Audit trail for Phase B production attribute registry seed operation.

## Review Checklist

- [ ] Backup file present and contains expected document count
- [ ] Seed log shows 77 keys processed
- [ ] Validation log confirms spot-checks passed:
  - \`sku_core.department\`
  - \`descriptive.material\`
  - \`descriptive.sportsTeam\`
  - \`descriptive.primaryColor\`
  - \`ai.description_generated\`

## Related

- Original PR: #$PR_NUM
- Workflow: https://github.com/$REPO/actions/workflows/seed-attributes-phaseb.yml

## Action

Review artifacts and merge when satisfied, or request changes if issues found.
EOF
)" --base main --head "$ART_BRANCH") || {
  echo "❌ PR creation failed"
  echo "   You may need to create it manually from: https://github.com/$REPO/compare/$ART_BRANCH"
  ART_PR_URL="<manual creation needed>"
}

echo "✅ Artifacts PR created: $ART_PR_URL"

echo ""
echo "8️⃣ Gathering artifact details for summary..."

# Find artifact files
BACKUP=$(ls -1 "$ART_DIR"/attribute-keys-backup-*.json 2>/dev/null | head -1 || echo "")
SEED_LOG=$(ls -1 "$ART_DIR"/normalize-seed-*.log 2>/dev/null | head -1 || echo "")
VALIDATE_LOG=$(ls -1 "$ART_DIR"/seed-validate-*.log 2>/dev/null | head -1 || echo "")

# Get backup count
BACKUP_COUNT="N/A"
if [[ -n "$BACKUP" ]] && [[ -f "$BACKUP" ]]; then
  BACKUP_COUNT=$(jq '. | length' "$BACKUP" 2>/dev/null || echo "N/A")
fi

# Get run conclusion
RUN_CONCLUSION=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq .conclusion)

# Extract validation results
VALIDATION_RESULTS=""
if [[ -n "$VALIDATE_LOG" ]] && [[ -f "$VALIDATE_LOG" ]]; then
  VALIDATION_RESULTS=$(grep -E "(sku_core\.department|descriptive\.material|descriptive\.sportsTeam|descriptive\.primaryColor|ai\.description_generated)" "$VALIDATE_LOG" 2>/dev/null || echo "See full validation log in artifacts PR")
fi

echo ""
echo "9️⃣ Posting summary to PR #$PR_NUM..."
gh pr comment "$PR_NUM" --repo "$REPO" --body "$(cat <<EOFSUM
## 🎯 Homer: Phase B Production Seed Complete

**Run ID**: $RUN_ID  
**Run URL**: https://github.com/$REPO/actions/runs/$RUN_ID  
**Status**: $RUN_CONCLUSION  
**Artifacts PR**: $ART_PR_URL  
**Timestamp**: $TS

### Results Summary

**Backup**: \`${BACKUP:-not found}\`  
- Documents in backup: **$BACKUP_COUNT**

**Seed Log**: \`${SEED_LOG:-not found}\`  
**Validation Log**: \`${VALIDATE_LOG:-not found}\`

### Validation Spot-Checks

\`\`\`
$VALIDATION_RESULTS
\`\`\`

### Review Actions

1. Review artifacts in PR: $ART_PR_URL
2. Verify backup document count matches expectations
3. Check seed log for any errors or warnings
4. Confirm all 5 spot-check keys are FOUND
5. Merge artifacts PR when satisfied

### Full Logs

All logs and artifacts available in the artifacts PR linked above.

---

**Expected**: 77 attribute keys seeded  
**Audit trail**: All artifacts committed to \`$ART_BRANCH\` for review  
**Homer**: Artifact collection complete! ✅
EOFSUM
)" || {
  echo "⚠️  Failed to post summary to PR #$PR_NUM"
  echo "   Please add this summary manually:"
  echo "   - Run: https://github.com/$REPO/actions/runs/$RUN_ID"
  echo "   - Artifacts PR: $ART_PR_URL"
  echo "   - Backup count: $BACKUP_COUNT"
}

echo ""
echo "✅ Homer: Artifact collection and PR creation complete!"
echo ""
echo "📋 Summary:"
echo "   - Artifacts branch: $ART_BRANCH"
echo "   - Artifacts PR: $ART_PR_URL"
echo "   - Backup docs: $BACKUP_COUNT"
echo "   - Run status: $RUN_CONCLUSION"
echo ""
echo "Next: Review artifacts PR and merge when satisfied."
