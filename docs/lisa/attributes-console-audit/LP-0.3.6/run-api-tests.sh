#!/bin/bash
# LP-0.3.6 API Verification Tests for Mapping UI Preview

set -e
cd /workspaces/ROPI-V2.1

OUTDIR="docs/lisa/attributes-console-audit/LP-0.3.6"
LOGFILE="$OUTDIR/api-tests.log"

# Fresh admin token
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IjM4MTFiMDdmMjhiODQxZjRiNDllNDgyNTg1ZmQ2NmQ1NWUzOGRiNWQiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiVGhlbyAoQWRtaW4gRTJFKSIsInJvbGUiOiJhZG1pbiIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9yb3BpLWJjY2VlIiwiYXVkIjoicm9waS1iY2NlZSIsImF1dGhfdGltZSI6MTc2NjE3OTA0NSwidXNlcl9pZCI6InptQW44a0tURTNaVzNmTTM4NmQ4dGlXVzk3VTIiLCJzdWIiOiJ6bUFuOGtLVEUzWlczZk0zODZkOHRpV1c5N1UyIiwiaWF0IjoxNzY2MTc5MDQ1LCJleHAiOjE3NjYxODI2NDUsImVtYWlsIjoidGhlb0BzaGlla2guY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGhlb0BzaGlla2guY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.n6dPDc6szeHjkxHjjgsQuypahfWvlTYfHT6u7XMUEQTtie0-qnqLESlBdcv_XaxSPZIsrQMuqlnODRHAP8X-_UNkP_ILAqPmzCkaETjY_1XiV1cZM1MH0pZCjGMj2Al1sWdc1BldbEz52CkpWPKO--gDhijcRZDfiuo0xa87mS-ex07D3Cl9uWmUHE_TZmU04byzcoRKY3X-SPEUqvolLWHRK7loapAfdQ6nLOGtyu9fdpejkyqRabkBMpZfcXQaxdXXl-LI8xJvRSEmO2fRWMKcJWk6L-KMMEVPpAj_A_jRZ6VvnafOp8iS_qj_w-qtsFq5IwFf_MQjapPxmBXigA"

# PR #291 Preview URL uses staging API (Firebase hosting rewrites)
API="https://ropi-aoss-staging.web.app/api"

echo "==========================================" > "$LOGFILE"
echo "LP-0.3.6 Mapping UI API Verification Tests" >> "$LOGFILE"
echo "Preview: https://ropi-aoss-staging--pr-291-4wf3bj6d.web.app" >> "$LOGFILE"
echo "API Base: $API" >> "$LOGFILE"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> "$LOGFILE"
echo "==========================================" >> "$LOGFILE"
echo "" >> "$LOGFILE"

# Test 1: GET Global Mapping
echo "=== Test 1: GET Global Mapping ===" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-global-mapping.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/mappings")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
cat "$OUTDIR/get-global-mapping.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 1 PASS: GET global mapping returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 1 FAIL: GET global mapping returned $HTTP_CODE" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 2: GET Attribute Mapping (primary_color)
echo "=== Test 2: GET Attribute Mapping (primary_color) ===" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-primary_color-mapping.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/attributes/primary_color/mapping")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
cat "$OUTDIR/get-primary_color-mapping.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 2 PASS: GET primary_color mapping returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 2 FAIL: GET primary_color mapping returned $HTTP_CODE" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 3: PUT Add alias for testing
echo "=== Test 3: PUT Add Test Alias (LP-0.3.6-TestAlias) ===" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/put-test-alias.json" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aliases":{"LP036TestAlias":"primary_color"},"value_synonyms":{},"reason":"LP-0.3.6 verification test alias"}' \
  "$API/admin/settings/mappings?merge=true")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
cat "$OUTDIR/put-test-alias.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 3 PASS: PUT test alias returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 3 FAIL: PUT test alias returned $HTTP_CODE" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 4: PUT Add synonym for primary_color
echo "=== Test 4: PUT Add Test Synonym (navy blue -> Navy) ===" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/put-test-synonym.json" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aliases":{},"value_synonyms":{"Navy":["navy blue","dark blue"]},"reason":"LP-0.3.6 verification test synonym"}' \
  "$API/admin/settings/attributes/primary_color/mapping?merge=true")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
cat "$OUTDIR/put-test-synonym.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 4 PASS: PUT test synonym returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 4 FAIL: PUT test synonym returned $HTTP_CODE" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 5: Import Preview
echo "=== Test 5: POST Import Preview ===" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/post-import-preview.json" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sampleRows":[{"LP036TestAlias":"navy blue","size":"sm"},{"LP036TestAlias":"red","size":"lg"}]}' \
  "$API/admin/imports/preview")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
cat "$OUTDIR/post-import-preview.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 5 PASS: POST import preview returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 5 FAIL: POST import preview returned $HTTP_CODE" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 6: GET attributes list (verify API working)
echo "=== Test 6: GET Attributes List ===" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-attributes-list.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/attributes")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "(Response truncated)" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 6 PASS: GET attributes list returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 6 FAIL: GET attributes list returned $HTTP_CODE" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

echo "==========================================" >> "$LOGFILE"
echo "API Tests Complete" >> "$LOGFILE"
echo "==========================================" >> "$LOGFILE"

echo ""
echo "API tests complete. Results saved to $LOGFILE"
