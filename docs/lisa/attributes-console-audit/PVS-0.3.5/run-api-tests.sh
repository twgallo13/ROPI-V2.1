#!/bin/bash
# PVS-0.3.5 API Verification Tests

set -e
cd /workspaces/ROPI-V2.1

# Directory for results
OUTDIR="docs/lisa/attributes-console-audit/PVS-0.3.5"
LOGFILE="$OUTDIR/api-tests.log"

# Admin token
TOKEN="eyJhbGciOiJSUzI1NiIsImtpZCI6IjM4MTFiMDdmMjhiODQxZjRiNDllNDgyNTg1ZmQ2NmQ1NWUzOGRiNWQiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiVGhlbyAoQWRtaW4gRTJFKSIsInJvbGUiOiJhZG1pbiIsImlzcyI6Imh0dHBzOi8vc2VjdXJldG9rZW4uZ29vZ2xlLmNvbS9yb3BpLWJjY2VlIiwiYXVkIjoicm9waS1iY2NlZSIsImF1dGhfdGltZSI6MTc2NjE3Nzc3MCwidXNlcl9pZCI6InptQW44a0tURTNaVzNmTTM4NmQ4dGlXVzk3VTIiLCJzdWIiOiJ6bUFuOGtLVEUzWlczZk0zODZkOHRpV1c5N1UyIiwiaWF0IjoxNzY2MTc3NzcwLCJleHAiOjE3NjYxODEzNzAsImVtYWlsIjoidGhlb0BzaGlla2guY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidGhlb0BzaGlla2guY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoicGFzc3dvcmQifX0.VaOUuBigbclE9VuYnsrOM8ujQYbk1pHyTMlDKJb1pEXv5W5yqvgAJP-yeVqvFsbUy3GM-jDFQp-Ec7zKbJtygSEbEXdyz_En_mSytqzWF5uPRDEhM6XDYiQS2QP8VghRNNvnM_iSJgUpytXZg-YyQxldw7Al03TIEtKIzUA5sYpplMKToUaAuSU5pp14uPPszKxEAUwarKjooT8Ty7fpinXtn55sL06HDlyj6RIa714ibNMHD51b3OeHA5y-WOppBPbawfUxbtLYBrtPoJ5BefL5uPS6RaiFlK_zB-IypK7XMOO8zuH590-s8xdkhmGMwhnGEnUk9M-arCFIPL3weA"

# Use hosting URL (with rewrites) instead of direct function URL
API="https://ropi-aoss-staging.web.app/api"

echo "==========================================" > "$LOGFILE"
echo "PVS-0.3.5 API Verification Tests" >> "$LOGFILE"
echo "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" >> "$LOGFILE"
echo "==========================================" >> "$LOGFILE"
echo "" >> "$LOGFILE"

# Test 2.1: GET Global Mapping
echo "=== Test 2.1: GET Global Mapping ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-global-mapping.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/mappings")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "Response saved to: get-global-mapping.json" >> "$LOGFILE"
cat "$OUTDIR/get-global-mapping.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 2.1 PASS: GET global mapping returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 2.1 FAIL: GET global mapping returned $HTTP_CODE (expected 200)" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 2.2: GET Attribute Mapping (primary_color)
echo "=== Test 2.2: GET Attribute Mapping (primary_color) ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-attr-mapping-primary_color.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/attributes/primary_color/mapping")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "Response saved to: get-attr-mapping-primary_color.json" >> "$LOGFILE"
cat "$OUTDIR/get-attr-mapping-primary_color.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 2.2 PASS: GET attribute mapping returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 2.2 FAIL: GET attribute mapping returned $HTTP_CODE (expected 200)" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 2.3: GET Attribute Mapping (rics_source.brand)
echo "=== Test 2.3: GET Attribute Mapping (rics_source.brand) ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-attr-mapping-brand.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/attributes/rics_source.brand/mapping")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "Response saved to: get-attr-mapping-brand.json" >> "$LOGFILE"
cat "$OUTDIR/get-attr-mapping-brand.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 2.3 PASS: GET rics_source.brand mapping returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 2.3 FAIL: GET rics_source.brand mapping returned $HTTP_CODE (expected 200)" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 2.4: PUT Global Mapping with merge=true
echo "=== Test 2.4: PUT Global Mapping (merge=true) ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/put-global-mapping.json" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aliases":{"TestVerification":"primary_color"},"value_synonyms":{},"reason":"PVS-0.3.5 verification test"}' \
  "$API/admin/settings/mappings?merge=true")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "Response saved to: put-global-mapping.json" >> "$LOGFILE"
cat "$OUTDIR/put-global-mapping.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Test 2.4 PASS: PUT global mapping returned 200" | tee -a "$LOGFILE"
else
  echo "❌ Test 2.4 FAIL: PUT global mapping returned $HTTP_CODE (expected 200)" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 2.5: Negative test - PUT with invalid canonical ID
echo "=== Test 2.5: PUT with Invalid Canonical ID (expect 400) ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/put-invalid-canonical.json" \
  -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"aliases":{"BadAlias":"nonexistent_attribute_xyz"},"reason":"Negative test"}' \
  "$API/admin/settings/mappings?merge=true")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "Response saved to: put-invalid-canonical.json" >> "$LOGFILE"
cat "$OUTDIR/put-invalid-canonical.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo "" >> "$LOGFILE"

if [ "$HTTP_CODE" = "400" ]; then
  echo "✅ Test 2.5 PASS: Invalid canonical ID returned 400 as expected" | tee -a "$LOGFILE"
else
  echo "❌ Test 2.5 FAIL: Invalid canonical ID returned $HTTP_CODE (expected 400)" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

# Test 2.6: GET after PUT to verify changes
echo "=== Test 2.6: GET after PUT to verify changes ===" >> "$LOGFILE"
echo "" >> "$LOGFILE"
HTTP_CODE=$(curl -sS -w '%{http_code}' -o "$OUTDIR/get-global-mapping-after-put.json" \
  -H "Authorization: Bearer $TOKEN" \
  "$API/admin/settings/mappings")
echo "HTTP Status: $HTTP_CODE" >> "$LOGFILE"
echo "Response saved to: get-global-mapping-after-put.json" >> "$LOGFILE"
cat "$OUTDIR/get-global-mapping-after-put.json" >> "$LOGFILE"
echo "" >> "$LOGFILE"
echo "" >> "$LOGFILE"

# Check if TestVerification alias exists
if grep -q "TestVerification" "$OUTDIR/get-global-mapping-after-put.json"; then
  echo "✅ Test 2.6 PASS: TestVerification alias persisted" | tee -a "$LOGFILE"
else
  echo "❌ Test 2.6 FAIL: TestVerification alias NOT found after PUT" | tee -a "$LOGFILE"
fi
echo "" >> "$LOGFILE"

echo "==========================================" >> "$LOGFILE"
echo "API Tests Complete" >> "$LOGFILE"
echo "==========================================" >> "$LOGFILE"

echo ""
echo "API tests complete. Results saved to $LOGFILE"
