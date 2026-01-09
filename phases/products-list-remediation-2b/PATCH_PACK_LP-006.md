# PATCH PACK: LP-products-list-remediation-006
**Products List Remediation - Staging Fix**  
**Branch:** `lp-products-list-remediation-001`  
**Executor:** Homer  
**Authorized by:** Lisa (Phase Owner) - 2026-01-09

---

## EXECUTIVE SUMMARY

**Current State:**
- Products List has pagination UI but breaks beyond 25 items
- Table shows 8 columns (SKU + 7 others) instead of required 7 (MPN + 6 others)
- No delete functionality (single or bulk)
- Search works but may need MPN focus
- No real-time refresh after imports/edits

**Fixes Required:**
1. **Pagination:** Make rows-per-page selector (25/50/100) work correctly
2. **Columns:** Change SKU → MPN, remove 8th column, show exact 7: MPN, Brand, Name, Department, Status, Updated, Import Date
3. **Delete:** Add single + bulk delete with confirmation
4. **Search:** Verify/fix MPN search (Name already works)
5. **Refresh:** Add automatic refresh after imports/edits

---

## EXECUTION PROTOCOL

**Choose ONE path:**
- **PATH 1:** Execute end-to-end (apply patches → test → deploy → VVP → PR)
- **PATH 2:** Produce exact diffs only (if PATH 1 is blocked)

**No third state:**
- If you cannot take PATH 1, you must take PATH 2 in the same response.
- Missing tokens/CI/scripts is not a blocker for PATH 2. PATH 2 requires only reading the repo and producing exact diffs.

**Output format required:**
- PATH 1: Deployment confirmation + VVP evidence + PR link
- PATH 2: Complete diff patches with line numbers (already provided in this document)

---

## PATCH 1: Fix Column Headers (MPN instead of SKU)

**File:** `packages/web/src/components/products/ProductsTable.tsx`

**Issue:** Table shows "SKU" as first column, but MPN is the business identifier per spec.

```diff
--- a/packages/web/src/components/products/ProductsTable.tsx
+++ b/packages/web/src/components/products/ProductsTable.tsx
@@ -113,14 +113,14 @@
               />
             </th>
-            <th className="products-table__th products-table__th--sku">
+            <th className="products-table__th products-table__th--mpn">
               <button
                 type="button"
                 className="products-table__sort-btn"
-                onClick={() => onSort('sku')}
-                aria-label="Sort by SKU"
+                onClick={() => onSort('mpn')}
+                aria-label="Sort by MPN"
               >
-                SKU
-                <SortIndicator field="sku" currentField={sortBy} direction={sortDir} />
+                MPN
+                <SortIndicator field="mpn" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
             <th className="products-table__th products-table__th--name">
@@ -197,10 +197,10 @@
                   aria-label={`Select ${product.name || product.sku || product.id}`}
                 />
               </td>
-              <td className="products-table__td products-table__td--sku">
+              <td className="products-table__td products-table__td--mpn">
                 <Link to={`/products/${product.id}`} className="products-table__link">
-                  {product.sku || product.id}
+                  {product.mpn || product.sku || '—'}
                 </Link>
               </td>
               <td className="products-table__td products-table__td--name">
```

**Verification:** Column 1 now says "MPN" and displays product.mpn value.

---

## PATCH 2: Remove 8th Column (Keep Only 7)

**File:** `packages/web/src/components/products/ProductsTable.tsx`

**Issue:** Table has 8 columns (Checkbox, SKU, Name, Brand, Department, Status, Import Date, Updated). Should be 7 data columns: MPN, Brand, Name, Department, Status, Updated, Import Date.

**Column Order Fix:**
- Current: Checkbox | SKU | Name | Brand | Department | Status | Import Date | Updated
- Required: Checkbox | MPN | Brand | Name | Department | Status | Updated | Import Date

