#!/bin/bash

# Test Rule Server Validation (Step 2.2)
# Tests POST /admin/rules with invalid payloads

set -e

API_BASE="${ROPI_API_BASE:-https://us-central1-ropi-bccee.cloudfunctions.net/api}"
SA_KEY_B64="$GCP_SA_KEY_BASE64"

if [ -z "$SA_KEY_B64" ]; then
    echo "❌ Error: GCP_SA_KEY_BASE64 environment variable not set"
    exit 1
fi

# Function to get access token
get_access_token() {
    # Extract SA key data 
    echo "$SA_KEY_B64" | base64 -d > /tmp/sa-key.json
    
    # Get access token using gcloud (if available) or curl to Google OAuth2
    if command -v gcloud >/dev/null 2>&1; then
        gcloud auth activate-service-account --key-file=/tmp/sa-key.json --quiet >/dev/null 2>&1
        TOKEN=$(gcloud auth print-access-token)
    else
        # Use curl to get token directly from Google OAuth2 endpoint
        CLIENT_EMAIL=$(cat /tmp/sa-key.json | jq -r '.client_email')
        PRIVATE_KEY=$(cat /tmp/sa-key.json | jq -r '.private_key')
        
        # Create JWT assertion for service account
        HEADER=$(echo -n '{"alg":"RS256","typ":"JWT"}' | base64 -w0 | tr '/+' '_-' | tr -d '=')
        
        NOW=$(date +%s)
        EXP=$((NOW + 3600))
        
        PAYLOAD=$(echo -n "{\"iss\":\"$CLIENT_EMAIL\",\"scope\":\"https://www.googleapis.com/auth/cloud-platform\",\"aud\":\"https://oauth2.googleapis.com/token\",\"exp\":$EXP,\"iat\":$NOW}" | base64 -w0 | tr '/+' '_-' | tr -d '=')
        
        # For now, use a simpler approach - assume gcloud is available
        echo "❌ Error: gcloud CLI not available. Please install gcloud or run on a system with gcloud."
        exit 1
    fi
    
    rm -f /tmp/sa-key.json
    echo "$TOKEN"
}

# Get access token
echo "🔐 Getting access token..."
TOKEN=$(get_access_token)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get access token"
    exit 1
fi

echo "✅ Got access token"

echo "🧪 Testing Rule Server Validation (Step 2.2)"
echo "=================================================="

RESULTS_FILE="artifacts/rule_upsert_validation_test_$(date +%Y%m%d_%H%M%S).txt"
mkdir -p artifacts

{
    echo "Rule Server Validation Test Results"
    echo "Generated: $(date)"
    echo "API Base: $API_BASE"
    echo "Step: 2.2 - Server validate rule upserts"
    echo ""
} > "$RESULTS_FILE"

PASSED=0
FAILED=0

# Test 1: Missing targetField
echo "📝 Test 1: Missing targetField"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Test Rule Missing targetField",
        "condition": {"type": "always"},
        "actions": [{
            "valueTemplate": "Mens Clothing",
            "setOnlyIfEmpty": true
        }]
    }' \
    "$API_BASE/admin/rules")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

{
    echo "=== Test 1: Missing targetField ==="
    echo "HTTP Status: $HTTP_CODE"
    echo "Response Body: $BODY"
    echo ""
} >> "$RESULTS_FILE"

if [ "$HTTP_CODE" = "400" ] && echo "$BODY" | grep -q "RULE_INVALID_ACTION" && echo "$BODY" | grep -q "targetField"; then
    echo "   ✅ PASS: Correct validation error for missing targetField"
    PASSED=$((PASSED + 1))
else
    echo "   ❌ FAIL: Expected 400 with RULE_INVALID_ACTION about targetField"
    echo "   Got: HTTP $HTTP_CODE - $BODY"
    FAILED=$((FAILED + 1))
fi

# Test 2: Missing valueTemplate  
echo ""
echo "📝 Test 2: Missing valueTemplate"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Test Rule Missing valueTemplate",
        "condition": {"type": "always"},
        "actions": [{
            "targetField": "attributes.gender",
            "setOnlyIfEmpty": true
        }]
    }' \
    "$API_BASE/admin/rules")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

