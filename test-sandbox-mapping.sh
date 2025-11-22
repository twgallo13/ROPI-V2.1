#!/bin/bash
set -e

echo "================================================================"
echo "Testing Sandbox Mapping with test-import.csv"
echo "================================================================"

CSV_FILE="${1:-test-import.csv}"

if [ ! -f "$CSV_FILE" ]; then
  echo "ERROR: CSV file not found: $CSV_FILE"
  exit 1
fi

echo "CSV file: $CSV_FILE"
echo "Rows: $(wc -l < "$CSV_FILE")"
echo ""

# Read CSV and send to propose-mapping endpoint
echo "Calling staging API: /api/api/attributes/propose-mapping"
echo ""

CSV_CONTENT=$(cat "$CSV_FILE" | jq -Rs .)

RESPONSE=$(curl -s -X POST \
  "https://us-central1-ropi-bccee.cloudfunctions.net/api/api/attributes/propose-mapping" \
  -H "Content-Type: application/json" \
  -d "{\"csvData\": $CSV_CONTENT}")

echo "$RESPONSE" | jq '.' > /tmp/sandbox-mapping-result.json

echo "================================================================"
echo "Mapping Result Summary"
echo "================================================================"
echo "$RESPONSE" | jq '{
  totalMappings: (.mappings | length),
  exactMatches: [.mappings[] | select(.matchType == "exact")] | length,
  synonymMatches: [.mappings[] | select(.matchType == "synonym")] | length,
  fuzzyMatches: [.mappings[] | select(.matchType == "fuzzy")] | length,
  unmapped: [.mappings[] | select(.canonicalPath == null)] | length,
  registrySize
}'

echo ""
echo "First 10 mappings:"
echo "$RESPONSE" | jq '.mappings[:10] | .[] | {csvHeader, canonicalPath, matchType, confidence}'

echo ""
echo "Full result saved to: /tmp/sandbox-mapping-result.json"
echo "================================================================"