```diff
--- a/packages/web/src/components/products/ProductsTable.tsx
+++ b/packages/web/src/components/products/ProductsTable.tsx
@@ -125,14 +125,14 @@
                 <SortIndicator field="mpn" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
-            <th className="products-table__th products-table__th--name">
+            <th className="products-table__th products-table__th--brand">
               <button
                 type="button"
                 className="products-table__sort-btn"
-                onClick={() => onSort('name')}
-                aria-label="Sort by Name"
+                onClick={() => onSort('brand')}
+                aria-label="Sort by Brand"
               >
-                Name
-                <SortIndicator field="name" currentField={sortBy} direction={sortDir} />
+                Brand
+                <SortIndicator field="brand" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
-            <th className="products-table__th products-table__th--brand">
+            <th className="products-table__th products-table__th--name">
               <button
                 type="button"
                 className="products-table__sort-btn"
-                onClick={() => onSort('brand')}
-                aria-label="Sort by Brand"
+                onClick={() => onSort('name')}
+                aria-label="Sort by Name"
               >
-                Brand
-                <SortIndicator field="brand" currentField={sortBy} direction={sortDir} />
+                Name
+                <SortIndicator field="name" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
             <th className="products-table__th products-table__th--department">
               Department
             </th>
             <th className="products-table__th products-table__th--status">
               <button
                 type="button"
                 className="products-table__sort-btn"
                 onClick={() => onSort('status')}
                 aria-label="Sort by Status"
               >
                 Status
                 <SortIndicator field="status" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
-            <th className="products-table__th products-table__th--date">
+            <th className="products-table__th products-table__th--updated">
               <button
                 type="button"
                 className="products-table__sort-btn"
-                onClick={() => onSort('createdAt')}
-                aria-label="Sort by Import Date"
+                onClick={() => onSort('updatedAt')}
+                aria-label="Sort by Updated"
               >
-                Import Date
-                <SortIndicator field="createdAt" currentField={sortBy} direction={sortDir} />
+                Updated
+                <SortIndicator field="updatedAt" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
             <th className="products-table__th products-table__th--date">
               <button
                 type="button"
                 className="products-table__sort-btn"
-                onClick={() => onSort('updatedAt')}
-                aria-label="Sort by Updated"
+                onClick={() => onSort('createdAt')}
+                aria-label="Sort by Import Date"
               >
-                Updated
-                <SortIndicator field="updatedAt" currentField={sortBy} direction={sortDir} />
+                Import Date
+                <SortIndicator field="createdAt" currentField={sortBy} direction={sortDir} />
               </button>
             </th>
           </tr>
@@ -207,18 +207,18 @@
                   {product.mpn || product.sku || '—'}
                 </Link>
               </td>
-              <td className="products-table__td products-table__td--name">
-                <Link to={`/products/${product.id}`} className="products-table__link">
-                  {product.name || 'Unnamed Product'}
-                </Link>
-              </td>
               <td className="products-table__td products-table__td--brand">
                 {product.brand || '—'}
               </td>
+              <td className="products-table__td products-table__td--name">
+                <Link to={`/products/${product.id}`} className="products-table__link">
+                  {product.name || 'Unnamed Product'}
+                </Link>
+              </td>
               <td className="products-table__td products-table__td--department">
                 {product.department || '—'}
               </td>
               <td className="products-table__td products-table__td--status">
                 {product.status && (
                   <span className={`products-table__status ${getStatusClass(product.status)}`}>
                     {product.status}
                   </span>
                 )}
               </td>
-              <td className="products-table__td products-table__td--date">
-                {formatDate(product.createdAt)}
-              </td>
-              <td className="products-table__td products-table__td--date">
+              <td className="products-table__td products-table__td--updated">
                 {formatDate(product.updatedAt)}
               </td>
+              <td className="products-table__td products-table__td--date">
+                {formatDate(product.createdAt)}
+              </td>
             </tr>
           ))}
         </tbody>
```

**Verification:** 7 columns now in order: MPN | Brand | Name | Department | Status | Updated | Import Date

---

## PATCH 3: Fix Pagination (Rows Per Page Not Working)

**File:** `packages/web/src/hooks/useProducts.ts`

**Issue:** Changing rows-per-page doesn't reset pagination or re-fetch with new limit.

**Root Cause:** The `limit` prop is passed to useProducts but changing it doesn't trigger a refresh because it's not in the useEffect dependency array.

```diff
--- a/packages/web/src/hooks/useProducts.ts
+++ b/packages/web/src/hooks/useProducts.ts
@@ -268,7 +268,7 @@
   useEffect(() => {
     if (autoLoad) {
       fetchProducts(true);
     }
-  }, [debouncedSearch, filters, sortBy, sortDir, autoLoad]); // Trigger on filter/sort changes
+  }, [debouncedSearch, filters, sortBy, sortDir, limit, autoLoad, fetchProducts]); // Added limit to trigger refresh
```

