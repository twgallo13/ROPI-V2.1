# LP-ATTR-1.3.1 Root Cause Analysis & Fix

**Date:** 2025-12-24  
**Issue:** "Product title is required" error on CSV preview despite correct mapping  
**Status:** ✅ **FIXED** - PR #343

---

## Problem Statement

User reported that CSV import preview showed "ERROR: [title] Product title is required" even though:
- Mapping step correctly showed Product Name → `name` 
- Registry has `import_required: false` for `name` attribute
- LP-ATTR-1.3.1 SDK mapping was updated to use `name` (not `title`)

---

## Diagnostic Process

### Step 1: Verify Client-Side Mapping ✅

**Check:** SDK's `importNormalizer.ts` DEFAULT_COLUMN_MAPPINGS

```typescript
// packages/sdk/src/normalization/importNormalizer.ts
{ sourceColumn: 'Product Name', targetField: 'name', required: false }
```

**Result:** ✅ Client correctly configured to map Product Name → `name`

### Step 2: Verify UI Select Values ✅

**Check:** Web UI `ImportMappingStep.tsx` select option values

```tsx
// packages/web/src/components/import/ImportMappingStep.tsx
const AVAILABLE_FIELDS = DEFAULT_COLUMN_MAPPINGS.map((m: any) => ({
  value: m.targetField,  // Uses 'name', not 'title'
  label: m.targetField,
  required: m.required || false,
}));
```

**Result:** ✅ UI correctly sends `'name'` as the select value

### Step 3: Verify Registry Definition ✅

**Check:** Attribute Registry for `name` attribute

```json
{
  "attribute_id": "name",
  "label": "Product Name",
  "import_required": false  // ← OPTIONAL
}
```

**Result:** ✅ Registry correctly has `import_required: false`

### Step 4: Check Server-Side Validator 🔍

**Check:** API `attributeValidator.ts` SKIP_COLUMNS

```typescript
// packages/api/src/services/attributeValidator.ts
const SKIP_COLUMNS = new Set([
  'mpn', 'MPN', 'sku', 'SKU', 'title', 'name', 'Product Name',
  // ...
]);
```

**Finding:** `name` is in SKIP_COLUMNS, so server-side validator doesn't check it. This is intentional - core fields are validated separately.

### Step 5: Search for Error Message ❌ ROOT CAUSE FOUND

**Search:** `grep -r "Product title is required"`

**Result:**
```
packages/sdk/src/validators/importValidator.ts:130:
        'Product title is required'
```

**Root Cause Identified:** SDK's `importValidator.ts` still has:

```typescript
function validateTitle(title: string | undefined): ValidationIssue[] {
  if (!title) {
    return { code: 'MISSING_REQUIRED_FIELD', message: 'Product title is required' };
  }
  // ...
}

// Called in validateImportRow():
const titleIssues = validateTitle(normalized.title);  // ← undefined!
```

---

## Root Cause Analysis

### The Problem

