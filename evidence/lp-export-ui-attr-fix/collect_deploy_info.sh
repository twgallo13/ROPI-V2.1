#!/bin/bash
# Helper script to collect deploy information from maintainer response
# Usage: ./collect_deploy_info.sh <run_id>

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <workflow_run_id>"
  echo "Example: $0 12345678"
  exit 1
fi

RUN_ID="$1"
EVIDENCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$EVIDENCE_DIR/deploy"

echo "Collecting deploy information for run ID: $RUN_ID"
echo "Evidence directory: $EVIDENCE_DIR"
echo ""

# Ensure deploy directory exists
mkdir -p "$DEPLOY_DIR"

# Fetch workflow run details
echo "Fetching workflow run details..."
gh api "/repos/twgallo13/ROPI-V2.1/actions/runs/$RUN_ID" > "$DEPLOY_DIR/deploy-run-info.json"

# Extract key information
echo "Extracting deploy metadata..."
WORKFLOW_STATUS=$(jq -r '.status' "$DEPLOY_DIR/deploy-run-info.json")
WORKFLOW_CONCLUSION=$(jq -r '.conclusion' "$DEPLOY_DIR/deploy-run-info.json")
WORKFLOW_URL=$(jq -r '.html_url' "$DEPLOY_DIR/deploy-run-info.json")
HEAD_SHA=$(jq -r '.head_sha' "$DEPLOY_DIR/deploy-run-info.json")
CREATED_AT=$(jq -r '.created_at' "$DEPLOY_DIR/deploy-run-info.json")
UPDATED_AT=$(jq -r '.updated_at' "$DEPLOY_DIR/deploy-run-info.json")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Deploy Information"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Run ID:        $RUN_ID"
echo "Run URL:       $WORKFLOW_URL"
echo "Status:        $WORKFLOW_STATUS"
echo "Conclusion:    $WORKFLOW_CONCLUSION"
echo "Commit SHA:    $HEAD_SHA"
echo "Started:       $CREATED_AT"
echo "Completed:     $UPDATED_AT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Verify commit SHA matches expected
EXPECTED_SHA="8e0b80c805f1c30defad6e8f11ffe13f09f2aa0b"
if [[ "$HEAD_SHA" != "$EXPECTED_SHA"* ]]; then
  echo "⚠️  WARNING: Deployed commit ($HEAD_SHA) does not match expected commit ($EXPECTED_SHA)"
else
  echo "✓ Commit SHA verified: $HEAD_SHA"
fi
echo ""

# Fetch job logs
echo "Fetching job logs..."
JOB_ID=$(jq -r '.jobs_url' "$DEPLOY_DIR/deploy-run-info.json" | xargs gh api | jq -r '.jobs[0].id')
if [ -n "$JOB_ID" ]; then
  echo "Job ID: $JOB_ID"
  gh api "/repos/twgallo13/ROPI-V2.1/actions/jobs/$JOB_ID/logs" > "$DEPLOY_DIR/deploy-logs.txt" || echo "Failed to fetch logs"
else
  echo "Could not extract job ID"
fi
echo ""

# Extract service account from logs (if available)
echo "Extracting service account information from logs..."
if [ -f "$DEPLOY_DIR/deploy-logs.txt" ]; then
  SERVICE_ACCOUNT=$(grep -oP 'Activated service account credentials for: \[\K[^\]]+' "$DEPLOY_DIR/deploy-logs.txt" | head -1 || echo "NOT_FOUND")
  echo "Service Account: $SERVICE_ACCOUNT" > "$DEPLOY_DIR/service-account-evidence.txt"
  echo "✓ Service account: $SERVICE_ACCOUNT"
else
  echo "⚠️  Logs not available"
fi
echo ""

# Create summary for HES C manifest
echo "Creating summary for HES C manifest..."
cat > "$DEPLOY_DIR/deploy-summary.json" <<EOF
{
  "stagingDeployRunId": "$RUN_ID",
  "stagingDeployURL": "$WORKFLOW_URL",
  "deployStatus": "$WORKFLOW_CONCLUSION",
  "deployedCommitSHA": "$HEAD_SHA",
  "deployedAt": "$UPDATED_AT",
  "serviceAccountUsed": "${SERVICE_ACCOUNT:-UNKNOWN}",
  "stagingURLs": {
    "stable": "https://ropi-aoss-staging.web.app",
    "preview": "CHECK_WORKFLOW_LOGS"
  }
}
EOF
echo "✓ Summary saved to: $DEPLOY_DIR/deploy-summary.json"
echo ""

# Display next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Review deploy information in: $DEPLOY_DIR/"
echo "2. Copy values from deploy-summary.json into: docs/HES_C_LP-export-ui-attr-fix-1.0.0.json"
echo "3. Run HES C verification: ./execute_hes_c.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
