#!/bin/bash
# Homer: Complete Phase B Dispatch and Collection
# Run this after manually dispatching the workflow from GitHub UI
# This script automates monitoring and artifact collection

set -euo pipefail
IFS=$'\n\t'

REPO="twgallo13/ROPI-V2.1"
WF_PATH=".github/workflows/seed-attributes-phaseb.yml"
REF="main"
PR_NUM=98
ART_DIR="operations/review-artifacts/attribute-registry"

echo "🤖 Homer: Phase B Complete Automation"
echo "======================================="
echo ""

# Check if workflow has been dispatched
echo "Checking for latest Phase B run..."
RUN_ID=$(gh run list --repo "$REPO" --workflow="$WF_PATH" --branch "$REF" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")

if [[ -z "$RUN_ID" || "$RUN_ID" == "null" ]]; then
  echo "❌ No Phase B runs found."
  echo ""
  echo "📋 Manual Dispatch Required:"
  echo "   1. Go to: https://github.com/$REPO/actions/workflows/seed-attributes-phaseb.yml"
  echo "   2. Click 'Run workflow'"
  echo "   3. Set: branch=main, environment=PRODUCTION, approval='Approve — seed to PRODUCTION'"
  echo "   4. Click 'Run workflow'"
  echo ""
  echo "After dispatching, run this script again or use:"
  echo "   ./operations/monitor-phaseb-run.sh"
  exit 0
fi

echo "✅ Found run: $RUN_ID"
echo "   URL: https://github.com/$REPO/actions/runs/$RUN_ID"
echo ""

# Use the monitor script
if [[ -x "operations/monitor-phaseb-run.sh" ]]; then
  echo "🔍 Starting run monitor..."
  ./operations/monitor-phaseb-run.sh "$RUN_ID"
else
  echo "⚠️  Monitor script not found, using manual process..."
  
  # Watch the run
  echo "Watching run..."
  gh run watch "$RUN_ID" --repo "$REPO" || {
    echo "Watch interrupted. Check: https://github.com/$REPO/actions/runs/$RUN_ID"
  }
  
  # Collect artifacts
  if [[ -x "operations/collect-phaseb-artifacts.sh" ]]; then
    echo ""
    echo "📦 Collecting artifacts..."
    ./operations/collect-phaseb-artifacts.sh "$RUN_ID"
  else
    echo "❌ Artifact collector not found"
    echo "   Please run: ./operations/collect-phaseb-artifacts.sh $RUN_ID"
  fi
fi

echo ""
echo "✅ Homer: Automation complete!"
echo "   Check PR #$PR_NUM for summary"