1. **LP-ATTR-1.3.1 SDK mapping** correctly maps Product Name → `name`
2. **SDK builds normalized row** with `{ mpn: '...', name: '...', ... }` 
3. **But SDK validator still calls** `validateTitle(normalized.title)`
4. **`normalized.title` is undefined** (because we're using `name` now)
5. **Validator reports** "Product title is required" ❌

### Why This Happened

LP-ATTR-1.3.1 updated:
- ✅ SDK mapping (`importNormalizer.ts`) - Product Name → `name`
- ✅ Server validator (`attributeValidator.ts`) - Registry-driven
- ❌ **SDK validator (`importValidator.ts`) - Still checked `title`**

The SDK validator was overlooked in the LP-ATTR-1.3.1 implementation.

---

## The Fix (PR #343)

### Changes Made

#### 1. Renamed `validateTitle()` → `validateName()`

**Before:**
```typescript
function validateTitle(title: string | undefined): ValidationIssue[] {
  if (!title) {
    return { code: 'MISSING_REQUIRED_FIELD', message: 'Product title is required' };
  }
  // ... length checks
}
```

**After:**
```typescript
function validateName(name: string | undefined, title: string | undefined): ValidationIssue[] {
  // LP-ATTR-1.3.1: name is optional per registry (import_required: false)
  const productName = name || title;  // Check both for backward compat
  if (!productName) {
    return [];  // Optional - no error if missing
  }
  // ... length checks if present
}
```

**Key changes:**
- Accepts both `name` and `title` for backward compatibility
- Made **optional** (no error if missing)
- Still validates length if present (warning < 5 chars, error > 200 chars)

#### 2. Updated `validateBrand()` to be Optional

**Before:**
```typescript
function validateBrand(brand: string | undefined): ValidationIssue[] {
  if (!brand) {
    return { code: 'MISSING_REQUIRED_FIELD', message: 'Brand is required' };
  }
}
```

**After:**
```typescript
function validateBrand(brand: string | undefined): ValidationIssue[] {
  // LP-ATTR-1.3.1: brand is optional per registry (import_required: false)
  if (!brand) {
    return [];  // Optional - no error if missing
  }
  // ... length check if present (max 100 chars)
}
```

#### 3. Updated Validator Call

**Before:**
```typescript
const titleIssues = validateTitle(normalized.title);
```

**After:**
```typescript
const nameIssues = validateName(normalized.name, normalized.title);
```

---

## Verification

### Unit Tests (10 new tests)

```bash
✓ packages/sdk/test/importValidator.lp-attr-1.3.1.test.ts (10 tests) 10ms
```

**Test Coverage:**
1. ✅ MPN-only rows (no name, no brand) → VALID
2. ✅ MPN + name (no brand) → VALID
3. ✅ MPN + brand (no name) → VALID
4. ✅ Name length validation (< 5 chars warning, > 200 chars error)
5. ✅ Brand length validation (> 100 chars error)
6. ✅ Legacy `title` field support (backward compatibility)
7. ✅ Prefer `name` over `title` when both present
8. ✅ No MISSING_REQUIRED_FIELD errors for name/brand
9. ✅ MPN validation still works (MPN is only required field)
10. ✅ All fields optional except MPN

### Build Verification

```bash
✅ SDK build successful
✅ API build successful
✅ Web build successful
```

---

## Impact Analysis

### Before Fix (PR #342 only)

```
CSV Upload: MPN=TEST-123, Product Name=Test Product
     ↓
Client maps: { mpn: 'TEST-123', name: 'Test Product' }
     ↓
SDK validator checks: validateTitle(undefined)
     ↓
❌ ERROR: "Product title is required"
     ↓
Preview shows: RED X "ERROR: [title] Product title is required"
```

### After Fix (PR #343)

```
CSV Upload: MPN=TEST-123, Product Name=Test Product
     ↓
Client maps: { mpn: 'TEST-123', name: 'Test Product' }
     ↓
SDK validator checks: validateName('Test Product', undefined)
     ↓
✅ VALID: name is optional, validation passes
     ↓
Preview shows: GREEN ✓ Row valid
```

---

## Registry Alignment Achieved

| Layer | Component | `name` Required? | `brand` Required? | Status |
|-------|-----------|------------------|-------------------|--------|
| **Registry** | attributeRegistry.json | ❌ No (`import_required: false`) | ❌ No | ✅ |
| **Server** | attributeValidator.ts | ❌ No (registry-driven) | ❌ No | ✅ (#340) |
| **SDK Mapping** | importNormalizer.ts | ❌ No (`required: false`) | ❌ No | ✅ (#342) |
| **SDK Validator** | importValidator.ts | ❌ No (optional) | ❌ No | ✅ (#343) |
| **UI** | ImportMappingStep.tsx | ❌ No (uses SDK mappings) | ❌ No | ✅ (#342) |

**Result:** All layers now agree - `name` and `brand` are optional, MPN is the only required field.

---

## LP-ATTR-1.3.1 Completion

### Three-Part Implementation

1. **PR #340 (LP-ATTR-1.3.0)** - Server-side registry validation
   - ✅ Server respects `import_required` flags from registry
   - ✅ 12 unit tests + 5 integration tests

2. **PR #342 (LP-ATTR-1.3.1)** - SDK mapping sync + CORS fixes
   - ✅ SDK maps Product Name → `name` (not `title`)
   - ✅ SDK sets `required: false` for name and brand
   - ✅ CORS headers on all response paths (error responses fixed)

3. **PR #343 (LP-ATTR-1.3.1 Fix)** - SDK validator alignment
   - ✅ SDK validator treats `name` and `brand` as optional
   - ✅ Backward compatible with legacy `title` field
   - ✅ 10 new unit tests

---

## Lessons Learned

### What Went Right ✅

1. **Systematic diagnostics** - Step-by-step verification identified exact root cause
2. **User provided clear evidence** - Screenshots showed the exact error message
3. **Comprehensive fix** - Updated validator + added tests + backward compatibility
4. **Fast turnaround** - Root cause identified and fixed within hours

### What Could Be Better 🔄

1. **Initial implementation missed SDK validator** - LP-ATTR-1.3.1 updated SDK mapping but not SDK validator
2. **E2E test gap** - No automated test for MPN-only CSV import through full pipeline
3. **Component coupling** - Three separate layers (registry, server, SDK) need to stay in sync

### Future Improvements 📋

1. **Add E2E test:** Upload MPN-only CSV → verify preview shows green
2. **Centralize validation logic:** Single source of truth for field requirements
3. **Validation schema:** Consider schema-driven validation (e.g., Zod/Yup) that reads from registry
4. **Deployment checklist:** Ensure all layers (registry, server, SDK, UI) are updated together

---

## Deployment Plan

1. **Merge PR #343** → Triggers CI/CD
2. **CI builds and deploys** all packages (SDK, API, Web)
3. **Verify with sample CSV:**
   - Upload `sample_without_name_brand.csv`
   - Check mapping: Product Name → `name`
   - Click preview
   - **Expected:** GREEN ✓ for MPN-only rows
4. **Monitor logs** for any validation issues

---

## Sign-Off

**Root Cause:** SDK validator still checked `validateTitle(normalized.title)` which was undefined  
**Fix:** Updated SDK validator to check `name` (and `title` for backward compat), made both optional  
**Testing:** 10 unit tests, all passing  
**Impact:** MPN-only CSV imports now work correctly  
**Status:** ✅ **READY FOR MERGE AND DEPLOYMENT**

**PR:** #343  
**Branch:** `lp/ATTR-1.3.1-fix-validator-name-brand-optional`  
**Commit:** `65c5cd1`