**Verification:** When itemsPerPage changes in ProductsPage.tsx (via handleItemsPerPageChange), the useProducts hook will now detect the limit change and re-fetch with the new page size.

---

## PATCH 4: Add Delete Functionality (Single + Bulk)

### Step 4A: Add API Endpoint

**File:** `packages/api/src/endpoints/products.ts`

**Add after patchProductAttributesHandler:**

```typescript
/**
 * DELETE /products/:productId
 * 
 * Delete a single product by ID.
 * Only admins can delete products.
 */
export async function deleteProductHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const productId = req.params.productId;
    
    if (!productId) {
      res.status(400).json({ 
        error: 'MISSING_PRODUCT_ID', 
        message: 'Product ID is required' 
      });
      return;
    }

    try {
      const db = admin.firestore();
      const productRef = db.collection('products').doc(productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        res.status(404).json({ 
          error: 'PRODUCT_NOT_FOUND', 
          message: `Product ${productId} not found` 
        });
        return;
      }

      // Delete the product
      await productRef.delete();

      res.status(200).json({ 
        success: true,
        message: `Product ${productId} deleted successfully`,
        deletedId: productId
      });
    } catch (error) {
      console.error('[deleteProduct] Error:', error);
      res.status(500).json({ 
        error: 'DELETE_FAILED', 
        message: 'Failed to delete product',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}

/**
 * POST /products/bulk-delete
 * 
 * Delete multiple products by ID.
 * Requires body: { productIds: string[] }
 */
export async function bulkDeleteProductsHandler(req: Request, res: Response) {
  await requireAdmin(req, res, async () => {
    const { productIds } = req.body;
    
    if (!Array.isArray(productIds) || productIds.length === 0) {
      res.status(400).json({ 
        error: 'INVALID_PRODUCT_IDS', 
        message: 'productIds must be a non-empty array' 
      });
      return;
    }

    if (productIds.length > 500) {
      res.status(400).json({ 
        error: 'TOO_MANY_IDS', 
        message: 'Cannot delete more than 500 products at once' 
      });
      return;
    }

    try {
      const db = admin.firestore();
      const batch = db.batch();
      const results = { success: 0, failed: 0, notFound: 0 };

      // Add all deletes to batch
      for (const id of productIds) {
        const ref = db.collection('products').doc(id);
        const doc = await ref.get();
        
        if (!doc.exists) {
          results.notFound++;
          continue;
        }
        
        batch.delete(ref);
        results.success++;
      }

      // Commit batch
      await batch.commit();

      res.status(200).json({ 
        success: true,
        message: `Deleted ${results.success} products`,
        results
      });
    } catch (error) {
      console.error('[bulkDeleteProducts] Error:', error);
      res.status(500).json({ 
        error: 'BULK_DELETE_FAILED', 
        message: 'Failed to delete products',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}
```

### Step 4B: Register Routes

**File:** `packages/api/src/index.ts` or wherever products routes are registered

**Find the section where product routes are registered and add:**

```typescript
// DELETE endpoints
app.delete('/api/products/:productId', deleteProductHandler);
app.post('/api/products/bulk-delete', bulkDeleteProductsHandler);
```

### Step 4C: Add Frontend Delete Hook

**File:** `packages/web/src/hooks/useProducts.ts`

**Add to the return object:**

