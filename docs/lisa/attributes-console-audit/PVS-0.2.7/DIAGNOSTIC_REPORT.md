# PVS-0.2.7 Diagnostic Report: data_type Conversion Issue

**Date:** 2025-12-19  
**Branch:** `lisa/PVS-0.2.7/data-type-conversion-flow`

---

## 1. Issue Summary

When changing `data_type` from `string` to `enum`/`multiSelect`/`select` in the Overview tab:
1. User changes dropdown value from "String" to "Enum" 
2. User clicks Save
3. **Expected:** Attribute is updated with new data_type
4. **Actual:** Either save fails silently, or API rejects due to missing `allowed_values`

---

## 2. Root Cause Analysis

### 2.1 Frontend Validation

The `handleSave` function in `AttributesConsole.tsx` (lines 226-261) has validation:

```tsx
// Check for enum/multiSelect without values
if (
  (formData.data_type === 'enum' || formData.data_type === 'multiSelect') &&
  (!formData.allowed_values || formData.allowed_values.length === 0)
) {
  toastError('Allowed values are required for enum/multi-select.');
  setSaving(false);
  return;
}
```

**Issue:** This validation catches the error but doesn't help the user fix it. It just shows a toast and stops save.

### 2.2 Backend Schema Validation

The `AttributeSchema` in `packages/sdk/src/schema/attribute.ts` defines:

```typescript
data_type: z.enum(['string', 'number', 'boolean', 'enum', 'currency', 'json', 'multiSelect', 'date']),
allowed_values: z.array(z.string()).optional(),
```

**Issue:** The schema allows `allowed_values` to be optional, meaning the backend accepts `data_type: 'enum'` without `allowed_values`. This creates an inconsistent state where an enum attribute has no values.

### 2.3 Frontend Data Type Options

The `OverviewTab` component shows these data type options:

```tsx
<option value="string">String</option>
<option value="number">Number</option>
<option value="boolean">Boolean</option>
<option value="enum">Enum</option>
<option value="multiSelect">Multi-Select</option>
<option value="currency">Currency</option>
<option value="date">Date</option>
<option value="json">JSON</option>
```

**Note:** The user request mentions "select" but the schema uses "enum". This may cause confusion.

---

## 3. Evidence Collection Plan

### 3.1 Console Log Capture

When Save is clicked:
1. Frontend validation fires at `handleSave` (line 226)
2. If `data_type === 'enum'` and no `allowed_values`, toast shows "Allowed values are required"
3. Network request is NOT made (early return at line 235)

### 3.2 Network Request Analysis

If validation passes (somehow has allowed_values):
- Method: PUT
- URL: `/api/admin/settings/attributes/{id}`
- Body: Full merged attribute object
- Response: 200 with updated attribute

### 3.3 Server Behavior

The `updateAttributeHandler` in `settings.ts`:
1. Fetches existing attribute
2. Merges with patch
3. Validates merged object with `validateAttributeData()`
4. Writes to Firestore

**Zod schema allows empty allowed_values for enum**, so server would accept it.

---

## 4. Identified Problems

### P1: No Conversion Flow
Changing `data_type` from `string` → `enum` is blocked by frontend validation with no way forward.

### P2: No Value Population UI
User cannot add `allowed_values` when converting because:
- Overview tab only has the dropdown
- Values tab shows "No values defined" but no add button

### P3: No "Propose Values" Feature
No way to scan products and propose common values for conversion.

### P4: UX Gap
Error message "Allowed values are required" doesn't guide user to fix the issue.

---

## 5. Recommended Fixes

### Fix 1: Conversion Modal
When user changes `data_type` to enum/multiSelect and `allowed_values` is empty:
- Open a conversion modal instead of blocking save
- Modal explains: "To convert to a controlled list, you must supply allowed values"
- Options: "Propose values" | "Enter manually" | "Cancel"

### Fix 2: Propose Values Endpoint
New endpoint: `GET /api/admin/tasks/attributes/{id}/top-values?limit=500`
- Scans products for distinct values
- Returns `{ values: [{value, count}, ...] }`

### Fix 3: Manual Entry UI
Modal with textarea for newline-separated values with deduplication.

### Fix 4: Post-Conversion UX
After successful conversion:
- Show success toast with link to Values tab
- Values tab should now show the allowed values

---

## 6. Test Scenarios

| Scenario | Current Behavior | Expected Behavior |
|----------|------------------|-------------------|
| Change string→enum, Save | Toast error, no network | Conversion modal opens |
| Propose values | N/A | Top values returned from products |
| Manual entry | N/A | Textarea, dedupe, save |
| Cancel conversion | N/A | Reverts to string |
| After conversion | N/A | Values tab shows values |

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `AttributesConsole.tsx` | Add ConversionModal, handlers |
| `AttributeDetailPanel.tsx` | Pass conversion handlers |
| `useAttributes.ts` | Add `getTopValues` function |
| `packages/api/src/endpoints/admin/settings.ts` | Add top-values endpoint |
| `packages/api/src/services/attributesService.ts` | Add `getTopValues` service |

---

## 8. API Contract: Proposed top-values endpoint

```
GET /api/admin/settings/attributes/{id}/top-values?limit=500&min_count=2

Response:
{
  "values": [
    { "value": "Red", "count": 1523 },
    { "value": "Blue", "count": 1201 },
    ...
  ],
  "total": 45,
  "sampled_products": 50000
}
```
