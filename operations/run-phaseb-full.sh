#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# config
REPO="twgallo13/ROPI-V2.1"
WORKDIR="/workspaces/ROPI-V2.1"
WF_PATH=".github/workflows/seed-attributes-phaseb.yml"
REF="main"
APPROVAL="Approve — seed to PRODUCTION"
ENVIRONMENT="PRODUCTION"
PR_NUM=98
ART_DIR="operations/review-artifacts/attribute-registry"

cd "$WORKDIR"

# 1) ensure main up-to-date and workflow is present
git fetch origin
git checkout main
git pull origin main

echo "Confirm workflow file present on origin/main:"
set +o pipefail
git ls-tree -r origin/main --name-only | grep -qF "$WF_PATH"
WF_FOUND=$?
set -o pipefail
if [[ $WF_FOUND -eq 0 ]]; then
  echo "OK: $WF_PATH present"
else
  echo "ERROR: $WF_PATH not found on origin/main"
  exit 1
fi

# 2) Quick smoke verification (non-watch)
npm ci
npm run lint || true
npm test -- --run
npm run build
npm --prefix functions ci
npm --prefix functions test -- --run

# 3) Dispatch workflow
if gh workflow run "$WF_PATH" --repo "$REPO" --ref "$REF" -f approval="$APPROVAL" -f environment="$ENVIRONMENT"; then
  echo "Workflow dispatched via gh."
else
  echo "gh dispatch failed (permissions?). Please run the workflow from the Actions UI at:"
  echo "https://github.com/$REPO/actions/workflows/seed-attributes-phaseb.yml"
  exit 0
fi

# 4) get latest run and watch it
sleep 4
RUN_ID=$(gh run list --repo "$REPO" --workflow="$WF_PATH" --branch "$REF" --limit 1 --json databaseId --jq '.[0].databaseId')
echo "Run URL: https://github.com/$REPO/actions/runs/$RUN_ID"
gh run watch "$RUN_ID" --repo "$REPO" || echo "Monitor the run in Actions UI: https://github.com/$REPO/actions/runs/$RUN_ID"

# 5) if the run paused for environment approval, post a note to PR #98
STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json status --jq '.status' || true)
if [[ "$STATUS" == "waiting" ]]; then
  echo "Run is waiting for environment approval. Please approve in Actions UI."
  gh pr comment "$PR_NUM" --repo "$REPO" --body "Phase B run $RUN_ID is waiting for PRODUCTION approval: https://github.com/$REPO/actions/runs/$RUN_ID. Please approve the deployment in Actions UI (Review deployments → Approve)."
  exit 0
fi

# 6) Collect artifacts (collector script)
if [[ -x "./operations/collect-phaseb-artifacts.sh" ]]; then
  ./operations/collect-phaseb-artifacts.sh "$RUN_ID"
else
  echo "Collector not found or not executable. Manually download artifacts from run and place under $ART_DIR."
fi

# 7) Post short summary to PR #98
BACKUP_FILE=$(ls -1 "$ART_DIR"/attribute-keys-backup-*.json 2>/dev/null | tail -n 1 || true)
SEED_LOG=$(ls -1 "$ART_DIR"/normalize-seed-*.log 2>/dev/null | tail -n 1 || true)
VALID_LOG=$(ls -1 "$ART_DIR"/seed-validate-*.log 2>/dev/null | tail -n 1 || true)

SUMMARY=$(cat <<EOF
Phase B run completed (or reached an endpoint).

Run: https://github.com/$REPO/actions/runs/$RUN_ID
Artifacts (if any) saved under: $ART_DIR

Backup: ${BACKUP_FILE:-none}
Seed log: ${SEED_LOG:-none}
Validation log: ${VALID_LOG:-none}

Please review artifacts PR (if created) and PR #98 for details.
EOF
)

gh pr comment "$PR_NUM" --repo "$REPO" --body "$SUMMARY" || echo "Failed to post PR comment. Please add summary to PR #$PR_NUM manually."

echo "Done."