```diff
--- a/packages/web/src/hooks/useProducts.ts
+++ b/packages/web/src/hooks/useProducts.ts
@@ -298,6 +298,67 @@
     setPageToken(null);
   }, []);

+  /**
+   * Delete a single product
+   */
+  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
+    try {
+      const headers = await getAuthHeaders();
+      const url = `${API_BASE}/api/products/${productId}`;
+      const response = await fetch(url, {
+        method: 'DELETE',
+        headers,
+      });
+
+      if (!response.ok) {
+        if (response.status === 404) {
+          throw new Error('Product not found');
+        }
+        if (response.status === 401) {
+          throw new Error('Unauthorized. Please sign in again.');
+        }
+        if (response.status === 403) {
+          throw new Error('You do not have permission to delete products.');
+        }
+        throw new Error(`Failed to delete product: ${response.status}`);
+      }
+
+      // Refresh list after delete
+      await refresh();
+    } catch (err) {
+      console.error('[useProducts] Delete error:', err);
+      throw err;
+    }
+  }, [refresh]);
+
+  /**
+   * Delete multiple products (bulk)
+   */
+  const bulkDeleteProducts = useCallback(async (productIds: string[]): Promise<void> => {
+    try {
+      const headers = await getAuthHeaders();
+      const url = `${API_BASE}/api/products/bulk-delete`;
+      const response = await fetch(url, {
+        method: 'POST',
+        headers: {
+          ...headers,
+          'Content-Type': 'application/json',
+        },
+        body: JSON.stringify({ productIds }),
+      });
+
+      if (!response.ok) {
+        throw new Error(`Failed to delete products: ${response.status}`);
+      }
+
+      // Refresh list after bulk delete
+      await refresh();
+    } catch (err) {
+      console.error('[useProducts] Bulk delete error:', err);
+      throw err;
+    }
+  }, [refresh]);
+
   return {
     items,
     loading,
@@ -313,6 +374,8 @@
     setSortDir: handleSetSortDir,
     refresh,
     loadMore,
+    deleteProduct,
+    bulkDeleteProducts,
   };
 }
```

### Step 4D: Update ProductsPage with Delete Actions

**File:** `packages/web/src/pages/ProductsPage.tsx`

**Add destructured delete functions:**

```diff
--- a/packages/web/src/pages/ProductsPage.tsx
+++ b/packages/web/src/pages/ProductsPage.tsx
@@ -206,6 +206,8 @@
     sortDir,
     setSortDir,
     refresh,
+    deleteProduct,
+    bulkDeleteProducts,
   } = useProducts({
     limit: itemsPerPage,
     autoLoad: true,
```

**Update handleBulkAction to implement delete:**

```diff
--- a/packages/web/src/pages/ProductsPage.tsx
+++ b/packages/web/src/pages/ProductsPage.tsx
@@ -394,13 +394,36 @@
   const handleBulkAction = useCallback(
     (action: string) => {
-      // TODO: Implement bulk actions
-      console.log(`Bulk action: ${action} for ${selectedIds.size} items`);
-      alert(`Bulk ${action}: ${selectedIds.size} products selected`);
-      
-      // Clear selection after action
-      setSelectedIds(new Set());
+      if (action === 'delete') {
+        if (!confirm(`Delete ${selectedIds.size} selected products? This cannot be undone.`)) {
+          return;
+        }
+
+        const idsArray = Array.from(selectedIds);
+        bulkDeleteProducts(idsArray)
+          .then(() => {
+            alert(`Successfully deleted ${selectedIds.size} products`);
+            setSelectedIds(new Set());
+          })
+          .catch((error) => {
+            alert(`Failed to delete products: ${error.message}`);
+          });
+      } else {
+        // TODO: Implement other bulk actions (export, etc.)
+        console.log(`Bulk action: ${action} for ${selectedIds.size} items`);
+        alert(`Bulk ${action}: ${selectedIds.size} products selected`);
+        setSelectedIds(new Set());
+      }
     },
-    [selectedIds]
+    [selectedIds, bulkDeleteProducts]
   );
+
+  /**
+   * Handle single product delete (from table row context menu or button)
+   */
+  const handleDeleteProduct = useCallback(
+    async (productId: string, productName: string) => {
+      if (!confirm(`Delete "${productName}"? This cannot be undone.`)) {
+        return;
+      }
+
+      try {
+        await deleteProduct(productId);
+        alert(`Successfully deleted "${productName}"`);
+      } catch (error) {
+        alert(`Failed to delete product: ${error instanceof Error ? error.message : 'Unknown error'}`);
+      }
+    },
+    [deleteProduct]
+  );
```

**Verification:** 
- Bulk delete works from BulkActionToolbar "Delete" button
- Single delete needs UI trigger (could add delete icon in table row)

---

## PATCH 5: Add MPN to TypeScript Interfaces

**File:** `packages/web/src/hooks/useProducts.ts`

**Issue:** ProductSummary interface may not have `mpn` field defined.

```diff
--- a/packages/web/src/hooks/useProducts.ts
+++ b/packages/web/src/hooks/useProducts.ts
@@ -14,6 +14,7 @@
 export interface ProductSummary {
   id: string;
   sku?: string;
+  mpn?: string;
   name?: string;
   brand?: string;
   department?: string;
```

**Verification:** TypeScript will now recognize product.mpn in ProductsTable.

---

