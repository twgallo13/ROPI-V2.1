#!/bin/bash
# CI Smoke Test for Registry Version Endpoint
# Tests that GET /api/registry/registry-version returns HTTP 200 with registry_version field

set -e

FUNCTION_URL="https://us-central1-ropi-bccee.cloudfunctions.net/api"
ENDPOINT="/registry/registry-version"
FULL_URL="${FUNCTION_URL}${ENDPOINT}"

echo "🧪 Running CI smoke test for ${ENDPOINT}"
echo "Testing: ${FULL_URL}"

# Make the request and capture response
RESPONSE=$(curl -s -w "HTTPSTATUS:%{http_code}" "${FULL_URL}")
HTTP_STATUS=$(echo $RESPONSE | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
BODY=$(echo $RESPONSE | sed -e 's/HTTPSTATUS:.*//g')

echo "HTTP Status: ${HTTP_STATUS}"
echo "Response Body: ${BODY}"

# Check HTTP status is 200
if [ "${HTTP_STATUS}" != "200" ]; then
    echo "❌ FAIL: Expected HTTP 200, got ${HTTP_STATUS}"
    exit 1
fi

# Check response contains registry_version field
if echo "${BODY}" | jq -e '.registry_version' > /dev/null 2>&1; then
    REGISTRY_VERSION=$(echo "${BODY}" | jq -r '.registry_version')
    echo "✅ PASS: registry_version found: ${REGISTRY_VERSION}"
    
    # Verify it's a valid SHA (40 character hex string)
    if [[ "${REGISTRY_VERSION}" =~ ^[a-f0-9]{40}$ ]]; then
        echo "✅ PASS: registry_version is valid SHA format"
        echo "🎉 CI smoke test PASSED"
        exit 0
    else
        echo "❌ FAIL: registry_version not in SHA format: ${REGISTRY_VERSION}"
        exit 1
    fi
else
    echo "❌ FAIL: registry_version field not found in response"
    echo "Response: ${BODY}"
    exit 1
fi