# Staging Access Request — LP-phase2b-001

**Requested By:** Homer (AI Agent)  
**Date:** 2026-01-09  
**Status:** ⏳ PENDING PLATFORM/DEVOPS RESPONSE

---

## Request Summary

LP-phase2b-001 requires machine-readable API evidence from staging environment to satisfy precondition #2. This request is for **temporary, read-only staging access** to collect three product completion responses.

---

## What We Need

**From:** Platform/DevOps Team or Release Engineer

1. **STAGING_HOST** (base URL)
   - Example: `staging.api.shiekh.example.com`
   - Will be used as: `https://$STAGING_HOST/api/products/{id}/completion`

2. **STAGING_API_TOKEN** (read-only, temporary)
   - Valid for 24-48 hours
   - Permissions: Read access to `/api/products/*/completion` endpoint only
   - Delivery method: CI secrets, vault, or secure one-time link
   - **DO NOT COMMIT TO REPOSITORY**

3. **Product Confirmation**
   - Confirm these product IDs exist on staging:
     - `product-0001` (expected: ready status, ~100% completion)
     - `product-0004` (expected: partial status, ~65% completion)
     - `product-0007` (expected: blocked status, ~40% completion)

---

## Commands We Will Run

Once credentials are provided, Homer will execute:

```bash
# Set environment variables (DO NOT COMMIT)
export STAGING_HOST="<provided-by-platform>"
export STAGING_API_TOKEN="<provided-by-platform>"

# Ready product
curl -sS "https://$STAGING_HOST/api/products/product-0001/completion" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/api_product_product-0001.json

# Partial product
curl -sS "https://$STAGING_HOST/api/products/product-0004/completion" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/api_product_product-0004.json

# Blocked product
curl -sS "https://$STAGING_HOST/api/products/product-0007/completion" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/api_product_product-0007.json

# Validation checks
for product in product-0001 product-0004 product-0007; do
  echo "=== Validating $product ==="
  jq '.completion_result | {completionPct, status, blockingReasons}' \
    inventory/LP-phase2b-001/evidence/api_product_${product}.json
  jq '.deterministic_factors' \
    inventory/LP-phase2b-001/evidence/api_product_${product}.json
done
```

---

## Expected Response Structure

Each JSON must contain:

```json
{
  "product_id": "string",
  "completion_result": {
    "completionPct": "number (0-100)",
    "status": "ready|partial|blocked",
    "blockingReasons": ["array"],
    "segments": {
      "attributes": {"count": "number", "score": "number"},
      "content": {"count": "number", "score": "number"}
    }
  },
  "deterministic_factors": {
    "commit_sha": "string",
    "random_seed": "number",
    "rules_version": "string"
  },
  "evaluated_at": "ISO8601 timestamp"
}
```

---

## Security Notes

- Token will be used **only in local environment** or CI secrets
- Token will **never be committed** to repository
- Token can be revoked after evidence collection (24-48 hour window)
- Only three API calls will be made
- Responses will be saved to `inventory/LP-phase2b-001/evidence/` (no secrets in files)

---

## What Happens After Collection

1. Homer validates all three responses contain required fields
2. Homer updates HES with `commands_executed` entries (timestamp, command, exit_code)
3. Homer marks `preconditions[1].status = "SATISFIED"` in HES
4. Evidence files committed to feature branch
5. Lisa reviews evidence and approves precondition

---

## Response Requested

**Platform/DevOps:** Please reply with either:

**Option A (Immediate):**
```bash
export STAGING_HOST="<actual-staging-host>"
export STAGING_API_TOKEN="<temporary-read-token>"
# Products product-0001, product-0004, product-0007 confirmed on staging
```

**Option B (Alternative):**
"Staging access provisioning in progress. ETA: <date/time>. Contact: <engineer-name>"

**Option C (Blocker):**
"Staging environment not available. Proposed alternative: <describe workaround>"

---

**Status:** ⏳ AWAITING RESPONSE
**Contact:** twgallo13 (repository owner)
**Related:** PR #470, Issue #469, LP-phase2b-001
