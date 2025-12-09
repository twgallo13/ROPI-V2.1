#!/bin/bash

# ROPI AOSS Staging Endpoint Verification — Token Helper
# 
# This script helps run the verification tests.
# It requires an admin ID token to be provided.
#
# Usage:
#   Option 1: Run with password (auto-generates token)
#   VITE_E2E_ADMIN_PASSWORD="<password>" bash scripts/run-verification-with-token.sh
#
#   Option 2: Run with existing token
#   TOKEN="<id_token>" bash scripts/run-verification-with-token.sh
#
# Where to get the password:
#   - Check GitHub Secrets: https://github.com/twgallo13/ROPI-V2.1/settings/secrets
#   - Or sign in manually to staging app and copy token from DevTools Console

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_DIR="./staging-verification-logs"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}=== ROPI AOSS Staging Verification ===${NC}"
echo "Timestamp: $(date -Iseconds)"
echo ""

# Check if we have a token or need to generate one
if [ -z "$TOKEN" ]; then
  if [ -z "$VITE_E2E_ADMIN_PASSWORD" ]; then
    echo -e "${RED}ERROR: Neither TOKEN nor VITE_E2E_ADMIN_PASSWORD provided${NC}"
    echo ""
    echo "Usage:"
    echo "  Option 1: Provide password (auto-generates token)"
    echo "    VITE_E2E_ADMIN_PASSWORD='<password>' bash scripts/run-verification-with-token.sh"
    echo ""
    echo "  Option 2: Provide token directly"
    echo "    TOKEN='<id_token>' bash scripts/run-verification-with-token.sh"
    echo ""
    echo "Where to get credentials:"
    echo "  Password: GitHub Secrets → E2E_ADMIN_PASSWORD"
    echo "  Token: Sign in to app, DevTools Console, run:"
    echo "    await firebase.auth().currentUser.getIdToken(true)"
    echo ""
    exit 1
  fi
  
  echo -e "${YELLOW}Generating token from password...${NC}"
  TOKEN=$(node scripts/generate-admin-token-rest.js | tail -1)
  
  if [ -z "$TOKEN" ]; then
    echo -e "${RED}Failed to generate token${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Token generated${NC}"
  echo ""
fi

echo -e "${BLUE}Running verification tests...${NC}"
echo ""

# Run the verification script with the token
TOKEN="$TOKEN" bash scripts/verify-staging-endpoints.sh

echo ""
echo -e "${GREEN}✅ Verification complete${NC}"
