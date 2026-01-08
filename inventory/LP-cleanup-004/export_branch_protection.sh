#!/usr/bin/env bash
set -euo pipefail
OWNER="twgallo13"
REPO="ROPI-V2.1"

mkdir -p inventory/LP-cleanup-004/evidence
# collect protected branch names
gh api -X GET "/repos/$OWNER/$REPO/branches" --paginate \
  | jq -r '.[] | select(.protected==true) | .name' > inventory/LP-cleanup-004/evidence/protected_branches.txt

# fetch protection for each protected branch
echo "[" > inventory/LP-cleanup-004/evidence/branch_protection_manual.json
first=true
while IFS= read -r BRANCH; do
  if [ "$first" = true ]; then first=false; else echo "," >> inventory/LP-cleanup-004/evidence/branch_protection_manual.json; fi
  echo "Fetching protection for branch: $BRANCH"
  if gh api -X GET "/repos/$OWNER/$REPO/branches/$BRANCH/protection" > inventory/LP-cleanup-004/evidence/protection_${BRANCH}.json 2>/dev/null; then
    jq --arg branch "$BRANCH" '. + {branch: $branch}' inventory/LP-cleanup-004/evidence/protection_${BRANCH}.json >> inventory/LP-cleanup-004/evidence/branch_protection_manual.json
  else
    # fallback: capture error
    echo "{\"branch\":\"$BRANCH\",\"error\":\"permission_or_not_protected\"}" >> inventory/LP-cleanup-004/evidence/branch_protection_manual.json
  fi
done < inventory/LP-cleanup-004/evidence/protected_branches.txt
echo "]" >> inventory/LP-cleanup-004/evidence/branch_protection_manual.json

# summary files
ls -lh inventory/LP-cleanup-004/evidence
echo "Done. File: inventory/LP-cleanup-004/evidence/branch_protection_manual.json"
