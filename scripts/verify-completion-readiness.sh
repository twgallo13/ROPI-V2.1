#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   PROJECT_ID=<gcp_project> SA_KEY=./service-account.json TOKEN=<bearer_token> \
#     PRODUCT_ID=<productId> ATTRIBUTE_ID=<attributeId> ./scripts/verify-completion-readiness.sh
#
# Requirements:
# - pnpm installed
# - gcloud CLI installed and authenticated with access to the project (or use SA_KEY)
# - jq installed
# - Node (for running scripts/test)
# - SERVICE ACCOUNT JSON available if verify-attributes-meta.js requires it

PROJECT_ID="${PROJECT_ID:-}"
SA_KEY="${SA_KEY:-}"
TOKEN="${TOKEN:-}"
PRODUCT_ID="${PRODUCT_ID:-example-product-id}"
ATTRIBUTE_ID="${ATTRIBUTE_ID:-example-attribute-id}"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACT_ROOT="${ROOT}/artifacts/LP-completion-readiness-001"
mkdir -p "${ARTIFACT_ROOT}/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-002/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-003/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-004/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-005/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-006/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-007/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-008/screenshots" \
         "${ROOT}/artifacts/LP-completion-readiness-009/screenshots"

echo "[INFO] Artifacts root: ${ROOT}/artifacts"

# Helper to write logs
function write_log() {
  local lp="$1"; shift
  local name="$1"; shift
  local dest="${ROOT}/artifacts/LP-completion-readiness-00${lp}/${name}"
  mkdir -p "$(dirname "$dest")"
  echo "$@" > "${dest}"
  echo "[INFO] Wrote ${dest}"
}

### LP-001: Sync registry (non-dry-run)
echo "[LP-001] Running registry sync (dryRun=false)..."
SYNC_LOG="${ROOT}/artifacts/LP-completion-readiness-001/registry-sync-${TIMESTAMP}.log"
pnpm --filter @ropi-aoss/api run sync:attributes -- --dryRun=false 2>&1 | tee "${SYNC_LOG}"
echo "[LP-001] Sync log saved to ${SYNC_LOG}"

# Run verify-attributes-meta.js (requires service account)
if [[ -n "${SA_KEY}" && -f "${SA_KEY}" ]]; then
  echo "[LP-001] Running verify-attributes-meta.js..."
  VERIFY_OUT="${ROOT}/artifacts/LP-completion-readiness-001/verify-attributes-meta-${TIMESTAMP}.txt"
  node scripts/verify-attributes-meta.js "${SA_KEY}" 2>&1 | tee "${VERIFY_OUT}"
  echo "[LP-001] verify output saved to ${VERIFY_OUT}"
else
  echo "[LP-001] SA_KEY not set or file missing. Skipping verify-attributes-meta.js. To run it, set SA_KEY env var."
  write_log 1 "verify-attributes-meta-note.txt" "Skipped: SA_KEY not provided."
fi

# Capture Firestore attributesMeta doc using gcloud (if PROJECT_ID provided)
if [[ -n "${PROJECT_ID}" ]]; then
  echo "[LP-001] Capturing Firestore settings/attributesMeta..."
  ATTR_META="${ROOT}/artifacts/LP-completion-readiness-001/attributesMeta-${TIMESTAMP}.json"
  gcloud firestore documents get "projects/${PROJECT_ID}/databases/(default)/documents/settings/attributesMeta" \
    --project="${PROJECT_ID}" --format=json > "${ATTR_META}" 2>&1 || echo "Warning: failed to fetch attributesMeta"
  echo "[LP-001] attributesMeta saved to ${ATTR_META}"
fi

### LP-002: Snapshot exportSettings
if [[ -n "${PROJECT_ID}" ]]; then
  echo "[LP-002] Snapshot settings/exportSettings..."
  EXPORT_SETTINGS="${ROOT}/artifacts/LP-completion-readiness-002/exportSettings-${TIMESTAMP}.json"
  gcloud firestore documents get "projects/${PROJECT_ID}/databases/(default)/documents/settings/exportSettings" \
    --project="${PROJECT_ID}" --format=json > "${EXPORT_SETTINGS}" 2>&1 || echo "Warning: failed to fetch exportSettings"
  echo "[LP-002] exportSettings saved to ${EXPORT_SETTINGS}"
else
  echo "[LP-002] PROJECT_ID not provided; cannot snapshot exportSettings."
fi

### LP-003: Run deterministic completion tests
# Expect a test file exists at packages/api/test/evaluateCompletion.test.ts (instructions earlier)
echo "[LP-003] Running evaluateCompletion tests..."
EVAL_LOG="${ROOT}/artifacts/LP-completion-readiness-003/eval-tests-${TIMESTAMP}.log"
pnpm --filter @ropi-aoss/api test -- tests/evaluateCompletion.test.ts 2>&1 | tee "${EVAL_LOG}" || true
echo "[LP-003] Test log saved to ${EVAL_LOG}"

