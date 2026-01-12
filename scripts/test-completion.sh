#!/bin/bash
# scripts/test-completion.sh  
# Test completion API endpoint with various MPN formats

if [ -z "$1" ]; then
  echo "Usage: $0 <MPN> [API_BASE_URL]"
  echo "Example: $0 '106 TEST' 'https://ropi-aoss-staging.web.app'"
  exit 1
fi

MPN="$1"
API_BASE="${2:-https://ropi-aoss-staging.web.app}"

# Normalize MPN for URL (basic normalization for testing)
ENCODED_MPN=$(echo "$MPN" | sed 's/ /%20/g')

echo "🧪 Testing Product Completion API"
echo "================================="
echo "Original MPN: '$MPN'"
echo "URL Encoded: '$ENCODED_MPN'"
echo "API Base: $API_BASE"
echo "Endpoint: /api/products/$ENCODED_MPN/completion"
echo ""

# Test the API endpoint
echo "📡 Making API request..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/products/$ENCODED_MPN/completion")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "HTTP Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ SUCCESS: API returned 200 OK"
  echo ""
  echo "Response Body:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  echo ""
  
  # Check for required fields
  echo "🔍 Validating response structure..."
  
  HAS_READY=$(echo "$BODY" | jq -r '.ready // "missing"')
  HAS_COMPLETION_PCT=$(echo "$BODY" | jq -r '.completionPct // "missing"')
  HAS_PRODUCT_IDENTIFIERS=$(echo "$BODY" | jq -r '.productIdentifiers.mpn // "missing"')
  
  echo "  ready: $HAS_READY"
  echo "  completionPct: $HAS_COMPLETION_PCT"
  echo "  productIdentifiers.mpn: $HAS_PRODUCT_IDENTIFIERS"
  
  if [ "$HAS_READY" != "missing" ] && [ "$HAS_COMPLETION_PCT" != "missing" ] && [ "$HAS_PRODUCT_IDENTIFIERS" != "missing" ]; then
    echo ""
    echo "✅ All required fields present in response"
  else
    echo ""
    echo "⚠️  Some required fields missing from response"
  fi
  
elif [ "$HTTP_CODE" = "404" ]; then
  echo "❌ FAILED: Product not found (404)"
  echo ""
  echo "This could indicate:"
  echo "  1. Product does not exist"
  echo "  2. MPN normalization mismatch"
  echo "  3. Product mappings not created"
  echo ""
  echo "Response Body:"
  echo "$BODY"
  
else
  echo "❌ FAILED: Unexpected HTTP status $HTTP_CODE"
  echo ""
  echo "Response Body:"
  echo "$BODY"
fi

echo ""
echo "Raw curl command:"
echo "curl -v '$API_BASE/api/products/$ENCODED_MPN/completion'"