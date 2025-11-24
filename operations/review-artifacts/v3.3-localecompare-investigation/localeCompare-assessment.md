# localeCompare Usage Assessment

Total usages found: 6

## File-by-File Analysis

| # | File | Line | Status | Assessment | Used in ACC Load? |
|---|------|------|--------|------------|-------------------|
| 1 | `src/utils/attributeRegistry.ts` | 79, 82 | ✅ SAFE | Guarded with `(a.category \|\| '').toString()` and `(a.label \|\| '').toString()` | YES - CRITICAL |
| 2 | `src/pages/settings/AttributeKeyPage.tsx` | 45 | ⚠️ UNGUARDED | Direct call: `a.canonicalPath.localeCompare(b.canonicalPath)` | YES - CRITICAL |
| 3 | `scripts/parseAttributesFromCode.ts` | 297 | ⚠️ UNGUARDED | Direct call: `a.canonicalPath.localeCompare(b.canonicalPath)` | NO - Build script only |
| 4 | `scripts/update-importer-aliases.ts` | 262 | ⚠️ UNGUARDED | Direct call: `a.canonicalPath.localeCompare(b.canonicalPath)` | NO - Build script only |

## Risk Analysis

### HIGH RISK - Likely Cause of Staging Error

**`src/pages/settings/AttributeKeyPage.tsx` line 45** - ⚠️ **LIKELY CAUSE**
- Used during ACC load when fetching attributes from Firestore
- No defensive guard on `canonicalPath` field
- If any attribute doc has undefined/null `canonicalPath`, will throw TypeError
- **Priority: CRITICAL FIX REQUIRED**

### LOW RISK - Build Scripts Only

**`scripts/parseAttributesFromCode.ts` line 297** - ℹ️ Build-time only
- Runs during development/build process, not in production runtime
- Still should be guarded for robustness
- **Priority: NICE TO HAVE**

**`scripts/update-importer-aliases.ts` line 262** - ℹ️ Build-time only
- Runs during development/build process, not in production runtime
- Still should be guarded for robustness
- **Priority: NICE TO HAVE**

## Root Cause Hypothesis

The staging error is most likely coming from **`AttributeKeyPage.tsx`** (the attribute registry management page), NOT from `AttributesCommandCenter.tsx` which was already patched.

The error occurs when:
1. User navigates to `/settings/attributes` (AttributeKeyPage)
2. Component fetches all attribute docs from Firestore
3. Attempts to sort by `canonicalPath`
4. If ANY attribute doc has `canonicalPath: undefined`, the sort fails with TypeError

## Recommended Fix

Apply defensive guard to `AttributeKeyPage.tsx` line 45:

```typescript
// Before
loaded.sort((a, b) => a.canonicalPath.localeCompare(b.canonicalPath));

// After
loaded.sort((a, b) => {
  const aPath = String(a.canonicalPath || '');
  const bPath = String(b.canonicalPath || '');
  return aPath.localeCompare(bPath);
});
```

## Additional Findings

- `attributeRegistry.ts` was already patched (PR #119) with proper guards ✅
- The ACC uses `attributeRegistry.ts` which is SAFE
- The error is likely from **AttributeKeyPage** (separate page for admin attribute management)
- Scripts should also be guarded for consistency, but are not runtime-critical
