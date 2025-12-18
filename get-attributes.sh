#!/bin/bash
# Quick script to fetch attributes from staging API
# Usage: ./get-attributes.sh [limit]

LIMIT=${1:-10}

echo "Generating admin token..."
TOKEN=$(VITE_E2E_ADMIN_PASSWORD='RopiE2E-Admin!ec87c6a16e844897#2025' node scripts/generate-admin-token-rest.js 2>&1 | tail -1)

echo "Fetching attributes (first $LIMIT)..."
curl -s -H "Authorization: Bearer ${TOKEN}" \
  "https://ropi-aoss-staging.web.app/api/admin/settings/attributes" \
  | jq ".items[0:${LIMIT}] | map({attribute_id, label, category})"
