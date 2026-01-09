# MPN Architecture Clarification
## Date: 2026-01-09

## Critical Understanding from Lisa

**Key Points:**
1. ❌ **`product_id` field does NOT exist** - there is no field called `product_id` in product documents
2. ✅ **`product.id` IS the MPN** - the Firestore document ID is the MPN (e.g., "18-test", "17-test")
3. ✅ **Always use MPN** - engines, rules, and all matching should use MPN
4. ✅ **Product identifier = MPN** - there is no separate internal ID vs public ID

## Product Document Structure

```typescript
// Firestore document path: /products/{mpn}
// Example: /products/18-test

interface Product {
  id: string;  // ← THIS IS THE MPN (Firestore document ID)
  sku: string;
  mpn?: string;  // Optional attribute field (may or may not exist)
  // ... other fields
}
```

## What We Fixed

### Bug #1: API Not Returning productIdentifiers for Blocked Products
**File:** `packages/api/src/services/completionDrivenExportReadiness.ts`
**Issue:** `createBlockedReadiness()` didn't include productIdentifiers
**Fix:** Added optional `product` parameter with conditional spread operator
**Status:** ✅ FIXED & VERIFIED

### Bug #2: Misunderstanding of product.id
**Original Confusion:** Thought `product.id` was an internal database ID (like "123")
**Reality:** `product.id` IS the MPN - it's the Firestore document ID
**Fix:** Changed `CompletionExportGatePanel productId={product.id}` to `productId={id}` where `id` comes from URL parameter
**Why This Works:** URL parameter `/products/18-test` → `id = "18-test"` → matches Firestore document ID
**Status:** ✅ FIXED & VERIFIED

## Current State

**Working Correctly:**
- ✅ Product 18-test (active, 80% complete): MPN displayed as "18-test"
- ✅ API returns: `{productIdentifiers: {mpn: "18-test", productId: "18-test"}}`
- ✅ UI renders MPN badge with `data-testid="completion-panel-mpn"`

**Known State:**
- 🔵 Product 17-test: Made **INACTIVE** by Lisa (screenshot shows "INACTIVE" status)
- 🔵 Inactive products won't show in product list or certain contexts

## Architecture Rules

1. **Product Lookups:** Always use MPN (document ID)
   ```typescript
   // ✅ CORRECT
   const productRef = doc(db, 'products', mpn);
   
   // ❌ WRONG - there is no "product_id" field
   const productRef = doc(db, 'products', product_id);
   ```

2. **URL Routing:** Always use MPN
   ```typescript
   // ✅ CORRECT
   <Link to={`/products/${product.id}`}>  // product.id IS the MPN
   
   // Route parameter
   const { id } = useParams<{ id: string }>();  // id IS the MPN
   ```

3. **API Calls:** Always use MPN
   ```typescript
   // ✅ CORRECT
   await fetch(`/api/products/${mpn}/completion`);
   await fetch(`/api/products/${product.id}/completion`);  // Same thing
   ```

4. **Component Props:** Always pass MPN
   ```typescript
   // ✅ CORRECT (when id comes from URL parameter)
   <CompletionExportGatePanel productId={id} />
   
   // ✅ ALSO CORRECT (product.id IS the MPN)
   <CompletionExportGatePanel productId={product.id} />
   ```

## Testing Recommendations

**Valid Active Test Products:**
- `18-test`: Ready product (80% complete)
- `10-test`: Alternative ready product (if needed)

**Invalid/Inactive:**
- `17-test`: Made INACTIVE - will not show in normal flows

**Testing Pattern:**
```bash
# Always test with MPN
export TEST_PRODUCT="18-test"
node scripts/verify-mpn-inline.js

# API endpoint uses MPN
curl "https://ropi-aoss-staging.web.app/api/products/18-test/completion"

# UI navigation uses MPN
https://ropi-aoss-staging.web.app/products/18-test
```

## Key Learnings

1. **No Separate ID System:** Unlike some systems with internal IDs vs public IDs, ROPI uses MPN as the primary key
2. **Firestore Document ID = MPN:** The document path `/products/{mpn}` means the ID is the MPN
3. **product.id in TypeScript = MPN:** When you access `product.id`, you're getting the MPN
4. **No product_id Field:** There is no field called `product_id` anywhere in the schema

## Evidence

**Verification Timestamp:** 2026-01-09 09:36 UTC

**Console Logs Confirming:**
```
🖥️ [ProductEditorPage] Product ID from URL: 18-test
🖥️ [CompletionPanel] Fetching completion for product: 18-test
🖥️ [CompletionPanel] productIdentifiers field: {mpn: 18-test, productId: 18-test}
```

**Playwright Verification:**
```
📊 Found 1 MPN elements
  [1] MPN: "18-test"
✅ SUCCESS: MPN element found!
```

**Evidence Files:**
- `inventory/LP-phase2b-001/evidence/ui_mpn_18test_VERIFIED.png`
- `inventory/LP-phase2b-001/evidence/VERIFICATION_MANIFEST.json`
- `inventory/LP-phase2b-001/VERIFICATION_SUMMARY.md`

---

**Confirmed By:** Lisa (Product Owner)
**Implemented By:** Homer (GitHub Copilot Agent)
**Status:** ✅ VERIFIED & DOCUMENTED
