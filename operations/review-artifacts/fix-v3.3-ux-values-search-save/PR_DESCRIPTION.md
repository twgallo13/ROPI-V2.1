# v3.3 UX Fixes — Values, Search, Save Validation

## Summary

This PR implements targeted fixes to improve the ACC UX around product-value preview, search functionality, and save validation. Changes are minimal and focused on resolving specific UX issues identified in testing.

**Branch:** `fix/v3.3-ux-values-search-save`  
**Status:** Ready for review — DO NOT MERGE without Lisa approval

---

## Changes Implemented

### A — Server: Improved Search (include aliases/importerColumns)

**File:** `functions/src/handlers/attributes.ts`

**What:** Enhanced search filter in `getAttributes()` to include `importerColumns` and `ai.use` fields, making alias names searchable.

**Why:** Users searching for "department" or alias terms like "dept" should find the canonical attribute and its aliases.

**Code:**
```typescript
// Before: only searched label, canonicalPath, description
// After: also searches importerColumns and ai.use fields
if (search && typeof search === 'string') {
  const searchLower = search.toLowerCase();
  attributes = attributes.filter(attr => {
    const importerText = (attr.importerColumns || []).join(' ').toLowerCase();
    const aiUse = ((attr as any).ai?.use || []).join(' ').toLowerCase();
    return (
      String(attr.label || '').toLowerCase().includes(searchLower) ||
      String(attr.canonicalPath || '').toLowerCase().includes(searchLower) ||
      String(attr.description || '').toLowerCase().includes(searchLower) ||
      importerText.includes(searchLower) ||
      aiUse.includes(searchLower)
    );
  });
}
```

---

### B — Server: Normalized Product-Value Preview

**File:** `functions/src/handlers/attributes.ts`

**What:** Completely rewrote `getValuePreview()` to:
- Normalize SKU values (trim, handle case)
- Map to allowed values (if `validation.allowedValuesRef` exists)
- Count "Unknown" explicitly
- Return structured top-N + percentage stats

**Why:** Product-value preview was showing raw, non-normalized values and not mapping to vocabulary terms. This makes the preview accurate and actionable.

**Key features:**
- Fetches vocabulary from `allowedValuesRef` if present
- Normalizes values and maps to canonical display labels
- Returns `{ totalSamples, unknownCount, unknownPercentage, top: [{value, count, percentage, samples}], valueCounts }`
- Top 5 values with sample SKUs for debugging

---

### C — Client: AJV Validation Details & Required Field Check

**File:** `src/pages/settings/components/AttributeDetailDrawer.tsx`

**What:** 
1. Client-side validation: blocks save if required fields (canonicalPath, label, category, dataType) are missing
2. Enhanced error handling: displays AJV validation details in alert when server returns 400 with `details` array

**Why:** Users were hitting 400 errors without understanding why. Now they see:
```
Invalid attribute schema

Validation Details:
/canonicalPath: must be string
/label: is required
```

**Code:**
```typescript
// Client-side check before fetch
if (!formData.canonicalPath || !formData.label || !formData.category || !formData.dataType) {
  alert('Please fill required fields: Canonical Path, Label, Category, and Data Type.');
  return;
}

// Enhanced error display
if (!response.ok) {
  const error = await response.json().catch(() => ({ message: response.statusText }));
  const message = error.error || error.message || 'Failed to save attribute';
  if (Array.isArray(error.details)) {
    const details = error.details.map((d: any) => `${d.instancePath || d.dataPath || ''}: ${d.message}`).join('\n');
    alert(`${message}\n\nValidation Details:\n${details}`);
  } else {
    alert(message);
  }
  return;
}
```

---

### D — Client: Seed Permission & Clear Messaging

**File:** `src/pages/settings/components/AttributeDetailDrawer.tsx`

**What:**
1. Added permission check before allowing seed operation
2. Disabled "Save & Seed to Staging" button for users without admin/editor/coordinator role
3. Shows clear tooltip message: "Insufficient permissions to seed (requires admin, editor, or coordinator role)"

**Why:** Prevents 403 errors and communicates permission requirements upfront.

**Roles allowed to seed:** admin, editor, coordinator

**Code:**
```typescript
// Check permission before seed
const canSeed = ['admin', 'editor', 'coordinator'].includes(role || '');
if (!canSeed) {
  alert('Insufficient permissions to seed. Only admin, editor, or coordinator roles can seed to staging.');
  return;
}

// Button disabled state
<button
  onClick={handleSaveAndSeed}
  disabled={saving || !['admin', 'editor', 'coordinator'].includes(role || '')}
  title={!['admin', 'editor', 'coordinator'].includes(role || '') ? 'Insufficient permissions to seed (requires admin, editor, or coordinator role)' : ''}
  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
>
  Save & Seed to Staging
</button>
```

---

### E — Server: Validation Error Logging

**File:** `functions/src/handlers/attributes.ts`

**What:** Added `console.error()` logging when AJV validation fails in `createAttribute` and `updateAttribute`.

**Why:** Enables debugging by seeing exact AJV errors in Cloud Functions logs.

**Code:**
```typescript
if (!valid) {
  console.error('Invalid attribute schema (create):', validateAttribute.errors, attribute);
  return res.status(400).json({ 
    error: 'Invalid attribute schema', 
    details: validateAttribute.errors 
  });
}
```

---

## Testing & Verification

### Build Status
✅ Functions build: Clean (no TypeScript errors)  
✅ UI build: Clean (1,174 KB bundle)

### Manual Testing Checklist (Lisa to complete)

1. **Search improvements:**
   - [ ] Search for "department" → finds canonical attribute + aliases
   - [ ] Search for alias terms (e.g., "dept", "vendor") → finds parent attribute

2. **Product-value preview:**
   - [ ] Open attribute detail for `department`
   - [ ] Check Validation tab → Current Product Values
   - [ ] Verify: Top 3-5 values with correct counts
   - [ ] Verify: "Unknown" count is explicit
   - [ ] Verify: Values are normalized and mapped to vocabulary terms

3. **Save validation:**
   - [ ] Try saving attribute with missing required field (e.g., remove label)
   - [ ] Verify: Alert shows AJV details with field name and reason
   - [ ] Verify: Request is blocked client-side (no 400 in network tab)

4. **Seed permission:**
   - [ ] As non-admin/editor user, attempt "Save & Seed to Staging"
   - [ ] Verify: Button is disabled with tooltip
   - [ ] Verify: No 403 error (blocked client-side)
   - [ ] As admin/editor: Button is enabled and seed succeeds

---

## Files Changed

```
functions/src/handlers/attributes.ts (3 changes)
  - Enhanced search filter (lines ~80-95)
  - Rewrote getValuePreview (lines ~685-780)
  - Added validation error logging (lines ~127, ~227)

src/pages/settings/components/AttributeDetailDrawer.tsx (3 changes)
  - Client-side validation + AJV details display (lines ~181-230)
  - Seed permission check + button disabled state (lines ~233-260, ~900-915)
```

---

## Risk Assessment

**Risk Level:** Low  
**Scope:** Client + server search/validation/preview logic  
**Breaking Changes:** None  
**Rollback:** Simple git revert if issues found

---

## Next Steps

1. Lisa reviews this PR
2. Lisa completes manual testing checklist
3. If approved → merge to main
4. Deploy to staging for final verification
5. If staging verified → deploy to production

---

**DO NOT MERGE without explicit Lisa approval.**
