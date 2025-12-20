#!/usr/bin/env bash
set -euo pipefail

# Reproduce /api/products/by-mpn/:mpn with an admin ID token
# Requires env vars:
#   FIREBASE_API_KEY - Firebase Web API key (project ropi-bccee)
#   ADMIN_EMAIL      - Admin user email
#   ADMIN_PASSWORD   - Admin user password
#   MPN              - MPN to lookup (e.g., ABC-12345)
# Optional:
#   STAGING_BASE     - Defaults to https://ropi-aoss-staging.web.app
#   OUT_DIR          - Output directory for artifacts

: "${FIREBASE_API_KEY?FIREBASE_API_KEY is required}"
: "${ADMIN_EMAIL?ADMIN_EMAIL is required}"
: "${ADMIN_PASSWORD?ADMIN_PASSWORD is required}"
: "${MPN?MPN is required}"

STAGING_BASE=${STAGING_BASE:-"https://ropi-aoss-staging.web.app"}
OUT_DIR=${OUT_DIR:-"$(pwd)/docs/lisa/observations/LP-1.2.2"}
CURL_DIR="$OUT_DIR/curl"
mkdir -p "$CURL_DIR"

SIGNIN_URL="https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_API_KEY"

echo "Signing in as $ADMIN_EMAIL ..."
HTTP_CODE=$(curl -sS -w "%{http_code}" -o "$CURL_DIR/signin.json" \
  -H 'Content-Type: application/json' \
  -X POST "$SIGNIN_URL" \
  --data "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"returnSecureToken\":true}")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Sign-in failed (HTTP $HTTP_CODE). See $CURL_DIR/signin.json"
  exit 1
fi

ID_TOKEN=$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(j.idToken||'')" "$CURL_DIR/signin.json")
if [[ -z "$ID_TOKEN" ]]; then
  echo "No idToken in sign-in response; aborting."
  exit 1
fi

echo "ID token acquired (prefix): ${ID_TOKEN:0:16}..."

BY_MPN_URL="$STAGING_BASE/api/products/by-mpn/$MPN"

echo "Requesting $BY_MPN_URL ..."
BODY_FILE="$CURL_DIR/by-mpn.$MPN.body.json"
HDR_FILE="$CURL_DIR/by-mpn.$MPN.headers.txt"
HTTP_CODE=$(curl -sS -w "%{http_code}" -o "$BODY_FILE" -D "$HDR_FILE" \
  -H "Authorization: Bearer $ID_TOKEN" \
  "$BY_MPN_URL")

echo "Response HTTP $HTTP_CODE"
echo "Body saved to: $BODY_FILE"
echo "Headers saved to: $HDR_FILE"
