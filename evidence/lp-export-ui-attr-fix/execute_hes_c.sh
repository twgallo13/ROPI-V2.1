#!/bin/bash
# HES C Execution Script for LP-export-ui-attr-fix-1.0.0
# Run this after staging deploy completes

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EVIDENCE_DIR="$SCRIPT_DIR/evidence/lp-export-ui-attr-fix"
STAGING_URL="https://ropi-aoss-staging.web.app"
API_BASE="$STAGING_URL/api"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "HES C Execution - LP-export-ui-attr-fix-1.0.0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Evidence directory: $EVIDENCE_DIR"
echo "Staging URL: $STAGING_URL"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud not found"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl not found"; exit 1; }
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found (install: apt-get install jq)"; exit 1; }

# Check authentication
echo "Checking gcloud authentication..."
GCLOUD_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null || echo "")
if [ -z "$GCLOUD_ACCOUNT" ]; then
  echo "ERROR: Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi
echo "✓ Authenticated as: $GCLOUD_ACCOUNT"
echo ""

# Create evidence subdirectories
echo "Creating evidence subdirectories..."
mkdir -p "$EVIDENCE_DIR"/{deploy,baseline/{ui-screenshots,firestore-baseline},global-mode/ui-screenshots,classification/{vvp-screenshots,firestore-enforcement},vvp/vvp-ui-global,network,persistence/firestore-persisted-state,consolidated}
echo "✓ Directories created"
echo ""

# Get auth token
echo "Getting auth token..."
AUTH_TOKEN=$(gcloud auth print-identity-token)
if [ -z "$AUTH_TOKEN" ]; then
  echo "ERROR: Failed to get auth token"
  exit 1
fi
echo "✓ Auth token obtained"
echo ""

