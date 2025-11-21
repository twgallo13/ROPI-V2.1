#!/bin/bash
# Homer: Monitor Phase B Workflow Run
# Run this after manually dispatching the workflow
# Usage: ./operations/monitor-phaseb-run.sh [RUN_ID]

set -euo pipefail

REPO="twgallo13/ROPI-V2.1"
RUN_ID="${1:-}"

if [[ -z "$RUN_ID" ]]; then
  echo "Getting latest Phase B workflow run..."
  RUN_ID=$(gh run list --repo "$REPO" \
    --workflow=seed-attributes-phaseb.yml \
    --branch main --limit 1 \
    --json databaseId --jq '.[0].databaseId')
  
  if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
    echo "❌ No Phase B runs found. Have you dispatched the workflow?"
    echo ""
    echo "To dispatch manually:"
    echo "1. Go to: https://github.com/$REPO/actions/workflows/seed-attributes-phaseb.yml"
    echo "2. Click 'Run workflow'"
    echo "3. Set: branch=main, environment=PRODUCTION, approval='Approve — seed to PRODUCTION'"
    exit 1
  fi
fi

echo "🤖 Homer: Monitoring Phase B Run $RUN_ID"
echo "Run URL: https://github.com/$REPO/actions/runs/$RUN_ID"
echo ""

# Get run status
echo "Checking run status..."
RUN_INFO=$(gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion,createdAt,updatedAt)
STATUS=$(echo "$RUN_INFO" | jq -r .status)
CONCLUSION=$(echo "$RUN_INFO" | jq -r .conclusion)

echo "Status: $STATUS"
if [[ "$CONCLUSION" != "null" ]]; then
  echo "Conclusion: $CONCLUSION"
fi
echo ""

if [[ "$STATUS" == "waiting" ]]; then
  echo "⏳ Run is waiting (likely for environment approval)"
  echo ""
  echo "To approve:"
  echo "1. Open: https://github.com/$REPO/actions/runs/$RUN_ID"
  echo "2. Click 'Review deployments' button"
  echo "3. Check 'PRODUCTION' environment"
  echo "4. Click 'Approve and deploy'"
  echo ""
  echo "Re-run this script after approving to continue monitoring."
  exit 0
fi

if [[ "$STATUS" == "queued" || "$STATUS" == "in_progress" ]]; then
  echo "⏳ Run is $STATUS. Watching logs..."
  echo ""
  gh run watch "$RUN_ID" --repo "$REPO" || {
    echo "⚠️  Watch failed or interrupted"
    echo "Check run status: https://github.com/$REPO/actions/runs/$RUN_ID"
  }
  echo ""
fi

# Get final status
echo "Getting final run status..."
RUN_INFO=$(gh run view "$RUN_ID" --repo "$REPO" --json status,conclusion)
STATUS=$(echo "$RUN_INFO" | jq -r .status)
CONCLUSION=$(echo "$RUN_INFO" | jq -r .conclusion)

echo "Status: $STATUS"
echo "Conclusion: $CONCLUSION"
echo ""

if [[ "$CONCLUSION" == "success" ]]; then
  echo "✅ Run completed successfully!"
  echo ""
  echo "🤖 Starting artifact collection..."
  
  if [[ -x "./operations/collect-phaseb-artifacts.sh" ]]; then
    ./operations/collect-phaseb-artifacts.sh "$RUN_ID"
  else
    echo "❌ Artifact collection script not found or not executable"
    echo "Please run manually:"
    echo "  ./operations/collect-phaseb-artifacts.sh $RUN_ID"
  fi
elif [[ "$CONCLUSION" == "failure" ]]; then
  echo "❌ Run failed!"
  echo ""
  echo "Fetching last 200 lines of logs..."
  gh run view "$RUN_ID" --repo "$REPO" --log | tail -200
  echo ""
  echo "Full logs: https://github.com/$REPO/actions/runs/$RUN_ID"
elif [[ "$CONCLUSION" == "cancelled" ]]; then
  echo "⚠️  Run was cancelled"
else
  echo "⚠️  Run status: $STATUS, conclusion: $CONCLUSION"
fi

echo ""
echo "Run URL: https://github.com/$REPO/actions/runs/$RUN_ID"
