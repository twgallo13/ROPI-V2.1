# Smart Rules Fixes - Current State Summary

## Completed ✅

### 1. Engine Support for Multiple Condition Formats
- Updated `SmartRule` interface to support both `condition` (single) and `conditions` (array)
- Added `evaluateRuleConditions()` helper function that:
  - Checks `conditions` array first (preferred backend format with `source`)
  - Falls back to `condition` for legacy rules (with optional `field` normalization)
  - Implements AND logic for multiple conditions
- Added `normalizeCondition()` helper to convert UI format (`field`) to backend format (`source`)

### 2. Attribute ID Usage
- Ensured engine uses exact attribute IDs from registry (`rics_category` not `attributes.rics_category`)
- Engine has fallback logic to check `attributes.*` for Products automatically
- Rules use clean attribute IDs aligned to the registry

### 3. 4 Shipping Dimension Rules Created
- **Footwear Mens - Set Weight 5oz** (JiYQZ6PxwjKBHsWiF1gI)
- **Footwear Mens - Set Height 6** (6xM28ocd281iw2D6KK4P)  
- **Footwear Mens - Set Length 14** (H53rfxHqZ8h7j4abYctd)
- **Footwear Mens - Set Width 12** (YyhUxSJOCzOOW8ZuAW0z)

All configured with:
- Condition: AND logic - `rics_category contains "Footwear"` AND `rics_category contains "Mens"`
- Action: Set dimension attributes (weight, height, length, width)
- AutoApply: true with 0.95 confidence
- Priority: 900

### 4. Rule Structure Fixed
- Added `ruleId` field to all shipping rules (was missing)
- Set conditions in AND format: `{matchType: "and", value: [{...}, {...}]}`
- Verified against product 20-test which perfectly matches conditions

## Current Issue ❌

All 9 Smart Rules (including the 5 old working ones) showing "9 errors" in evaluation logs.

**Symptoms:**
- 0 suggestions returned even for old rules that were previously working
- Conditions show "0 errors" in validation, so it's not a structural issue
- Product 20-test matches conditions perfectly but no suggestions/applications happen
- Logs show "Smart Rules for 20-test: 0 suggestions, 0 auto-applies, 0 conflicts, 9 errors"

**Root Cause Unknown:**
- Rules load correctly (9 found)
- Conditions structure appears valid
- Engine code should evaluate them
- But something causes all evaluations to fail

## Files Modified

- `/workspaces/ROPI-V2.1/packages/api/src/lib/smartEngineV2.ts` - Engine updates
- `/workspaces/ROPI-V2.1/packages/api/src/lib/allowedTargetFields.ts` - Added shipping dims to whitelist
- Various Firestore rules updated via scripts

## Test Scripts Created

- `comprehensive_test.js` - Overall verification
- `inspect_rule_structure.js` - Check rule data structure  
- `check_formats.js` - Verify UI vs backend formats
- `debug_rules.js` - Debug condition matching
- `add_rule_ids.js` - Add missing ruleId fields
- `simplify_rules.js` - Convert to simple AND format
- `test_suggestions.js` - Test suggestions generation
- `clear_skip_verify.js` - Clear skip timestamps

## Next Steps

1. **Deep dive into engine error logging** - Add specific error messages to understand which step fails
2. **Check if normalizeCondition is working** - Verify `field` → `source` conversion
3. **Validate AND condition handling** - Ensure nested AND conditions are evaluated correctly
4. **Review rule loading logic** - Confirm rules load with all required fields

## Test Product

**Product ID:** 20-test
**RICS Category:** "Footwear||Mens||Tops||T-short sleeve"
**Condition Match:** ✅ Both "Footwear" and "Mens" present in category
