# Smart Rules Attribute Path Bug - RESOLVED

## Problem

**Symptom**: Smart Rules showed successful application (8 rules auto-applied), metadata was written (`_appliedRules`, `provenance`, `_activityLog`), but actual attribute values were NOT persisting in the `attributes` object.

**Example**: 
- Product 18-test had `_appliedRules.age_group` with rule ID
- Product had `provenance.age_group` with full tracking
- Product had `_activityLog` showing `value: "Kids"`
- **BUT** `attributes.age_group` was NOT SET!

## Root Cause

**Path Mismatch in Smart Rules Engine**

1. **UI Layer** (`RuleBuilder.tsx`): Creates rules with flat field names
   - `targetField: "age_group"` ✅ (Correct for UI)
   - Uses attribute registry IDs directly

2. **Engine Layer** (`smartEngineV2.ts`): Was setting values at wrong path
   - Used `deepSet(updates, "age_group", "Kids")` ❌
   - This created: `updates.age_group = "Kids"`
   - **SHOULD have created**: `updates.attributes.age_group = "Kids"`

3. **Merge Layer** (`productCommitService.ts`): Expects nested structure
   - Reads from: `smartRulesResult.updates.attributes` ✅
   - But engine was putting data in: `smartRulesResult.updates.age_group` ❌
   - **MISMATCH!** Merge never saw the values

## The Fix

**File**: `packages/api/src/lib/smartEngineV2.ts` (Line ~1292)

**Before**:
```typescript
// Set value in updates
deepSet(updates, rule.action.targetField, value);
```

**After**:
```typescript
// Set value in updates (prepend "attributes." since rules use flat field names)
const updatePath = rule.action.targetField.startsWith('attributes.') 
  ? rule.action.targetField 
  : `attributes.${rule.action.targetField}`;
deepSet(updates, updatePath, value);
```

This ensures values are set at `updates.attributes.age_group` instead of `updates.age_group`, matching what the merge logic expects.

## Investigation Timeline

### Initial Discovery (Previous Session)
1. User reported: "Attributes not persisting"
2. Checked Firestore: Found metadata present but values missing
3. Checked code: Merge logic appeared correct
4. **Found**: Rules in products didn't exist in Firestore (cache issue)
5. **Fixed**: Forced cache refresh in import flow

### This Session - Second Bug
1. User created new rule: `Kids Age group` (rule_1767479194034_712nhw)
2. Ran new import (batch: ca7add68-ab36-4083-a528-54b5bac88190)
3. **Reported**: Still not working despite cache fix!
4. Investigation found:
   - ✅ Smart Rules ran (all products have timestamps)
   - ✅ New rule applied (in `_appliedRules`)
   - ✅ Values computed (in `_activityLog`: `value: "Kids"`)
   - ❌ Attributes still empty!
5. **Root cause**: Path mismatch between engine output and merge input
6. **Fixed**: Engine now prepends "attributes." to field paths

## Verification

**Deploy Status**: ✅ All 17 functions updated successfully

**Next Steps for User**:
1. Run a NEW import with your test CSV
2. Check products - should now have:
   - ✅ `attributes.age_group = "Kids"`
   - ✅ `attributes.department = "Clothing"` (or other applicable values)
   - ✅ `_appliedRules` metadata
   - ✅ `provenance` tracking

## Technical Details

### Why This Happened

The system had an architectural assumption mismatch:

- **UI/UX Layer**: Attribute names without namespace (cleaner for users)
  - Example: "age_group", "department"
  
- **Storage Layer**: Nested structure for organization
  - Example: `product.attributes.age_group`
  
- **Engine Layer**: Was using UI names directly ❌
  - Should have translated to storage paths ✅

### The Flow (Before Fix)

```
UI: targetField="age_group"
  ↓
Engine: deepSet(updates, "age_group", "Kids")
  ↓
Result: updates = { age_group: "Kids", provenance: {...}, _appliedRules: {...} }
  ↓
Merge: if (updates.attributes) { product.attributes = {...updates.attributes} }
  ↓
Result: Nothing merged! (updates.attributes was undefined)
```

### The Flow (After Fix)

```
UI: targetField="age_group"
  ↓
Engine: updatePath = "attributes.age_group"
Engine: deepSet(updates, "attributes.age_group", "Kids")
  ↓
Result: updates = { attributes: { age_group: "Kids" }, provenance: {...}, _appliedRules: {...} }
  ↓
Merge: if (updates.attributes) { product.attributes = {...updates.attributes} }
  ↓
Result: product.attributes.age_group = "Kids" ✅
```

## Related Issues

This fix also resolves:
- Manual Smart Rules application (getProductSuggestions)
- Any other use of the Smart Rules engine
- Future rules that target any attribute field

## Files Modified

1. **packages/api/src/lib/smartEngineV2.ts**
   - Added path normalization for attribute updates
   - Ensures compatibility between UI field names and storage structure

2. **packages/api/src/functions/smartRulesImport.ts** (Previous fix)
   - Force cache refresh to avoid stale rules

## Testing Checklist

- [ ] Create new Smart Rule with attribute target (e.g., `age_group`)
- [ ] Run import with CSV that matches rule conditions
- [ ] Verify products have actual attribute values (not just metadata)
- [ ] Check `_appliedRules` has rule IDs
- [ ] Check `provenance` has tracking data
- [ ] Check `_activityLog` shows application history
- [ ] Verify all above are present AND attribute value is set

## Lessons Learned

1. **Layer boundaries matter**: UI conventions vs. storage structure
2. **Test data flow end-to-end**: Metadata being written doesn't mean data is written
3. **Path consistency**: When using `deepSet`/`deepGet`, ensure all layers agree on paths
4. **Cache + Logic bugs**: Two separate issues can have similar symptoms
