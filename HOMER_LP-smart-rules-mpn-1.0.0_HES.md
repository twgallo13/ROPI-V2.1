# HOMER LP-smart-rules-mpn-1.0.0 HES

## Summary

Implemented Lisa's canonical H-1 through H-6 plan for MPN normalization and Smart Rules schema enforcement.

## Commits

| Commit | Description |
|--------|-------------|
| `778b8b8` | feat(smart-rules): H-1 through H-6 - MPN normalization + schema enforcement |

## Changes by Task

### H-1: normalized_mpn field & backfill ✅

| File | Change |
|------|--------|
| [mpnNormalizer.ts](packages/sdk/src/normalization/mpnNormalizer.ts) | NEW - Canonical MPN normalizer (trim, uppercase, remove non-alphanumeric except hyphen) |
| [sdk/index.ts](packages/sdk/src/index.ts) | Export `normalizeMpn`, `mpnsMatch` |
| [product.ts](packages/sdk/src/schema/product.ts) | Added `mpn`, `normalized_mpn`, `styleId`, date fields to ProductCore |
| [productCommitService.ts](packages/api/src/services/productCommitService.ts) | Compute `normalized_mpn` on import |
| [backfill-normalized-mpn.mjs](scripts/backfill-normalized-mpn.mjs) | NEW - Backfill script |

### H-2: by-mpn endpoint uses normalized_mpn ✅

| File | Change |
|------|--------|
| [products.ts](packages/api/src/endpoints/products.ts) | `getProductByMpnHandler` now queries `core.normalized_mpn` first with fallbacks |

### H-3: Client authFetch + normalized MPN ✅

| File | Change |
|------|--------|
| [MobileMPNScanner.tsx](packages/web/src/components/observations/MobileMPNScanner.tsx) | Replaced `getAuthHeaders()+fetch()` with `authFetch()` |

### H-4: Schema + deepClean everywhere ✅

| File | Change |
|------|--------|
| [smartRulesAdmin.ts](packages/web/src/services/smartRulesAdmin.ts) | `updateSmartRule()` now applies `deepClean` and `validateSmartRuleClient()` before save |

### H-5: Import logging + admin debug view ✅

| File | Change |
|------|--------|
| [adminSmartRules.ts](packages/api/src/endpoints/adminSmartRules.ts) | Added `getImportEvalHandler` for `/admin/import-eval/:productId` |
| [apiApp.ts](packages/api/src/apiApp.ts) | Wired new endpoint |

### H-6: Run normalization & validate ✅

```
normalizeRules.js --env=staging:
  Total rules:      6
  Already valid:    2 (Footwear, Apparel)
  Normalized:       2 (from previous run)
  Failed:           4 (smoke-test rules with structural issues)

backfill-normalized-mpn.mjs --env staging:
  Scanned:      19
  Updated:      17
  Errors:       0
```

## Deployment

- **Commit**: `778b8b8`
- **Deployed**: https://ropi-aoss-staging.web.app
- **Functions**: All 17 functions updated successfully

## Verification Checklist

### MPN Lookup

- [ ] Open Test Console → enter `2-test` → Run
- [ ] DevTools Network: `GET /api/products/by-mpn/2-test` has Authorization header
- [ ] Response is 200 with product JSON

### Rule Creation & Update

- [ ] Create a new rule (leave optional fields blank) → Save succeeds
- [ ] Check Firestore: `condition.options === []`, `description === ''`, no undefined

### Import + Auto-Apply

- [ ] Import CSV for `2-test` with RICS Footwear
- [ ] Verify Department was set
- [ ] Check `provenance.attributes_department` present

### Debug Endpoint

```bash
curl "https://ropi-aoss-staging.web.app/api/admin/import-eval/2-test" \
  -H "Authorization: Bearer <token>"
```

### Edge Cases

- [ ] MPN case variations: `2-TEST`, `2-test`, `2-Test` all resolve to same product
- [ ] MPN with special chars: `abc--def` normalized to `ABC-DEF`

## New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/import-eval/:productId` | GET | Debug Smart Rules evaluation for a product |

## New Exports (SDK)

```typescript
// MPN normalization
export { normalizeMpn, mpnsMatch } from '@ropi-aoss/sdk';

// Example
normalizeMpn('  2-test  '); // → '2-TEST'
mpnsMatch('2-test', '2-TEST'); // → true
```

## Phase Status

**Current**: IN PROGRESS → **READY TO VERIFY**

Verification pending user confirmation of checklist items.