# Helper function for API calls
call_api() {
  local endpoint="$1"
  local output_file="$2"
  local description="${3:-API call}"
  
  echo "  → $description"
  echo "    Endpoint: $endpoint"
  
  HTTP_STATUS=$(curl -s -o "$output_file" -w '%{http_code}' \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$endpoint")
  
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "    ✓ Success (HTTP $HTTP_STATUS)"
    echo "    Saved to: $output_file"
    # Pretty-print JSON if jq is available
    if command -v jq >/dev/null 2>&1; then
      jq . "$output_file" > "${output_file}.tmp" && mv "${output_file}.tmp" "$output_file"
    fi
  else
    echo "    ✗ Failed (HTTP $HTTP_STATUS)"
    cat "$output_file" 2>/dev/null || echo "    (no response body)"
  fi
  echo ""
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 1: Baseline (SITE_SCOPED = OFF)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 1: Baseline (SITE_SCOPED = OFF)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "MANUAL STEP REQUIRED:"
echo "1. Open Firestore console: https://console.firebase.google.com/project/ropi-bccee/firestore"
echo "2. Navigate to: settings/exportSettings"
echo "3. Set exportGlobalMode = false (or delete the field)"
echo "4. Wait 30 seconds for cache refresh"
echo "5. Document toggle steps in: $EVIDENCE_DIR/baseline/toggle-evidence.txt"
echo ""
read -p "Press ENTER when ready to continue..."
echo ""

call_api "$API_BASE/export/readiness" \
  "$EVIDENCE_DIR/baseline/readiness-baseline.json" \
  "Readiness API (baseline)"

call_api "$API_BASE/products/18-test/completion" \
  "$EVIDENCE_DIR/baseline/product-completion-baseline.json" \
  "Product completion (baseline, product: 18-test)"

echo "MANUAL STEP REQUIRED:"
echo "1. Open staging UI: $STAGING_URL"
echo "2. Navigate to Export Readiness view"
echo "3. Take full-page screenshot → save to: $EVIDENCE_DIR/baseline/ui-screenshots/export-readiness-baseline.png"
echo "4. Navigate to VVP for product 18-test"
echo "5. Take VVP screenshot → save to: $EVIDENCE_DIR/baseline/ui-screenshots/vvp-baseline-18-test.png"
echo ""
read -p "Press ENTER when screenshots saved..."
echo ""

echo "MANUAL STEP REQUIRED:"
echo "1. Open Firestore console: https://console.firebase.google.com/project/ropi-bccee/firestore"
echo "2. Navigate to: settings/attributesMeta"
echo "3. Click document → Export to JSON → save to: $EVIDENCE_DIR/baseline/firestore-baseline/settings-attributesMeta.json"
echo "4. Navigate to: attributes/ (pick any classification attribute, e.g., attributes/product_classification)"
echo "5. Click document → Export to JSON → save to: $EVIDENCE_DIR/baseline/firestore-baseline/attribute-doc-sample.json"
echo ""
read -p "Press ENTER when Firestore exports saved..."
echo ""

echo "✓ Step 1 complete"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEP 2: GLOBAL Mode Verification
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "STEP 2: GLOBAL Mode Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "MANUAL STEP REQUIRED:"
echo "1. Open Firestore console: https://console.firebase.google.com/project/ropi-bccee/firestore"
echo "2. Navigate to: settings/exportSettings"
echo "3. Set exportGlobalMode = true"
echo "4. Wait 30 seconds for cache refresh"
echo "5. Document toggle steps in: $EVIDENCE_DIR/global-mode/toggle-evidence.txt"
echo ""
read -p "Press ENTER when ready to continue..."
echo ""

call_api "$API_BASE/export/readiness" \
  "$EVIDENCE_DIR/global-mode/readiness-global.json" \
  "Readiness API (GLOBAL ON)"

call_api "$API_BASE/products/18-test/completion" \
  "$EVIDENCE_DIR/global-mode/product-completion-global.json" \
  "Product completion (GLOBAL ON, product: 18-test)"

call_api "$API_BASE/export/required-attributes" \
  "$EVIDENCE_DIR/global-mode/required-attributes-runtime.json" \
  "Required attributes runtime (GLOBAL ON)"

echo "MANUAL STEP REQUIRED:"
echo "1. Refresh staging UI: $STAGING_URL (clear cache if needed)"
echo "2. Navigate to Export Readiness view"
echo "3. Take full-page screenshot → save to: $EVIDENCE_DIR/global-mode/ui-screenshots/export-readiness-global.png"
echo "4. Navigate to VVP for product 18-test"
echo "5. Take VVP screenshot → save to: $EVIDENCE_DIR/global-mode/ui-screenshots/vvp-global-18-test.png"
echo ""
read -p "Press ENTER when screenshots saved..."
echo ""

echo "✓ Step 2 complete"
echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# STEPS 3-6: Manual Steps
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "REMAINING STEPS (Manual)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Step 3: Classification Enforcement"
echo "  → Follow: $EVIDENCE_DIR/VERIFICATION_PLAN.md#step-3"
echo "  → Create: classification/classification-enforcement.json"
echo "  → Capture: classification/vvp-screenshots/"
echo ""
echo "Step 4: VVP Demonstration"
echo "  → Follow: $EVIDENCE_DIR/VERIFICATION_PLAN.md#step-4"
echo "  → Capture: vvp/vvp-ui-global/"
echo ""
echo "Step 5: Network Evidence"
echo "  → Follow: $EVIDENCE_DIR/VERIFICATION_PLAN.md#step-5"
echo "  → Use Chrome DevTools to capture network traces"
echo "  → Save: network/*.json"
echo ""
echo "Step 6: Persistence Bug Reproduction"
echo "  → Follow: $EVIDENCE_DIR/VERIFICATION_PLAN.md#step-6"
echo "  → Capture: persistence/persistence-repro.json"
echo ""
echo "Step 7: HES C Manifest"
echo "  → Fill in: docs/HES_C_LP-export-ui-attr-fix-1.0.0.json"
echo ""
echo "Step 8: Consolidated Package"
echo "  → Run: cd $EVIDENCE_DIR && zip -r HES_CONSOLIDATED.zip deploy/ baseline/ global-mode/ classification/ vvp/ network/ persistence/ README.md VERIFICATION_PLAN.md"
echo "  → Move: mv HES_CONSOLIDATED.zip consolidated/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Automated portions complete. See VERIFICATION_PLAN.md for remaining steps."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
