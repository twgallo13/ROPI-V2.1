# Smart Rules Cache Fix

## Problem

**Symptom**: Smart Rules showed "8 rules auto-applied" in the UI, but the actual product attributes were not persisting. Products had `_appliedRules` and `provenance` metadata, but the actual attribute values (e.g., `age_group`, `department`) were missing from the `attributes` object.

**Root Cause**: The `loadActiveRules()` function uses a 5-minute cache (TTL: 5 minutes). When Smart Rules are deleted or disabled in Firestore, the import process continues to use the cached rules for up to 5 minutes. This results in:

1. The Smart Rules engine "applying" phantom rules that don't exist in Firestore
2. Metadata (`_appliedRules`, `provenance`) being written to products
3. But the actual attribute values not persisting (likely because the cached rule configuration is incomplete or invalid)

**Evidence**:
- Query for enabled rules in `smart_rules` collection: **0 results**
- Product `_appliedRules` contained rule IDs: `rule_1767353025831_ap2zq7`, `rule_1767350520854_xpfska`, `rule_1767344587339_38yo9y`
- Direct Firestore query for these rule IDs: **All three NOT FOUND**
- Products had `_appliedRules.age_group` and `_appliedRules.department` with rule metadata
- Products had `provenance.age_group` and `provenance.department` with full tracking
- But products **did NOT have** `attributes.age_group` or `attributes.department` values

## Investigation Path

1. ✅ User reported attributes not persisting despite "success" UI
2. ✅ Checked Firestore products → Found metadata but missing attribute values
3. ✅ Checked code logic → Smart Rules merge logic appears correct
4. ✅ Queried smart_rules collection → Found 0 enabled rules
5. ✅ Queried specific rule IDs from products → **None exist in Firestore**
6. ✅ Examined `loadActiveRules()` → Discovered 5-minute cache with no forced refresh in import flow

## Solution

Force cache refresh at the start of each import batch to ensure we're always using the latest rules from Firestore.

### Changes Made

**File**: `packages/api/src/functions/smartRulesImport.ts`

**Line 131** - `processSmartRulesForBatch()`:
```typescript
// Before
const [rules, dictionary] = await Promise.all([
  loadActiveRules(),
  loadDictionary(),
]);

// After
const [rules, dictionary] = await Promise.all([
  loadActiveRules(true),  // Force refresh to avoid stale cache
  loadDictionary(),
]);
```

**Line 260** - `processImportWithSmartRules()`:
```typescript
// Before
const [rules, dictionary] = await Promise.all([
  loadActiveRules(),
  loadDictionary(),
]);

// After
const [rules, dictionary] = await Promise.all([
  loadActiveRules(true),  // Force refresh to ensure latest rules
  loadDictionary(),
]);
```

## Impact

- **Before Fix**: Import could process with rules deleted up to 5 minutes ago, creating incomplete product data
- **After Fix**: Import always uses current active rules from Firestore, ensuring data consistency

## Verification Steps

1. Deploy the fix to staging: ✅ **COMPLETED** (All 17 functions updated)
2. Create new test Smart Rules in Firestore
3. Run a new import with test CSV
4. Verify:
   - Products have both metadata (_appliedRules, provenance) **AND** actual attribute values
   - Rule IDs in _appliedRules exist in Firestore smart_rules collection
   - Attributes populated match the rule actions

## Alternative Considered

Instead of forcing refresh on every import, we could:
- Invalidate cache when rules are created/updated/deleted
- Reduce cache TTL to 1 minute
- Add cache health checks

**Decision**: Force refresh is the safest approach for imports since:
- Imports are not frequent enough to cause performance issues
- Data consistency is critical for imports
- Cache is still used for product-level Smart Rules operations (getProductSuggestions, etc.)

## Related Files

- `packages/api/src/functions/smartRulesCallables.ts` - Cache implementation (5-minute TTL)
- `packages/api/src/functions/smartRulesImport.ts` - Import batch processor (now with forced refresh)
- `packages/api/src/services/productCommitService.ts` - Smart Rules merge logic
- `packages/api/src/lib/smartEngineV2.ts` - Smart Rules engine

## Timeline

- **Initial Issue**: Import blocking counter bug (wrong counts)
- **First Fix**: Fixed blocking logic, added Smart Rules UI
- **User Report**: Attributes not persisting despite success indicators
- **Deep Investigation**: Discovered phantom rules from cache
- **Root Cause**: 5-minute cache serving deleted rules
- **Final Fix**: Force cache refresh in import flow
- **Deploy**: All functions updated successfully

## Next Steps

1. Test with new import containing fresh Smart Rules
2. Monitor for any performance impact from forced refresh
3. Consider adding cache health monitoring
4. Document cache behavior for future developers
