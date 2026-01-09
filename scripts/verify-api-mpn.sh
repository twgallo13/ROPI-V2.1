#!/bin/bash
# LP-phase2b-001: API MPN Existence Verification
# 
# Binding Rule: API responses must include productIdentifiers.mpn for all product-level completion calls.
# 
# This script verifies:
# 1. GET /api/products/:id/completion includes productIdentifiers.mpn
# 2. MPN field is not null or empty
# 3. productId field exists (internal only, for admin debug)
#
# Lisa's requirement: Add jq checks to verify MPN exists in API responses
# Exit code 0 = PASS, non-zero = FAIL

set -e

# Configuration
STAGING_HOST="${STAGING_HOST:-staging.api.shiekh.example.com}"
STAGING_API_TOKEN="${STAGING_API_TOKEN:-}"
EVIDENCE_DIR="inventory/LP-phase2b-001/evidence"
LOG_FILE="${EVIDENCE_DIR}/api_mpn_verification.log"

# Test products as specified by Lisa
TEST_PRODUCTS=("product-0001" "product-0004" "product-0007")

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================" | tee -a "${LOG_FILE}"
echo "LP-phase2b-001: API MPN Verification" | tee -a "${LOG_FILE}"
echo "========================================" | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

if [ -z "${STAGING_API_TOKEN}" ]; then
  echo -e "${RED}ERROR: STAGING_API_TOKEN not set${NC}" | tee -a "${LOG_FILE}"
  echo "Set environment variable before running:" | tee -a "${LOG_FILE}"
  echo "  export STAGING_API_TOKEN=\"your-token-here\"" | tee -a "${LOG_FILE}"
  exit 1
fi

# Ensure evidence directory exists
mkdir -p "${EVIDENCE_DIR}"

# Test each product
PASS_COUNT=0
FAIL_COUNT=0

for product_id in "${TEST_PRODUCTS[@]}"; do
  echo "----------------------------------------" | tee -a "${LOG_FILE}"
  echo "Testing product: ${product_id}" | tee -a "${LOG_FILE}"
  echo "----------------------------------------" | tee -a "${LOG_FILE}"
  
  # Fetch completion data
  RESPONSE_FILE="${EVIDENCE_DIR}/api_product_${product_id}.json"
  HTTP_CODE=$(curl -sS -w "%{http_code}" -o "${RESPONSE_FILE}" \
    "https://${STAGING_HOST}/api/products/${product_id}/completion" \
    -H "Authorization: Bearer ${STAGING_API_TOKEN}" \
    -H "Accept: application/json")
  
  echo "HTTP Status: ${HTTP_CODE}" | tee -a "${LOG_FILE}"
  
  if [ "${HTTP_CODE}" -ne 200 ]; then
    echo -e "${RED}✗ FAIL: HTTP ${HTTP_CODE} (expected 200)${NC}" | tee -a "${LOG_FILE}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Check 1: productIdentifiers.mpn exists
  echo -n "Check 1: productIdentifiers.mpn exists... " | tee -a "${LOG_FILE}"
  if jq -e '.productIdentifiers.mpn' "${RESPONSE_FILE}" > /dev/null 2>&1; then
    MPN_VALUE=$(jq -r '.productIdentifiers.mpn' "${RESPONSE_FILE}")
    echo -e "${GREEN}✓ PASS${NC} (value: ${MPN_VALUE})" | tee -a "${LOG_FILE}"
  else
    echo -e "${RED}✗ FAIL (field missing)${NC}" | tee -a "${LOG_FILE}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Check 2: MPN is not null or empty
  echo -n "Check 2: MPN is not null/empty... " | tee -a "${LOG_FILE}"
  if [ -n "${MPN_VALUE}" ] && [ "${MPN_VALUE}" != "null" ]; then
    echo -e "${GREEN}✓ PASS${NC}" | tee -a "${LOG_FILE}"
  else
    echo -e "${RED}✗ FAIL (MPN is ${MPN_VALUE})${NC}" | tee -a "${LOG_FILE}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Check 3: productId exists (internal field)
  echo -n "Check 3: productIdentifiers.productId exists... " | tee -a "${LOG_FILE}"
  if jq -e '.productIdentifiers.productId' "${RESPONSE_FILE}" > /dev/null 2>&1; then
    PRODUCT_ID_VALUE=$(jq -r '.productIdentifiers.productId' "${RESPONSE_FILE}")
    echo -e "${GREEN}✓ PASS${NC} (value: ${PRODUCT_ID_VALUE})" | tee -a "${LOG_FILE}"
  else
    echo -e "${RED}✗ FAIL (field missing)${NC}" | tee -a "${LOG_FILE}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    continue
  fi
  
  # Check 4: Verify productId matches expected
  echo -n "Check 4: productId matches ${product_id}... " | tee -a "${LOG_FILE}"
  if [ "${PRODUCT_ID_VALUE}" == "${product_id}" ]; then
    echo -e "${GREEN}✓ PASS${NC}" | tee -a "${LOG_FILE}"
  else
    echo -e "${YELLOW}⚠ WARNING (got: ${PRODUCT_ID_VALUE}, expected: ${product_id})${NC}" | tee -a "${LOG_FILE}"
  fi
  
  # Extract deterministic factors for HES
  echo "Extracting deterministic factors..." | tee -a "${LOG_FILE}"
  jq '{
    product_id: .productIdentifiers.productId,
    mpn: .productIdentifiers.mpn,
    completion: .completionPct,
    ready: .ready,
    threshold: .threshold,
    hasBlockingSites: .hasBlockingSites,
    blockingReasonsCount: (.blockingReasons | length)
  }' "${RESPONSE_FILE}" > "${EVIDENCE_DIR}/api_product_${product_id}_summary.json"
  
  echo -e "${GREEN}✓ Product ${product_id}: ALL CHECKS PASSED${NC}" | tee -a "${LOG_FILE}"
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "" | tee -a "${LOG_FILE}"
done

# Summary
echo "========================================" | tee -a "${LOG_FILE}"
echo "Summary" | tee -a "${LOG_FILE}"
echo "========================================" | tee -a "${LOG_FILE}"
echo "Passed: ${PASS_COUNT}/${#TEST_PRODUCTS[@]}" | tee -a "${LOG_FILE}"
echo "Failed: ${FAIL_COUNT}/${#TEST_PRODUCTS[@]}" | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

if [ "${FAIL_COUNT}" -eq 0 ]; then
  echo -e "${GREEN}✓ ALL MPN VERIFICATION CHECKS PASSED${NC}" | tee -a "${LOG_FILE}"
  exit 0
else
  echo -e "${RED}✗ MPN VERIFICATION FAILED (${FAIL_COUNT} products)${NC}" | tee -a "${LOG_FILE}"
  exit 1
fi
