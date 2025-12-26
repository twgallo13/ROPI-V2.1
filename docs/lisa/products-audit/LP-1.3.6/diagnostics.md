# LP-1.3.6: Department Filter Showing Gender Values - Diagnostics

**Branch:** `lisa/LP-1.3.6/fix-department-filter`  
**Status:** Investigation Complete  
**Date:** 2025-01-21

## Problem Statement

The Department filter on the Products page displays Gender values (Mens, Womens, Kids, Unisex, Boys, Girls) instead of the correct Department values (Footwear, Clothing, Accessories, etc.).

User reports:
> "When I look at Department filter in Products List, I'm seeing the old Gender values (Men, Women, Kids) instead of the Department values (Footwear, Clothing, Accessories). I changed this attribute in Settings to Footwear etc. and my products updated correctly, but the filter UI still shows the wrong values."

## Root Cause Analysis

### Investigation Steps

1. **Located filter UI code** in `packages/web/src/pages/ProductsPage.tsx`
2. **Found hardcoded constant** at line 31:
   ```tsx
   const DEPARTMENT_OPTIONS = ['Mens', 'Womens', 'Kids', 'Unisex', 'Boys', 'Girls'];
   ```
3. **Verified filter rendering** at lines 543-560 uses this constant:
   ```tsx
   {DEPARTMENT_OPTIONS.map((dept) => (
     <option key={dept} value={dept}>
       {dept}
     </option>
   ))}
   ```
4. **Checked attribute registry** - Existing hook `useAttributeRegistry` provides `getAttributeById()` which can fetch the live attribute configuration

### Root Cause

The Department filter dropdown uses a **hardcoded constant** that was never connected to the live attribute configuration in Firestore. When the attribute's `allowed_values` are updated in Settings, the filter UI doesn't reflect those changes because it reads from a static array, not from the attribute registry.

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT BEHAVIOR                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User updates attribute in Settings                         │
│            ↓                                                │
│  Firestore: settings/attributes/keys/department             │
│  → allowed_values: ["Footwear", "Clothing", "Accessories"]  │
│            ↓                                                │
│  Products update correctly (read from Firestore)            │
│            ↓                                                │
│  BUT: ProductsPage.tsx still reads from:                    │
│  → const DEPARTMENT_OPTIONS = ['Mens', 'Womens', ...]       │
│  → Filter shows WRONG values                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Existing Infrastructure

The codebase already has the necessary hooks to fix this:

1. **`useAttributeRegistry`** hook (`packages/web/src/hooks/useAttributeRegistry.ts`)
   - Provides `getAttributeById(id)` function
   - Returns attribute with `allowed_values` array
   - Already used in Settings pages

2. **API endpoint** (`GET /api/admin/settings/attributes/:id`)
   - Returns full attribute document including `allowed_values`
   - Already tested and working

## Solution

Replace the hardcoded `DEPARTMENT_OPTIONS` constant with a dynamic fetch from the attribute registry using the existing `useAttributeRegistry` hook.

### Implementation Steps

1. Import `useAttributeRegistry` hook
2. Get `department` attribute via `getAttributeById('department')`
3. Extract `allowed_values` as the dropdown options
4. Handle loading/empty states gracefully

### Code Changes Required

**File:** `packages/web/src/pages/ProductsPage.tsx`

```diff
- // Department enum values from attributeRegistry.json
- const DEPARTMENT_OPTIONS = ['Mens', 'Womens', 'Kids', 'Unisex', 'Boys', 'Girls'];

+ // Use dynamic attribute values from registry
+ import { useAttributeRegistry } from '@/hooks/useAttributeRegistry';

+ // Inside component:
+ const { getAttributeById } = useAttributeRegistry();
+ const departmentAttribute = getAttributeById('department');
+ const departmentOptions = departmentAttribute?.allowed_values ?? [];
```

### Benefits

1. **Single source of truth** - Filter options come from the same attribute registry used elsewhere
2. **Live updates** - Changes in Settings immediately reflect in the filter
3. **No hardcoded values** - Eliminates maintenance burden of keeping constants in sync

## Verification Checklist

- [ ] Department filter shows values from attribute registry (Footwear, Clothing, Accessories, etc.)
- [ ] Filter works correctly when selecting each option
- [ ] Empty state handled if attribute has no allowed_values
- [ ] Existing tests pass
- [ ] Manual staging verification
