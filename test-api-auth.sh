#!/bin/bash
# Test API endpoint authorization
# Usage: ./test-api-auth.sh <firebase-token>

TOKEN=$1

if [ -z "$TOKEN" ]; then
  echo "Usage: $0 <firebase-id-token>"
  echo ""
  echo "To get a token:"
  echo "1. Open https://ropi-aoss-staging.web.app in browser"
  echo "2. Open DevTools console"
  echo "3. Run: firebase.auth().currentUser.getIdToken().then(t => console.log(t))"
  echo "4. Copy the token and run: $0 <token>"
  exit 1
fi

echo "Testing /api/products/14943667 with Authorization..."
echo ""

curl -v -H "Authorization: Bearer $TOKEN" \
  https://ropi-aoss-staging.web.app/api/products/14943667

echo ""
echo ""
echo "Testing /api/admin/settings/users (requires admin role)..."
echo ""

curl -v -H "Authorization: Bearer $TOKEN" \
  https://ropi-aoss-staging.web.app/api/admin/settings/users
