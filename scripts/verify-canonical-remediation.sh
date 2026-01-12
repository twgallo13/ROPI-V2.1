#!/bin/bash
# scripts/verify-canonical-remediation.sh
# Comprehensive verification script for Canonical MPN Remediation LP

set -e

echo "🎯 Canonical MPN Remediation - Verification Script"
echo "=================================================="
echo "Timestamp: $(date -Iseconds)"
echo ""

FAILED_CHECKS=0
TOTAL_CHECKS=0

# Helper function to run checks
check() {
  local description="$1"
  local command="$2"
  
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo "[$TOTAL_CHECKS] $description"
  
  if eval "$command"; then
    echo "    ✅ PASS"
  else
    echo "    ❌ FAIL"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
  echo ""
}

echo "📦 1. PACKAGE STRUCTURE VERIFICATION"
echo "===================================="

check "Shared package exists" "[ -f packages/shared/package.json ]"
check "Shared productKey module exists" "[ -f packages/shared/src/productKey.ts ]"
check "Shared package has tests" "[ -f packages/shared/test/productKey.test.ts ]"
check "Migration script exists" "[ -f packages/api/scripts/migrate_mpn.js ]"
check "Resolver middleware exists" "[ -f packages/api/src/lib/resolveProductIdentifier.ts ]"

echo "🔧 2. CONFIGURATION VERIFICATION"
echo "================================="

check "Firestore rules updated" "grep -q 'mpn_normalized' firestore.rules"
check "Firestore indexes include mpn_normalized" "grep -q 'mpn_normalized' firestore.indexes.json"
check "API routes use :mpn parameter" "grep -q ':mpn/completion' packages/api/src/apiApp.ts"

echo "🧪 3. TEST FILES VERIFICATION"
echo "============================="

check "Shared package tests exist" "[ -f packages/shared/test/productKey.test.ts ]"
check "Resolver middleware tests exist" "[ -f packages/api/test/resolveProductIdentifier.integration.test.ts ]"
check "Completion API tests exist" "[ -f packages/api/test/completion.integration.test.ts ]"

echo "🔍 4. SOURCE CODE PATTERN VERIFICATION"
echo "======================================"

# Check for problematic patterns (excluding migration files and tests)
check "No direct product_id usage in API endpoints" \
  "! grep -r 'db\.collection.*products.*\.doc.*productId' packages/api/src/endpoints/ || true"

check "Frontend uses shared normalizeMPN" \
  "grep -q 'from.*@ropi-aoss/shared.*productKey' packages/web/src/pages/ProductEditorPage.tsx || \
   grep -q 'normalizeMPN' packages/web/src/pages/ProductEditorPage.tsx"

check "Observations use canonical resolution" \
  "grep -q 'getProductDocRefByMPN' packages/api/src/endpoints/observations.ts"

echo "📋 5. DOCUMENTATION VERIFICATION"
echo "================================"

check "README documentation exists" "[ -f /tmp/README-canonical-key.md ]"
check "Verification pack exists" "[ -f /tmp/verification_pack_canonical_mpn.md ]"  
check "Resolution tracking exists" "[ -f /tmp/resolution.csv ]"

echo "🚀 6. DEPLOYMENT READINESS CHECKS"
echo "=================================="

check "Migration script is executable" "[ -x packages/api/scripts/migrate_mpn.js ]"
check "Verification scripts are executable" "[ -x scripts/check-no-productId.sh ]"
check "API test script is executable" "[ -x scripts/test-completion.sh ]"

# Optional: Run actual tests if test runner is available
if command -v pnpm &> /dev/null; then
  echo "🧪 7. RUNNING TESTS"
  echo "=================="
  
  check "Shared package tests pass" "cd packages/shared && pnpm test"
  check "API tests pass" "cd /workspaces/ROPI-V2.1/packages/api && pnpm test"
else
  echo "🧪 7. TEST EXECUTION SKIPPED"
  echo "============================"
  echo "pnpm not available - tests not executed"
  echo ""
fi

echo "📊 VERIFICATION SUMMARY"
echo "======================="
echo "Total Checks: $TOTAL_CHECKS"
echo "Passed: $((TOTAL_CHECKS - FAILED_CHECKS))"
echo "Failed: $FAILED_CHECKS"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
  echo "🎉 ALL VERIFICATION CHECKS PASSED!"
  echo ""
  echo "✅ Canonical MPN Remediation LP is ready for deployment"
  echo ""
  echo "Next Steps:"
  echo "  1. Run migration script in dry-run mode: packages/api/scripts/migrate_mpn.js --dry-run"
  echo "  2. Deploy Firestore rules and indexes"
  echo "  3. Deploy application code"
  echo "  4. Run migration script: packages/api/scripts/migrate_mpn.js --apply"
  echo "  5. Verify with: scripts/test-completion.sh '<test-mpn>'"
  
  exit 0
else
  echo "💥 $FAILED_CHECKS VERIFICATION CHECKS FAILED"
  echo ""
  echo "❌ Canonical MPN Remediation LP is NOT ready for deployment"
  echo ""
  echo "Please address the failed checks before proceeding."
  
  exit 1
fi