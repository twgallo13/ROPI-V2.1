#!/bin/bash
# Test CORS on actual import function endpoints

set -e

IMPORT_URL="https://us-central1-ropi-bccee.cloudfunctions.net/importCSV"
DRYRUN_URL="https://us-central1-ropi-bccee.cloudfunctions.net/importDryRun"
ORIGIN="https://ropi-bccee.web.app"

echo "=== Testing CORS on actual import functions ==="
echo ""

# Test 1: importCSV without auth (expect 401 with CORS headers)
echo "Test 1: POST importCSV without auth"
curl -i -X POST "$IMPORT_URL" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: multipart/form-data" \
  2>&1 | tee /tmp/importcsv-401.txt
echo ""
if grep -qi "access-control-allow-origin" /tmp/importcsv-401.txt; then
  echo "✅ PASS: CORS header present on importCSV 401"
else
  echo "❌ FAIL: CORS header missing on importCSV 401"
fi
echo ""
echo "---"
echo ""

# Test 2: importDryRun without auth (expect 401 with CORS headers)
echo "Test 2: POST importDryRun without auth"
curl -i -X POST "$DRYRUN_URL" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: multipart/form-data" \
  2>&1 | tee /tmp/importdryrun-401.txt
echo ""
if grep -qi "access-control-allow-origin" /tmp/importdryrun-401.txt; then
  echo "✅ PASS: CORS header present on importDryRun 401"
else
  echo "❌ FAIL: CORS header missing on importDryRun 401"
fi

echo ""
echo "=== Test Complete ==="
