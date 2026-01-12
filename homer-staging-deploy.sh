#!/bin/bash
# Homer's Staging Deployment Script - Canonical MPN Remediation
# Target: aoss-main (STAGING ONLY)
# LP: Staging Verification Pass — Canonical MPN Remediation

set -e

echo "🚀 CANONICAL MPN REMEDIATION - STAGING DEPLOYMENT (aoss-main)"
echo "============================================================="
echo "Timestamp: $(date -Iseconds)"
echo "Target: STAGING (aoss-main) ONLY"
echo ""

# Staging configuration
PROJECT_ID="ropi-bccee"
STAGING_TARGET="aoss-staging"

echo "📋 STAGING DEPLOYMENT CONFIGURATION"
echo "Project ID: $PROJECT_ID"
echo "Staging URL: $STAGING_URL"
echo ""

# Pre-flight checks
echo "🔍 PRE-FLIGHT CHECKS"
echo "===================="

# Check credentials
if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "❌ GOOGLE_APPLICATION_CREDENTIALS not set"
  exit 1
else
  echo "✅ Credentials configured"
fi

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
  echo "❌ Firebase CLI not found"
  exit 1
else
  echo "✅ Firebase CLI available"
fi

# Check gcloud CLI
if ! command -v gcloud &> /dev/null; then
  echo "❌ gcloud CLI not found"
  exit 1
else
  echo "✅ gcloud CLI available"
fi

echo ""

# STAGING DEPLOYMENT STEPS
echo "🏗️  STAGING DEPLOYMENT STEPS"
echo "============================="

echo "STEP 1: Deploy Firestore Rules & Indexes"
echo "firebase deploy --only firestore:rules --project=$PROJECT_ID"
echo "firebase deploy --only firestore:indexes --project=$PROJECT_ID"
echo ""

echo "STEP 2: Build and Deploy API Functions"
echo "pnpm --filter @ropi-aoss/api build"
echo "firebase deploy --only functions --project=$PROJECT_ID"
echo ""

echo "STEP 3: Build and Deploy Web Application"
echo "pnpm --filter @ropi-aoss/web build"
echo "firebase deploy --only hosting --project=$PROJECT_ID"
echo ""

echo "STEP 4: Execute Migration in Staging"
echo "node packages/api/scripts/migrate_mpn.js --apply --batch-size=200 --project=$PROJECT_ID > /tmp/migration_apply_aoss-main.json"
echo ""

echo "STEP 5: Verification Commands"
echo "curl -v \"$STAGING_URL/api/products/106-test/completion\""
echo "./scripts/verify-canonical-remediation.sh"
echo "./scripts/check-no-productId.sh"
echo ""

echo "📋 HOMER'S EXECUTION CHECKLIST"
echo "==============================="
echo "✅ Execute each step manually and save full console output"
echo "✅ Create staging_deploy_log.txt with deployment receipts"
echo "✅ Save migration_apply_aoss-main.json"
echo "✅ Resolve missing MPN product (product_guardrail_test_1767442442)"
echo "✅ Complete verification pack with evidence"
echo "✅ Submit deliverables for ISA review"
echo ""

echo "⚠️  CRITICAL: STAGING (aoss-main) ONLY - NO PRODUCTION DEPLOYMENT"