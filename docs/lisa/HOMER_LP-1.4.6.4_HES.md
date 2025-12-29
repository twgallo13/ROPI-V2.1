# Homer Engineering Summary — LP-1.4.6.4: Date UI Fix

**Task**: LP-importer-mapping-recon-1.4.6.4  
**Branch**: `lp/importer-mapping-recon/1.4.6.4-date-ui-fix`  
**Base**: `aoss-main`  
**Date**: 2025-01-XX  

## Context

LP-1.4.6.3 audit identified that date console errors in the Product Editor UI were caused by:
1. `<input type="date">` elements requiring `YYYY-MM-DD` format
2. UI binding vendor formats (`1/9/2026`) or ISO timestamps (`2026-01-09T00:00:00.000Z`) directly
3. Neither format being valid for HTML date inputs
4. Misleading "Product saved to localStorage!" alert when Firestore writes DO occur

## Changes Made

### 1. Date Utilities (`packages/web/src/utils/dateUtils.ts`)

Created new utility module with deterministic date parsing and formatting:

```typescript
export function parseToIsoDateString(input: string | undefined | null): string | undefined
export function formatForDateInput(input: string | undefined | null): string | undefined
export function isIsoDateString(input: string | undefined | null): boolean
export function isVendorDateFormat(input: string | undefined | null): boolean
export function formatForDisplay(input: string | undefined | null, locale?: string): string
```

**Parsing Rules:**
- ISO formats: `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss...`
- US vendor formats: `MM/DD/YYYY`, `M/D/YYYY`, `MM-DD-YYYY`
- Two-digit year heuristic: 00-69 → 2000s, 70-99 → 1900s (matches SDK normalizer)

**Test Coverage:** 51 unit tests in `packages/web/src/utils/__tests__/dateUtils.test.ts`

### 2. LaunchMediaTab Date Binding (`packages/web/src/components/product/LaunchMediaTab.tsx`)

**Before:**
```typescript
const launchDateValue = product.launch_date ?? product.launchDate ?? '';
// Binds vendor format "1/9/2026" directly → console error
```

**After:**
```typescript
const launchDateRaw = (product.attributes?.launch_date as string) ?? 
                      product.launch_date ?? 
                      product.launchDate ?? '';
const launchDateValue = formatForDateInput(launchDateRaw) ?? '';
// Outputs "2026-01-09" → valid for <input type="date">
```

**Changes:**
- Import `formatForDateInput` from `../../utils/dateUtils`
- Prefer `attributes.*` (normalized ISO) over top-level (vendor format)
- Apply `formatForDateInput()` to all three date fields:
  - `launch_date`
  - `kl_post_date`  
  - `hide_image_date`
- Added debug logging: `console.debug('LP-1.4.6.4 bind date', { key, raw, inputValue })`

### 3. ProductAttributesTab Date Binding (`packages/web/src/components/product/ProductAttributesTab.tsx`)

**Before:**
```typescript
case 'date':
  return (
    <input
      type="date"
      value={stringValue}
      // ...
    />
  );
```

**After:**
```typescript
case 'date':
  const formattedDateValue = formatForDateInput(stringValue) ?? '';
  console.debug('LP-1.4.6.4 bind date', { key: attr.attribute_id, raw: stringValue, inputValue: formattedDateValue });
  return (
    <input
      type="date"
      value={formattedDateValue}
      // ...
    />
  );
```

### 4. ProductEditorPage Save Feedback (`packages/web/src/pages/ProductEditorPage.tsx`)

**Before:**
```typescript
const handleSave = () => {
  if (product) {
    saveProduct(product);
    alert('Product saved to localStorage!');  // Misleading!
  }
};
```

**After:**
```typescript
const handleSave = async () => {
  if (product) {
    const success = await saveProduct(product);
    const target = isFirebaseAvailable() ? 'Firestore' : 'localStorage';
    if (success) {
      console.log(`[ProductEditorPage] Product ${product.id} saved to ${target}`);
      alert(`Product saved to ${target}`);
    } else {
      console.error(`[ProductEditorPage] Failed to save product ${product.id} to ${target}`);
      alert(`Failed to save product to ${target}. Check console for details.`);
    }
  }
};
```

## ProductsPage Analysis

The LP-1.4.6.3 audit identified ProductsPage date filters (lines 588-597), but these do NOT need modification because:
1. `dateFrom` and `dateTo` are UI state initialized to empty strings
2. They're set directly from `<input type="date">` onChange events
3. The date input outputs `YYYY-MM-DD` format natively
4. No product date data is being displayed in these filters

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `packages/web/src/utils/dateUtils.ts` | New | Date parsing and formatting utilities |
| `packages/web/src/utils/__tests__/dateUtils.test.ts` | New | 51 unit tests |
| `packages/web/src/components/product/LaunchMediaTab.tsx` | Modified | Import dateUtils, apply formatForDateInput |
| `packages/web/src/components/product/ProductAttributesTab.tsx` | Modified | Import dateUtils, apply formatForDateInput |
| `packages/web/src/pages/ProductEditorPage.tsx` | Modified | Accurate save feedback message |

## Testing

### Unit Tests
```bash
cd packages/web
npm test -- src/utils/__tests__/dateUtils.test.ts --run
# 51 tests passed
```

### Manual Verification
1. Open Product Editor for product `211737-90h1-8`
2. Check console for `LP-1.4.6.4 bind date` debug logs
3. Verify date inputs show `YYYY-MM-DD` format
4. Verify no console errors for date binding
5. Save product and verify correct feedback message

## Merge Order Clarification

The useProduct hook's merge logic (`mergeCoreFieldsToTopLevel`) was NOT modified because:
1. The merge order (top-level takes precedence) serves other fields correctly
2. The fix is applied at the UI component level
3. Components now explicitly prefer `attributes.*` for date fields before applying formatting

This approach:
- Minimizes risk by not changing core merge logic
- Keeps the fix localized to date-specific code paths
- Adds debug logging for observability

## Acceptance Criteria

- [x] No console errors when binding date fields in Product Editor
- [x] Date inputs display `YYYY-MM-DD` format (valid for HTML date input)
- [x] Save button shows accurate persistence target (Firestore vs localStorage)
- [x] 51 unit tests pass for dateUtils
- [x] TypeScript compiles without errors

## Rollback Plan

If issues arise, revert the three component changes and remove dateUtils:
```bash
git revert HEAD~3  # Or cherry-pick specific commits
```

The dateUtils module is isolated and has no side effects on import.

## References

- [LP-1.4.6.3 Audit Report](../../HOMER_LP-1.4.6.3_UI_DATA_CONSISTENCY_AUDIT.md)
- [LP-1.4.6.2 Single-Product Wrapper PR #379](https://github.com/twgallo13/ROPI-V2.1/pull/379)
- [LP-1.4.6 Migration PR #378](https://github.com/twgallo13/ROPI-V2.1/pull/378)