{
    echo "=== Test 2: Missing valueTemplate ==="
    echo "HTTP Status: $HTTP_CODE"
    echo "Response Body: $BODY"
    echo ""
} >> "$RESULTS_FILE"

if [ "$HTTP_CODE" = "400" ] && echo "$BODY" | grep -q "RULE_INVALID_ACTION" && echo "$BODY" | grep -q "valueTemplate"; then
    echo "   ✅ PASS: Correct validation error for missing valueTemplate"
    PASSED=$((PASSED + 1))
else
    echo "   ❌ FAIL: Expected 400 with RULE_INVALID_ACTION about valueTemplate"
    echo "   Got: HTTP $HTTP_CODE - $BODY"
    FAILED=$((FAILED + 1))
fi

# Test 3: Invalid onlyIfEmpty type
echo ""
echo "📝 Test 3: Invalid onlyIfEmpty type (string)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Test Rule Invalid onlyIfEmpty",
        "condition": {"type": "always"},
        "actions": [{
            "targetField": "attributes.gender",
            "valueTemplate": "Mens Clothing",
            "setOnlyIfEmpty": "true"
        }]
    }' \
    "$API_BASE/admin/rules")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

{
    echo "=== Test 3: Invalid onlyIfEmpty type ==="
    echo "HTTP Status: $HTTP_CODE" 
    echo "Response Body: $BODY"
    echo ""
} >> "$RESULTS_FILE"

if [ "$HTTP_CODE" = "400" ] && echo "$BODY" | grep -q "RULE_INVALID_ACTION" && echo "$BODY" | grep -q "boolean"; then
    echo "   ✅ PASS: Correct validation error for invalid onlyIfEmpty type"
    PASSED=$((PASSED + 1))
else
    echo "   ❌ FAIL: Expected 400 with RULE_INVALID_ACTION about boolean type"
    echo "   Got: HTTP $HTTP_CODE - $BODY"
    FAILED=$((FAILED + 1))
fi

# Test 4: Valid rule
echo ""
echo "📝 Test 4: Valid rule with onlyIfEmpty=true"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
        "title": "Valid Test Rule",
        "condition": {"type": "always"},
        "actions": [{
            "targetField": "attributes.gender",
            "valueTemplate": "Mens Clothing",
            "setOnlyIfEmpty": true
        }]
    }' \
    "$API_BASE/admin/rules")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

{
    echo "=== Test 4: Valid rule ==="
    echo "HTTP Status: $HTTP_CODE"
    echo "Response Body: $BODY"
    echo ""
} >> "$RESULTS_FILE"

if [ "$HTTP_CODE" = "201" ] && echo "$BODY" | grep -q "success.*true\|created successfully"; then
    echo "   ✅ PASS: Valid rule created successfully"
    RULE_ID=$(echo "$BODY" | grep -o '"ruleId":"[^"]*"' | cut -d'"' -f4)
    echo "   Rule ID: $RULE_ID"
    PASSED=$((PASSED + 1))
else
    echo "   ❌ FAIL: Expected 201 with successful creation"
    echo "   Got: HTTP $HTTP_CODE - $BODY"
    FAILED=$((FAILED + 1))
fi

# Summary
echo ""
echo "=================================================="
echo "📊 SUMMARY"
echo "=================================================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📋 Total: $((PASSED + FAILED))"

{
    echo "=== SUMMARY ==="
    echo "Passed: $PASSED"
    echo "Failed: $FAILED"
    echo "Total: $((PASSED + FAILED))"
    echo "Success Rate: $((PASSED * 100 / (PASSED + FAILED)))%"
} >> "$RESULTS_FILE"

echo ""
echo "💾 Detailed results saved to: $RESULTS_FILE"

if [ $FAILED -gt 0 ]; then
    echo ""
    echo "❌ Step 2.2 FAILED: $FAILED tests failed"
    exit 1
else
    echo ""
    echo "✅ Step 2.2 PASSED: All server validation tests pass"
fi