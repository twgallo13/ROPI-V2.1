#!/usr/bin/env bash
#
# verify-upload.sh - Verify uploaded observation images in Firebase Storage
#
# LP-observations-consolidation-1.1.0: Helper script to verify image uploads
#
# Usage:
#   ./scripts/verify-upload.sh <product_mpn> [bucket_name]
#
# Arguments:
#   product_mpn   - The product MPN to check for uploaded images
#   bucket_name   - Optional Firebase Storage bucket (default: ropi-dev.firebasestorage.app)
#
# Prerequisites:
#   - Firebase CLI installed (firebase-tools)
#   - Authenticated to Firebase project
#   - gsutil available (Google Cloud SDK)
#
# Example:
#   ./scripts/verify-upload.sh 553558-066
#   ./scripts/verify-upload.sh 553558-066 ropi-staging.appspot.com
#

set -e

PRODUCT_MPN=${1:-""}
BUCKET_NAME=${2:-"ropi-dev.firebasestorage.app"}

if [ -z "$PRODUCT_MPN" ]; then
  echo "❌ Error: Product MPN is required"
  echo ""
  echo "Usage: ./scripts/verify-upload.sh <product_mpn> [bucket_name]"
  echo ""
  echo "Example:"
  echo "  ./scripts/verify-upload.sh 553558-066"
  exit 1
fi

echo "🔍 Verifying observation image uploads for MPN: $PRODUCT_MPN"
echo "   Storage bucket: $BUCKET_NAME"
echo ""

# Check if gsutil is available
if ! command -v gsutil &> /dev/null; then
  echo "⚠️  gsutil not found. Trying firebase storage:list instead..."
  
  # Fallback to Firebase CLI if available
  if command -v firebase &> /dev/null; then
    echo "Using Firebase CLI to list storage..."
    # Note: Firebase CLI doesn't have direct storage listing
    echo "❌ Firebase CLI storage listing not directly supported."
    echo "   Please install Google Cloud SDK for gsutil access."
    exit 1
  else
    echo "❌ Neither gsutil nor firebase CLI found."
    echo "   Please install Google Cloud SDK or Firebase CLI."
    exit 1
  fi
fi

# Storage path pattern for observations
STORAGE_PATH="gs://${BUCKET_NAME}/observations/${PRODUCT_MPN}/"

echo "📂 Checking storage path: $STORAGE_PATH"
echo ""

# List files in the observations directory for this product
echo "📋 Files found:"
echo "----------------------------------------"

# Try to list with gsutil
if gsutil ls "$STORAGE_PATH" 2>/dev/null; then
  FILE_COUNT=$(gsutil ls "$STORAGE_PATH" 2>/dev/null | wc -l)
  echo "----------------------------------------"
  echo ""
  echo "✅ Found $FILE_COUNT file(s) for product $PRODUCT_MPN"
  
  # Show file details if any found
  if [ "$FILE_COUNT" -gt 0 ]; then
    echo ""
    echo "📊 File details:"
    gsutil ls -l "$STORAGE_PATH" 2>/dev/null
  fi
else
  echo "(No files found)"
  echo "----------------------------------------"
  echo ""
  echo "⚠️  No uploaded images found for product $PRODUCT_MPN"
  echo "   This could mean:"
  echo "   1. No images have been uploaded for this product"
  echo "   2. Images are stored under a different path (check product ID)"
  echo "   3. Storage bucket name is incorrect"
fi

echo ""
echo "🏁 Verification complete."
