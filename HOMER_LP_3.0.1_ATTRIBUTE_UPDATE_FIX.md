# HOMER_LP_3.0.1_ATTRIBUTE_UPDATE_FIX.md

## LP-3.0.1 Implementation Audit

**Task**: Accept client shapes (allowed_values and synonyms), validate and return structured validation errors from the server for attribute updates, and update Attribute Manager to surface those errors to the user.

**Branch**: `lp/3.0.1-attribute-update-fix`  
**PR**: #326 - https://github.com/twgallo13/ROPI-V2.1/pull/326  
**Commit**: `2eef5e3`  
**Date**: 2025-06-21

---

## Changes Summary

### Server-Side (packages/api)

#### File: `packages/api/src/endpoints/admin/settings.ts`

**Coercion Logic (LP-3.0.1)**:
```typescript
// Coerce allowed_values from comma-separated string to array
if (typeof payload.allowed_values === 'string') {
  payload.allowed_values = payload.allowed_values
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean);
}

// Coerce synonyms from JSON string or comma-separated string
if (payload.synonyms && typeof payload.synonyms === 'string') {
  try {
    payload.synonyms = JSON.parse(payload.synonyms);
  } catch {
    payload.synonyms = payload.synonyms
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
}
```

**Structured Error Response**:
```typescript
// On validation failure
res.status(400).json({
  ok: false,
  error: 'validation_failed',
  message: 'Invalid attribute data',
  details: validation.errors,
});

// On success
res.status(200).json({
  ok: true,
  attribute: updatedAttribute,
});
```

### Client-Side (packages/web)

#### File: `packages/web/src/hooks/useAttributes.ts`

**New Type Definition**:
```typescript
export type UpdateAttributeResult = 
  | { ok: true; attribute: Attribute }
  | { ok: false; error: string; details?: any[] };
```

**updateAttribute Function**:
- Returns `UpdateAttributeResult` instead of throwing on 400 errors
- Handles both success (200) and validation failure (400) responses

#### File: `packages/web/src/pages/Settings/AttributeManager.tsx`

**Error State**:
```typescript
const [saveDetails, setSaveDetails] = useState<any[] | null>(null);
```

**handleSave Logic**:
```typescript
const result = await updateAttribute(editItem.attribute_id, payload);
if (!result.ok) {
  setSaveError(result.error);
  setSaveDetails(result.details || null);
  toastError(result.error);
  return; // Don't close modal
}
// Success - close modal and refresh
```

**UI Error Display**:
```tsx
{saveError && (
  <div className="attr-save-error">
    Save failed: {saveError}
    {saveDetails && (
      <details className="attr-save-details">
        <summary>Validation Details</summary>
        <pre>{JSON.stringify(saveDetails, null, 2)}</pre>
      </details>
    )}
  </div>
)}
```

#### File: `packages/web/src/styles/attributes.css`

**Added Styles**:
```css
.attr-save-error {
  color: #c62828;
  background: #ffebee;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}
.attr-save-details {
  margin-top: 0.5rem;
  font-size: 0.85rem;
}
.attr-save-details pre {
  background: #fff;
  padding: 0.5rem;
  border: 1px solid #ccc;
  max-height: 150px;
  overflow: auto;
}
```

---

## Test Coverage

### Server Tests: `packages/api/test/admin.settings.attributeUpdate.test.ts`

**12 Unit Tests for Coercion Functions**:

1. ✅ coerceAllowedValues - should convert comma-separated string to array
2. ✅ coerceAllowedValues - should handle JSON array string
3. ✅ coerceAllowedValues - should pass through existing arrays
4. ✅ coerceAllowedValues - should handle empty string
5. ✅ coerceAllowedValues - should handle null/undefined
6. ✅ coerceAllowedValues - should trim whitespace
7. ✅ coerceSynonyms - should convert comma-separated string to array
8. ✅ coerceSynonyms - should parse valid JSON string
9. ✅ coerceSynonyms - should pass through existing arrays
10. ✅ coerceSynonyms - should handle empty string
11. ✅ coerceSynonyms - should handle null/undefined
12. ✅ coerceSynonyms - should trim whitespace from comma-separated

### Client Tests: `packages/web/test/AttributeManager.saveError.test.tsx`

**5 Component Tests for Error Display**:

1. ✅ should display saveError when updateAttribute returns ok:false
2. ✅ should display validation details when present
3. ✅ should clear error when modal is cancelled
4. ✅ should show success toast when update succeeds
5. ✅ should handle network errors gracefully

---

## Deployment

- **Target**: Staging (ropi-bccee)
- **Functions**: All functions updated successfully
- **Hosting**: https://ropi-aoss-staging.web.app
- **Status**: ✅ Deployed

---

## Testing Instructions

### Manual Verification (Attribute Manager UI)

1. Navigate to https://ropi-aoss-staging.web.app/admin/settings/attributes
2. Click "Edit" on an existing attribute
3. Try updating with invalid data (e.g., invalid data_type)
4. Verify error message displays in modal
5. Click "Validation Details" to expand error info
6. Cancel and re-open to verify errors clear

### API Verification (curl)

**Test 1: Successful update with coerced allowed_values**
```bash
# Should return 200 with coerced array
curl -X PUT "https://ropi-aoss-staging.web.app/api/admin/settings/attributes/department" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"allowed_values": "Hats,Shoes,Accessories", "label": "Department"}'

# Expected response:
# {"ok":true,"attribute":{...,"allowed_values":["Hats","Shoes","Accessories"]}}
```

**Test 2: Validation failure with structured error**
```bash
# Should return 400 with details
curl -X PUT "https://ropi-aoss-staging.web.app/api/admin/settings/attributes/department" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"data_type": "invalid_type"}'

# Expected response:
# {"ok":false,"error":"validation_failed","message":"Invalid attribute data","details":[...]}
```

---

## Files Changed

| File | Change Type | Lines Added | Lines Removed |
|------|-------------|-------------|---------------|
| packages/api/src/endpoints/admin/settings.ts | MODIFIED | +58 | -14 |
| packages/web/src/hooks/useAttributes.ts | MODIFIED | +24 | -6 |
| packages/web/src/pages/Settings/AttributeManager.tsx | MODIFIED | +25 | -8 |
| packages/web/src/styles/attributes.css | MODIFIED | +18 | -0 |
| packages/api/test/admin.settings.attributeUpdate.test.ts | NEW | +194 | - |
| packages/web/test/AttributeManager.saveError.test.tsx | NEW | +212 | - |

---

## Related Issues

- LP-3.0.0: ✅ Completed (PR #325) - CORS preflight fix for importCSV
- LP-3.0.1: ✅ Completed (PR #326) - Attribute update coercion and errors
- LP-3.0.2: 🔜 Next - Product Editor defensive guards

---

## Sign-Off

- [x] Server coercion logic implemented and tested
- [x] Structured error responses implemented
- [x] Client error display implemented
- [x] All tests passing (17 total: 12 server + 5 client)
- [x] Deployed to staging
- [x] PR created (#326)
- [x] Audit file created