## PATCH 6: Verify Search by MPN (Backend)

**File:** `packages/api/src/services/productListService.ts` or similar

**Check:** Ensure the API products list endpoint searches both MPN and Name when `q` param is provided.

**If missing, add MPN to search fields:**

```typescript
// Example pseudo-code (exact location TBD based on codebase)
if (searchQuery) {
  query = query.where('searchTokens', 'array-contains-any', 
    generateSearchTokens([searchQuery, mpnQuery])
  );
  // OR use composite index:
  // WHERE mpn == searchQuery OR name LIKE %searchQuery%
}
```

**Action Required:** Need to read actual API products list endpoint to verify MPN search is included.

---

## PATCH 7: Add Real-Time Refresh (onSnapshot)

**File:** `packages/web/src/hooks/useProducts.ts`

**Option A: Poll for changes every 10 seconds**

```diff
--- a/packages/web/src/hooks/useProducts.ts
+++ b/packages/web/src/hooks/useProducts.ts
@@ -270,6 +270,15 @@
       fetchProducts(true);
     }
   }, [debouncedSearch, filters, sortBy, sortDir, limit, autoLoad, fetchProducts]);
+
+  /**
+   * Auto-refresh products list every 10 seconds
+   */
+  useEffect(() => {
+    const intervalId = setInterval(() => {
+      refresh();
+    }, 10000); // 10 seconds
+    return () => clearInterval(intervalId);
+  }, [refresh]);
```

**Option B: Use Firestore onSnapshot (requires API changes)**

Would need to expose Firestore listener in API or use Firebase client SDK directly in frontend.

**Recommendation:** Start with Option A (polling) for immediate fix, then migrate to onSnapshot in future iteration.

---

## MANUAL STEPS AFTER APPLYING PATCHES

1. **Apply all patches:**
   ```bash
   # Apply each patch manually or use git apply if saved as .patch files
   ```

2. **Update API route registration:**
   - Find where `patchProductAttributesHandler` is registered
   - Add DELETE routes for `deleteProductHandler` and `bulkDeleteProductsHandler`

3. **Build and test:**
   ```bash
   cd /workspaces/ROPI-V2.1
   pnpm install
   pnpm build
   pnpm test
   ```

4. **Deploy to staging:**
   ```bash
   firebase deploy --only hosting,functions --project staging
   ```

5. **VVP Verification:**
   - Load Products List on staging
   - Test pagination: 25/50/100 rows per page
   - Verify 7 columns: MPN | Brand | Name | Department | Status | Updated | Import Date
   - Select products and click Delete (bulk)
   - Search for product by MPN
   - Import/edit a product and confirm list auto-refreshes

6. **Capture Evidence:**
   - Screenshot: Pagination working with 50 items
   - Screenshot: Correct 7 columns
   - Screenshot: Bulk delete confirmation
   - Screenshot: Search results

---

## DEPENDENCIES

- No new package dependencies required
- Uses existing Firebase Admin SDK for delete operations
- Uses existing fetch/auth infrastructure for frontend API calls

---

## ROLLBACK PLAN

If issues occur:
1. Revert commit: `git revert <commit-sha>`
2. Redeploy previous version: `firebase deploy --only hosting,functions`
3. Verify previous functionality restored

---

## SUCCESS CRITERIA

- [ ] Pagination works beyond 25 items
- [ ] Rows-per-page selector (25/50/100) triggers re-fetch with new limit
- [ ] Table shows exactly 7 columns: MPN, Brand, Name, Department, Status, Updated, Import Date
- [ ] MPN is first column (not SKU)
- [ ] Bulk delete works with confirmation dialog
- [ ] Single delete works (if UI trigger added)
- [ ] Search finds products by MPN and Name
- [ ] List auto-refreshes every 10 seconds (or on import/edit events)

---

## EXECUTOR NOTES

**Homer:** This patch pack provides exact diffs for all required fixes. Each patch is annotated with line numbers from the current codebase. Apply sequentially, test after each change, and capture VVP evidence before creating the PR.

**Critical:** Do NOT skip the delete confirmation dialogs. Users must explicitly confirm destructive actions.

**API Route Registration:** You'll need to find where `app.patch('/api/products/:productId/attributes', ...)` is registered and add the DELETE routes there. It's likely in `packages/api/src/index.ts` or `packages/api/src/app.ts`.

---

**END OF PATCH PACK**
