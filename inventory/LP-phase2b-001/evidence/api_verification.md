# API Verification Results - Engine APIs on Staging

**Verification Date:** PENDING  
**Performed By:** Homer  
**Status:** ⏳ AWAITING STAGING ACCESS

---

## Products Tested

Using canonical test products from LP-phase2a-001:

1. **product-0001** (Ready) - Expected: 100% completion, status "ready"
2. **product-0004** (Partial) - Expected: ~65% completion, status "partial"  
3. **product-0007** (Blocked) - Expected: 40% completion, status "blocked"

---

## Verification Commands

### Prerequisites
```bash
# Set staging host (DO NOT COMMIT)
export STAGING_HOST="ropi-aoss-staging.web.app"  # or actual staging domain

# Set staging API token (from CI secrets / vault - DO NOT COMMIT)
export STAGING_API_TOKEN="<obtain from secrets manager>"
```

### API Calls
```bash
# Ready product (product-0001)
curl -sS "https://$STAGING_HOST/api/products/product-0001/completion" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/api_product_product-0001.json

# Partial product (product-0004)
curl -sS "https://$STAGING_HOST/api/products/product-0004/completion" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/api_product_product-0004.json

# Blocked product (product-0007)
curl -sS "https://$STAGING_HOST/api/products/product-0007/completion" \
  -H "Authorization: Bearer $STAGING_API_TOKEN" \
  -H "Accept: application/json" \
  -o inventory/LP-phase2b-001/evidence/api_product_product-0007.json
```

### Validation Checks
```bash
# Verify completion_result structure for each product
for product in product-0001 product-0004 product-0007; do
  echo "=== Validating $product ==="
  jq '{
    product_id: .product_id,
    completion_result: {
      completionPct: .completion_result.completionPct,
      status: .completion_result.status,
      blockingReasons: .completion_result.blockingReasons
    },
    deterministic_factors: {
      commit_sha: .deterministic_factors.commit_sha,
      random_seed: .deterministic_factors.random_seed,
      rules_version: .deterministic_factors.rules_version
    }
  }' inventory/LP-phase2b-001/evidence/api_product_${product}.json
done
```

---

## Expected Response Structure

All responses must contain:

```json
{
  "product_id": "string",
  "completion_result": {
    "completionPct": "number (0-100)",
    "status": "ready|partial|blocked",
    "blockingReasons": ["array of strings"],
    "segments": {
      "attributes": { "count": "number", "score": "number" },
      "content": { "count": "number", "score": "number" }
    }
  },
  "deterministic_factors": {
    "commit_sha": "string (git commit)",
    "random_seed": "number",
    "rules_version": "string"
  },
  "evaluated_at": "ISO8601 timestamp"
}
```

---

## Validation Results

### product-0001 (Ready)
- [ ] Response received (HTTP 200)
- [ ] `completion_result.completionPct` present and >= 80
- [ ] `completion_result.status` = "ready"
- [ ] `completion_result.blockingReasons` = [] (empty)
- [ ] `deterministic_factors.commit_sha` present
- [ ] `deterministic_factors.random_seed` present
- [ ] `deterministic_factors.rules_version` present

**File:** `api_product_product-0001.json` ⏳ PENDING

### product-0004 (Partial)
- [ ] Response received (HTTP 200)
- [ ] `completion_result.completionPct` present and 40-80
- [ ] `completion_result.status` = "partial"
- [ ] `completion_result.blockingReasons` present (non-empty)
- [ ] `deterministic_factors.commit_sha` present
- [ ] `deterministic_factors.random_seed` present
- [ ] `deterministic_factors.rules_version` present

**File:** `api_product_product-0004.json` ⏳ PENDING

### product-0007 (Blocked)
- [ ] Response received (HTTP 200)
- [ ] `completion_result.completionPct` present and < 40
- [ ] `completion_result.status` = "blocked"
- [ ] `completion_result.blockingReasons` present (detailed)
- [ ] `deterministic_factors.commit_sha` present
- [ ] `deterministic_factors.random_seed` present
- [ ] `deterministic_factors.rules_version` present

**File:** `api_product_product-0007.json` ⏳ PENDING

---

## Next Steps

**REQUIRED BEFORE MARKING SATISFIED:**

1. ✅ Obtain staging API credentials from secrets manager
2. ✅ Execute all three curl commands
3. ✅ Save JSON responses to evidence files
4. ✅ Run validation checks to confirm all required fields present
5. ✅ Update HES with commands_executed entries
6. ✅ Mark precondition as SATISFIED in HES

**Current Status:** ⏳ AWAITING STAGING ACCESS

---

**Once completed, update HES:**
```json
{
  "name": "Stable Engine APIs available on staging",
  "status": "SATISFIED",
  "evidence_path": "inventory/LP-phase2b-001/evidence/api_verification.md",
  "evidence_details": "API responses verified for product-0001 (ready), product-0004 (partial), product-0007 (blocked). All required fields present. Verified: YYYY-MM-DDTHH:MM:SSZ"
}
```