### LP-004: Product completion API call
if [[ -z "${TOKEN}" ]]; then
  echo "[LP-004] WARNING: TOKEN not set. Set TOKEN env var to run API calls authenticated."
else
  echo "[LP-004] Calling product completion API for product ${PRODUCT_ID}..."
  PRODUCT_OUT="${ROOT}/artifacts/LP-completion-readiness-004/api-product-completion-${PRODUCT_ID}-${TIMESTAMP}.json"
  curl -s -H "Authorization: Bearer ${TOKEN}" \
    "https://ropi-aoss-staging.web.app/api/products/${PRODUCT_ID}/completion" \
    -o "${PRODUCT_OUT}" || echo "Warning: curl failed"
  echo "[LP-004] API response saved to ${PRODUCT_OUT}"
fi

### LP-005: Export readiness
if [[ -z "${TOKEN}" ]]; then
  echo "[LP-005] Skipping export readiness call: TOKEN not provided."
else
  echo "[LP-005] Calling export readiness endpoint..."
  READINESS_OUT="${ROOT}/artifacts/LP-completion-readiness-005/readiness-${TIMESTAMP}.json"
  HTTP_STATUS=$(curl -s -o "${READINESS_OUT}" -w "%{http_code}" -H "Authorization: Bearer ${TOKEN}" \
    "https://ropi-aoss-staging.web.app/api/admin/exports/readiness" || echo "000")
  echo "[LP-005] HTTP status: ${HTTP_STATUS}; payload in ${READINESS_OUT}"
fi

### LP-006: Attributes console write-through: snapshot attribute doc
if [[ -n "${PROJECT_ID}" && -n "${ATTRIBUTE_ID}" ]]; then
  echo "[LP-006] Snapshot attribute doc ${ATTRIBUTE_ID}..."
  ATTR_DOC="${ROOT}/artifacts/LP-completion-readiness-006/attribute-${ATTRIBUTE_ID}-${TIMESTAMP}.json"
  gcloud firestore documents get "projects/${PROJECT_ID}/databases/(default)/documents/settings/attributes/keys/${ATTRIBUTE_ID}" \
    --project="${PROJECT_ID}" --format=json > "${ATTR_DOC}" 2>&1 || echo "Warning: failed to fetch attribute doc"
  echo "[LP-006] attribute doc saved to ${ATTR_DOC}"
else
  echo "[LP-006] PROJECT_ID or ATTRIBUTE_ID not provided; skipping attribute snapshot."
fi

### LP-007: Live update timeline stub
echo "[LP-007] Create timeline note (fill after manual VVP)..."
write_log 7 "timeline-note.txt" "Run live-update VVPs and paste the timeline here."

### LP-008: HES JSON presence & minimal validation (jq checks)
echo "[LP-008] Validating HES templates have required keys..."
HES_DIR="${ROOT}/evidence/completion-readiness/hes"
REQUIRED_KEYS=(branch commitShas ciRuns deployInfo verification result homer_approved)
HES_ERRORS=0
for file in "${HES_DIR}"/LP-completion-readiness-00*.json; do
  if [[ ! -f "${file}" ]]; then
    echo "[LP-008] No HES found at ${file}"
    HES_ERRORS=$((HES_ERRORS+1))
    continue
  fi
  for key in "${REQUIRED_KEYS[@]}"; do
    if ! jq -e "has(\"${key}\")" "${file}" >/dev/null; then
      echo "[LP-008] MISSING key '${key}' in ${file}"
      HES_ERRORS=$((HES_ERRORS+1))
    fi
  done
done
if [[ "${HES_ERRORS}" -eq 0 ]]; then
  echo "[LP-008] HES templates basic validation PASSED."
else
  echo "[LP-008] HES templates basic validation FOUND ${HES_ERRORS} issues. Please inspect."
fi

### LP-009: Legacy normalization test stub
echo "[LP-009] Run normalization tests (ensure evaluateCompletion respects normalized flags)."
NORM_LOG="${ROOT}/artifacts/LP-completion-readiness-009/normalization-test-${TIMESTAMP}.log"
# Expect tests exist; try running a test name if present
pnpm --filter @ropi-aoss/api test -- tests/attribute-normalization.test.ts 2>&1 | tee "${NORM_LOG}" || echo "[LP-009] normalization test may not exist; create it."

echo "[DONE] Script completed. Check artifacts/ for outputs. Manually complete VVPs and HES entries, then set homer_approved:true with result:'VERIFIED SUCCESS' when ready."
