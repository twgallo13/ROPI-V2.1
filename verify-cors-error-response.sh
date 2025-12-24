#!/bin/bash
# LP-ATTR-1.3.1: Verify CORS headers on error responses (400/401/500)
# Test that Access-Control-Allow-Origin is present even when errors occur

set -e

FUNCTION_URL="${1:-https://us-central1-ropi-bccee.cloudfunctions.net/api}"
ORIGIN="https://ropi-bccee.web.app"

echo "=== LP-ATTR-1.3.1 CORS Error Response Verification ==="
echo "Function URL: $FUNCTION_URL"
echo "Origin: $ORIGIN"
echo ""

# Test 1: POST with no auth token (should return 401 with CORS headers)
echo "Test 1: POST /admin/imports/apply without auth (expect 401 + CORS headers)"
curl -i -X POST \
  "$FUNCTION_URL/admin/imports/apply" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: multipart/form-data" \
  2>&1 | tee /tmp/cors-test-401.txt
echo ""
echo "Checking for Access-Control-Allow-Origin in response..."
if grep -q "access-control-allow-origin" /tmp/cors-test-401.txt; then
  echo "✅ PASS: CORS header present on 401 response"
else
  echo "❌ FAIL: CORS header missing on 401 response"
fi
echo ""
echo "---"
echo ""

# Test 2: POST dry-run with no auth token (should return 401 with CORS headers)
echo "Test 2: POST /admin/imports/dry-run without auth (expect 401 + CORS headers)"
curl -i -X POST \
  "$FUNCTION_URL/admin/imports/dry-run" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: multipart/form-data" \
  2>&1 | tee /tmp/cors-test-dryrun-401.txt
echo ""
echo "Checking for Access-Control-Allow-Origin in response..."
if grep -q "access-control-allow-origin" /tmp/cors-test-dryrun-401.txt; then
  echo "✅ PASS: CORS header present on dry-run 401 response"
else
  echo "❌ FAIL: CORS header missing on dry-run 401 response"
fi
echo ""
echo "---"
echo ""

# Test 3: POST with invalid content type (should return 400 with CORS headers)
echo "Test 3: POST /admin/imports/apply with invalid content-type (expect 400 + CORS headers)"
curl -i -X POST \
  "$FUNCTION_URL/admin/imports/apply" \
  -H "Origin: $ORIGIN" \
  -H "Authorization: Bearer fake-token" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  2>&1 | tee /tmp/cors-test-400.txt
echo ""
echo "Checking for Access-Control-Allow-Origin in response..."
if grep -q "access-control-allow-origin" /tmp/cors-test-400.txt; then
  echo "✅ PASS: CORS header present on 400 response"
else
  echo "❌ FAIL: CORS header missing on 400 response"
fi
echo ""

echo "=== Verification Complete ==="
echo "Review output above for CORS header presence on error responses"
