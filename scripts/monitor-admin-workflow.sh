#!/bin/bash
# Monitor script for set-admin-claim workflow runs

REPO="twgallo13/ROPI-V2.1"
WORKFLOW="set-admin-claim.yml"

echo "Fetching latest run for $WORKFLOW..."

# Get the latest run
RUN_DATA=$(gh run list --repo "$REPO" --workflow="$WORKFLOW" --limit 1 --json databaseId,status,conclusion,createdAt,displayTitle 2>&1)

if echo "$RUN_DATA" | grep -q "no runs found"; then
  echo "No runs found yet. Please trigger the workflow first:"
  echo "  https://github.com/$REPO/actions/workflows/$WORKFLOW"
  exit 1
fi

RUN_ID=$(echo "$RUN_DATA" | jq -r '.[0].databaseId')
STATUS=$(echo "$RUN_DATA" | jq -r '.[0].status')
TITLE=$(echo "$RUN_DATA" | jq -r '.[0].displayTitle')

echo "Found run #$RUN_ID: $TITLE"
echo "Current status: $STATUS"
echo ""

if [ "$STATUS" = "completed" ]; then
  CONCLUSION=$(echo "$RUN_DATA" | jq -r '.[0].conclusion')
  echo "Run already completed with conclusion: $CONCLUSION"
  echo ""
else
  echo "Watching run progress..."
  gh run watch "$RUN_ID" --repo "$REPO" || true
  echo ""
fi

# Fetch logs
echo "Fetching logs..."
gh run view "$RUN_ID" --repo "$REPO" --log > /tmp/set-admin-$RUN_ID.log 2>&1

echo "Logs saved to: /tmp/set-admin-$RUN_ID.log"
echo ""

# Extract key information
echo "===== DECODE STEP ====="
grep -A 5 "Decode service account key" /tmp/set-admin-$RUN_ID.log | head -20 || echo "Decode step not found in logs"
echo ""

echo "===== VALIDATION RESULT ====="
grep -B 2 -A 2 "Decoded service account JSON present" /tmp/set-admin-$RUN_ID.log || echo "Validation message not found"
echo ""

echo "===== SET ADMIN SCRIPT ====="
grep -A 10 "Run set-admin script" /tmp/set-admin-$RUN_ID.log | head -15 || echo "Set admin script output not found"
echo ""

echo "===== CUSTOM CLAIMS VERIFICATION ====="
grep -i "customClaims" /tmp/set-admin-$RUN_ID.log || echo "Custom claims verification not found"
echo ""

# Check for errors
echo "===== ERROR CHECK ====="
if grep -i "error" /tmp/set-admin-$RUN_ID.log | head -10; then
  echo "(Errors found above)"
else
  echo "No errors found in logs"
fi
echo ""

# Final summary
FINAL_STATUS=$(gh run view "$RUN_ID" --repo "$REPO" --json conclusion --jq '.conclusion')
echo "===== FINAL RESULT ====="
echo "Run ID: $RUN_ID"
echo "URL: https://github.com/$REPO/actions/runs/$RUN_ID"
echo "Conclusion: $FINAL_STATUS"

if [ "$FINAL_STATUS" = "success" ]; then
  echo ""
  echo "✅ SUCCESS - Admin claim should be set for theo@shiekhshoes.org"
  echo ""
  echo "Next steps:"
  echo "1. Sign out and sign back in on staging"
  echo "2. Run in browser console to verify claim:"
  echo "   firebase.auth().currentUser.getIdToken(true)"
  echo "     .then(() => firebase.auth().currentUser.getIdTokenResult())"
  echo "     .then(t => console.log(t.claims));"
  echo "3. Look for { role: 'admin' } in the output"
else
  echo ""
  echo "❌ FAILED - Check logs above for details"
  echo "Full logs: /tmp/set-admin-$RUN_ID.log"
fi
