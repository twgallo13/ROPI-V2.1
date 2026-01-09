# Precondition: Stable Engine APIs on Staging

**Status:** ⏳ PENDING VERIFICATION

## Requirement

Verify that the deterministic Completion Evaluation Engine APIs from LP-phase2a-001 are deployed and functional on the staging environment.

## Endpoint to Verify

```
GET /api/products/{id}/completion
```

## Verification Steps

1. **Confirm Engine Deployment to Staging:**
   ```bash
   # Check if staging deployment includes LP-phase2a-001 changes
   # Look for packages/engine/bin/evaluate.js in staging codebase
   ```

2. **Test Endpoint with Sample Products:**
   ```bash
   # Test with ready product (100% completion)
   curl -X GET https://ropi-aoss-staging.web.app/api/products/test-product-0001/completion \
     -H "Authorization: Bearer $STAGING_TOKEN"

   # Test with partial product (60% completion)
   curl -X GET https://ropi-aoss-staging.web.app/api/products/test-product-0005/completion \
     -H "Authorization: Bearer $STAGING_TOKEN"

   # Test with blocked product (40% completion)
   curl -X GET https://ropi-aoss-staging.web.app/api/products/test-product-0007/completion \
     -H "Authorization: Bearer $STAGING_TOKEN"
   ```

3. **Verify Response Structure:**
   Expected response schema:
   ```json
   {
     "productId": "string",
     "completionPercent": "number",
     "status": "ready" | "partial" | "blocked",
     "blockingReasons": ["string"],
     "segments": {
       "attributes": {
         "count": "number",
         "weight": "number",
         "score": "number"
       },
       "content": {
         "count": "number",
         "weight": "number",
         "score": "number"
       }
     },
     "evaluatedAt": "ISO8601 timestamp",
     "seed": "number"
   }
   ```

4. **Verify Deterministic Behavior:**
   ```bash
   # Call endpoint multiple times with same product + seed
   # Verify outputs are byte-for-byte identical
   ```

## Expected Results

- [ ] Endpoint returns 200 OK for valid product IDs
- [ ] Response structure matches expected schema
- [ ] Completion percentages match LP-phase2a-001 test vectors
- [ ] Status values (ready/partial/blocked) are correct
- [ ] Blocking reasons are populated for partial/blocked products
- [ ] Segment breakdown is accurate
- [ ] Multiple calls with same seed return identical results

## Sample Output

```
=== API Verification Results ===

Test 1: Ready Product (test-product-0001)
  Status: 200 OK
  Completion: 100%
  Status: ready
  Blocking Reasons: []
  Deterministic: ✅ PASS (3/3 identical responses)

Test 2: Partial Product (test-product-0005)
  Status: 200 OK
  Completion: 60%
  Status: partial
  Blocking Reasons: ["Missing required attributes", "Insufficient content"]
  Deterministic: ✅ PASS (3/3 identical responses)

Test 3: Blocked Product (test-product-0007)
  Status: 200 OK
  Completion: 40%
  Status: blocked
  Blocking Reasons: ["Critical attributes missing", "No product description"]
  Deterministic: ✅ PASS (3/3 identical responses)

VERDICT: ✅ ALL TESTS PASS
```

## Evidence Location

`inventory/LP-phase2b-001/evidence/api_verification.txt`

---

**Once verified, update precondition status to SATISFIED in HES.**
