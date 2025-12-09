#!/bin/bash

# ROPI AOSS Staging Endpoint Verification
# 
# Usage:
#   1. Sign in to https://ropi-aoss-staging.web.app as theo@shiekhshoes.org
#   2. Open browser DevTools → Console
#   3. Run this in the console:
#      await firebase.auth().currentUser.getIdToken(true).then(t => {
#        console.log('TOKEN=' + t);
#        copy(t);
#      })
#   4. Paste the token into TOKEN env var below
#   5. Run: bash scripts/verify-staging-endpoints.sh
#
# This will test all three endpoints and save logs with timestamps

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="./staging-verification-logs"
LOG_FILE="${LOG_DIR}/verify_${TIMESTAMP}.txt"

mkdir -p "$LOG_DIR"

{
  echo "=== ROPI AOSS Staging Endpoint Verification ==="
  echo "Timestamp: $(date -Iseconds)"
  echo "Branch: $(git branch --show-current)"
  echo "Commit: $(git rev-parse --short HEAD)"
  echo ""
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: TOKEN env var not set${NC}"
    echo "Usage: TOKEN='<id_token>' bash scripts/verify-staging-endpoints.sh"
    exit 1
  fi
  
  echo "Token (redacted): ${TOKEN:0:20}...${TOKEN: -20}"
  echo ""
  
  BASE_URL="https://ropi-aoss-staging.web.app"
  
  # Test 1: Health check (no auth)
  echo "========== TEST 1: Health Check =========="
  echo "GET /api/healthz"
  echo ""
  curl -i -s "$BASE_URL/api/healthz" | tee -a "$LOG_FILE"
  echo ""
  echo ""
  
  # Test 2: User profile
  echo "========== TEST 2: User Profile =========="
  echo "GET /api/users/me (with auth)"
  echo ""
  curl -i -s -H "Authorization: Bearer ${TOKEN}" \
    "$BASE_URL/api/users/me" | tee -a "$LOG_FILE"
  echo ""
  echo ""
  
  # Test 3: Admin users list
  echo "========== TEST 3: Admin Users List =========="
  echo "GET /api/admin/settings/users (with auth)"
  echo ""
  curl -i -s -H "Authorization: Bearer ${TOKEN}" \
    "$BASE_URL/api/admin/settings/users" | tee -a "$LOG_FILE"
  echo ""
  echo ""
  
  # Test 4: Admin roles list
  echo "========== TEST 4: Admin Roles List =========="
  echo "GET /api/admin/settings/roles (with auth)"
  echo ""
  curl -i -s -H "Authorization: Bearer ${TOKEN}" \
    "$BASE_URL/api/admin/settings/roles" | tee -a "$LOG_FILE"
  echo ""
  echo ""
  
  echo "✅ Verification complete. Logs saved to: $LOG_FILE"
  
} 2>&1 | tee "$LOG_FILE"
