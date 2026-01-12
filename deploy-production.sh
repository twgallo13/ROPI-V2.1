#!/bin/bash
# Production Deployment Plan - Canonical MPN Remediation
# Generated: 2026-01-12T05:30:00Z
# Status: READY FOR EXECUTION

set -e

echo "🚀 CANONICAL MPN REMEDIATION - PRODUCTION DEPLOYMENT"
echo "====================================================="
echo "Timestamp: $(date -Iseconds)"
echo ""

# Deployment configuration
PROJECT_ID="${PROJECT_ID:-ropi-aoss-production}"
BUCKET_NAME="${BACKUP_BUCKET:-ropi-aoss-backups}"

echo "📋 DEPLOYMENT CONFIGURATION"
echo "Project ID: $PROJECT_ID"
echo "Backup Bucket: $BUCKET_NAME"
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

# STEP 1: Backup Firestore
echo "💾 STEP 1: FIRESTORE BACKUP"
echo "============================"
BACKUP_PATH="gs://$BUCKET_NAME/backups/pre-mpn-migrate-$(date +%s)"
echo "Backup location: $BACKUP_PATH"

echo "gcloud firestore export $BACKUP_PATH --project=$PROJECT_ID"
echo "⚠️  Execute this command manually with proper GCP permissions"
echo ""

# STEP 2: Build and Deploy Firestore Rules & Indexes
echo "🔧 STEP 2: FIRESTORE RULES & INDEXES"
echo "===================================="
echo "firebase deploy --only firestore:rules --project=$PROJECT_ID"
echo "firebase deploy --only firestore:indexes --project=$PROJECT_ID"
echo ""

# STEP 3: Build and Deploy API
echo "🚀 STEP 3: API DEPLOYMENT"
echo "========================="
echo "pnpm --filter @ropi-aoss/api build"
echo "firebase deploy --only functions --project=$PROJECT_ID"
echo ""

# STEP 4: Build and Deploy Web
echo "🌐 STEP 4: WEB DEPLOYMENT"
echo "========================="
echo "pnpm --filter @ropi-aoss/web build"
echo "firebase deploy --only hosting --project=$PROJECT_ID"
echo ""

# STEP 5: Execute Migration
echo "🔄 STEP 5: DATA MIGRATION"
echo "========================="
echo "node packages/api/scripts/migrate_mpn.js --apply --batch-size=200 > /tmp/migration_apply_$(date +%s).json"
echo ""

# STEP 6: Verification
echo "✅ STEP 6: POST-DEPLOY VERIFICATION"
echo "==================================="
echo "./scripts/test-completion.sh 106-test"
echo "./scripts/verify-canonical-remediation.sh"
echo "./scripts/check-no-productId.sh"
echo ""

# Outstanding actions
echo "📋 OUTSTANDING ACTIONS"
echo "======================"
echo "1. Resolve missing MPN for: product_guardrail_test_1767442442"
echo "   - Recommendation: Exclude test product from migration"
echo "   - Alternative: Add MPN manually or create mapping"
echo ""

echo "🎯 DEPLOYMENT PLAN READY"
echo "Execute each step manually with appropriate project permissions"
echo "Monitor logs and verify functionality after each deployment phase"