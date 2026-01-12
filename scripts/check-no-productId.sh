#!/bin/bash
# scripts/check-no-productId.sh
# Automated verification script to ensure no product_id references remain

echo "🔍 Scanning for remaining product_id references..."
echo "=============================================="

# Search for product_id patterns but exclude migration and test files
RESULTS=$(rg -n --hidden -S "(product_id|productId)" \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude="*.migration.*" \
  --exclude="*.test.*" \
  --exclude="*migration*.js" \
  --exclude="resolution.csv" \
  --exclude="INVESTIGATION_REPORT.md" \
  . || echo "")

if [ -z "$RESULTS" ]; then
  echo "✅ SUCCESS: No product_id references found in source code"
  echo ""
  echo "Excluded from search:"
  echo "  - Migration scripts and reports" 
  echo "  - Test files"
  echo "  - Node modules and git files"
  exit 0
else
  echo "❌ FAILED: Found product_id references that need remediation:"
  echo ""
  echo "$RESULTS"
  echo ""
  echo "Please update these references to use canonical MPN resolution"
  exit 1
fi