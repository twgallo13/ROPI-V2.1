# LP-1.3.6: Department Filter Fix - Completion Summary

**Branch:** `lisa/LP-1.3.6/fix-department-filter`  
**PR:** #351  
**Status:** ✅ COMPLETE  
**Date:** 2025-01-21

## Deployed

- **Staging:** https://ropi-aoss-staging.web.app

## Problem Solved

The Department filter on the Products page was showing Gender values (Mens, Womens, Kids, Unisex, Boys, Girls) instead of the configured Department values (Footwear, Clothing, Accessories, etc.).

**Root Cause:** Hardcoded `DEPARTMENT_OPTIONS` constant in ProductsPage.tsx was never connected to the live attribute configuration.

## Changes Made

### packages/web/src/pages/ProductsPage.tsx

1. **Added import** for `useAttributeRegistry` hook
2. **Replaced hardcoded constant** with dynamic fetch:
   ```tsx
   // Before:
   const DEPARTMENT_OPTIONS = ['Mens', 'Womens', 'Kids', 'Unisex', 'Boys', 'Girls'];
   
   // After:
   const { getAttributeById } = useAttributeRegistry();
   const departmentAttribute = getAttributeById('department');
   const departmentOptions = useMemo(() => {
     return departmentAttribute?.allowed_values ?? [];
   }, [departmentAttribute]);
   ```
3. **Updated dropdown** to use `departmentOptions` instead of hardcoded constant

## Artifacts

- [docs/lisa/products-audit/LP-1.3.6/diagnostics.md](../../docs/lisa/products-audit/LP-1.3.6/diagnostics.md) - Root cause analysis

## Verification

- [x] TypeScript compilation passes
- [x] Build succeeds
- [x] Deployed to staging
- [ ] Manual verification: Department filter shows registry values

## Verification Steps

1. Navigate to https://ropi-aoss-staging.web.app/products
2. Click on Department filter dropdown
3. Verify it shows values from the attribute registry (should be the values configured in Settings, not Mens/Womens/Kids)
4. Select a department value and verify filtering works

## Notes

- Pre-existing test failures in `useAttributes.test.tsx` and `useUsers.test.ts` are unrelated to this change
- Pre-existing lint errors due to missing `tsconfig.base.json` are unrelated to this change
