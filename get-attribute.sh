#!/bin/bash
# Quick script to fetch a specific attribute from staging API
# Usage: ./get-attribute.sh <attribute_id>

ATTRIBUTE_ID=$1

if [ -z "$ATTRIBUTE_ID" ]; then
  echo "Usage: $0 <attribute_id>"
  echo ""
  echo "Examples:"
  echo "  $0 age_group"
  echo "  $0 gender"
  echo "  $0 sku_core.department"
  exit 1
fi

echo "Generating admin token..."
TOKEN=$(VITE_E2E_ADMIN_PASSWORD='RopiE2E-Admin!ec87c6a16e844897#2025' node scripts/generate-admin-token-rest.js 2>&1 | tail -1)

echo "Fetching attribute: $ATTRIBUTE_ID"
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/attributes/${ATTRIBUTE_ID}" \
  | jq '.'
