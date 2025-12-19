# PVS-0.2.1 — Attributes Console Baseline Audit

**Date**: 2025-12-19  
**Branch**: `lisa/PVS-0.2.1/attributes-console-audit`  
**Environment**: Staging (`ropi-aoss-staging.web.app`)

---

## 1. Navigation & Routing Findings

### Current State ✅

| Item | Status | Notes |
|------|--------|-------|
| Top-level "Attributes" link | **Removed** | Only 8 main nav items (Home, Products, Launch Calendar, Import, Export, Observations, Smart Rules, Settings) |
| Settings → Attributes | **Present** | Route: `/settings/attributes` |
| `/attributes` redirect | **Working** | Redirects to `/settings/attributes` |

### Code References

- **Navigation config**: `packages/web/src/config/nav.ts`
  - Main nav: lines 18-61 (8 items, no Attributes)
  - Settings sub-nav: lines 69-116 (Attributes at line 102-106)

- **Routing**: `packages/web/src/App.tsx`
  - `/attributes` redirect: line 38
  - `/settings/attributes`: line 45

### Screenshots

_(Screenshots would require browser automation - documenting code state instead)_

---

## 2. Sampled Attribute IDs & Shapes

### Attribute A: `age_group` (Canonical Schema ✅)

**Type**: Active, well-formed attribute with enum values

```json
{
  "attribute_id": "age_group",
  "label": "Age Group",
  "data_type": "enum",          // ← Correct field name
  "status": "active",           // ← Present
  "allowed_values": ["Adult", "Kids", "Infant", "Toddler", "Teen"],
  "required_for_completion": true,
  "required_for_export": true,
  "import_required": false,
  "synonyms": ["ageGroup", "age-group", ...],
  "source": "json"
}
```

### Attribute B: `rics_source.brand` (Legacy Schema ⚠️)

**Type**: Problem attribute - uses legacy field names

```json
{
  "attribute_id": "rics_source.brand",
  "dataType": "string",         // ← WRONG: should be data_type
  "label": "Brand",
  // MISSING: status, required_for_completion, required_for_export, import_required
  // EXTRA legacy fields: usage, description, rules, legacyPaths, systemFlag, 
  //                      importerColumns, examples, canonicalPath, export, key
}
```

### Attribute C: `descriptive.gender` (Legacy Schema ⚠️)

**Type**: Problem attribute - uses legacy field names

```json
{
  "attribute_id": "descriptive.gender",
  "dataType": "string",         // ← WRONG: should be data_type
  "label": "Gender",
  // MISSING: status, required_for_*, source
  // EXTRA: rules, legacyPaths, examples, canonicalPath, importerColumns
}
```

### Schema Comparison

| Field | Canonical (`age_group`) | Legacy (`rics_source.brand`) |
|-------|------------------------|------------------------------|
| `data_type` | ✅ Present | ❌ Missing (has `dataType`) |
| `status` | ✅ "active" | ❌ Missing |
| `required_for_completion` | ✅ true/false | ❌ Missing |
| `required_for_export` | ✅ true/false | ❌ Missing |
| `import_required` | ✅ true/false | ❌ Missing |
| `source` | ✅ "json" | ❌ Missing |

---

## 3. Field-by-Field Diff: What's Blank on Load

When opening a **legacy attribute** (`rics_source.brand`):

| Form Field | Expected Source | Actual Value | Why Blank |
|------------|-----------------|--------------|-----------|
| Data Type | `attr.data_type` | `"string"` (default) | API returns `dataType`, form expects `data_type` |
| Status | `attr.status` | `"active"` (default) | Field missing in legacy doc |
| Required for Completion | `attr.required_for_completion` | `false` (default) | Field missing |
| Required for Export | `attr.required_for_export` | `false` (default) | Field missing |
| Required for Import | `attr.import_required` | `false` (default) | Field missing |
| Source | `attr.source` | `"json"` (default) | Field missing |

### Form Initialization Code

```tsx
// packages/web/src/pages/Settings/AttributeManager.tsx:78-79
const openEdit = (attr: Attribute) => {
  setFormData({ ...DEFAULT_ATTR, ...attr });  // ← Legacy fields don't override
};
```

When `attr` has `dataType: "string"` instead of `data_type: "string"`, the spread doesn't override `DEFAULT_ATTR.data_type`.

---

## 4. Root Cause Hypothesis

### Primary Cause: **Schema Mismatch (Legacy vs Canonical)**

The Firestore collection `settings/attributes/keys` contains **two incompatible document schemas**:

1. **Canonical Schema** (67 attributes from `attributeRegistry.json`):
   - Field: `data_type` (snake_case)
   - Has: `status`, `required_for_completion`, `required_for_export`, `import_required`
   - Source: Batch import from Lisa's normalization scripts

2. **Legacy Schema** (~50+ attributes):
   - Field: `dataType` (camelCase)
   - Missing: `status`, `required_for_*` fields
   - Extra fields: `usage`, `rules`, `legacyPaths`, `systemFlag`, `canonicalPath`, etc.
   - Source: Historical RICS/product attribute import

### Why "Blank Until Resave" Occurs

**GET Path** (no normalization):
```
Firestore doc → fromFirestore() → API response → Frontend
               (raw data, no field mapping)
```

**UPDATE Path** (applies Zod defaults):
```
Frontend patch → merge with existing → validateAttributeData() → Firestore
                                       (Zod schema applies defaults!)
```

The Zod `AttributeSchema` has:
```typescript
data_type: z.enum([...]),                           // required
status: z.enum([...]).optional().default('active'), // default applied
required_for_completion: z.boolean().optional().default(false),
```

When you save, the schema validation:
1. Converts `dataType` → rejected (not in schema, or ignored)
2. Falls back to schema defaults for `data_type`, `status`, etc.
3. Writes normalized data to Firestore

**After resave**, the document now has canonical field names, so the UI displays correctly.

### Evidence

1. **API samples** show clear field name mismatch:
   - `age_group.json`: has `data_type`
   - `rics_source.brand.json`: has `dataType`

2. **Form initialization** in `AttributeManager.tsx:78`:
   ```tsx
   setFormData({ ...DEFAULT_ATTR, ...attr });
   ```
   Legacy `attr.dataType` doesn't override `DEFAULT_ATTR.data_type`.

3. **Update handler** in `settings.ts:147-153`:
   ```typescript
   const validation = validateAttributeData(merged);
   // ...
   const updated = await updateAttribute(attributeId, validation.data as any, actor);
   ```
   Zod validation normalizes the data before write.

---

## 5. Recommendation: Best Fix Path

### Option A: Backend GET Normalization (Recommended) ✅

Normalize legacy fields in `fromFirestore()`:

```typescript
function fromFirestore(doc: DocumentSnapshot): AttributeType | null {
  const data = doc.data();
  if (!data) return null;
  
  // Normalize legacy field names
  return {
    attribute_id: doc.id,
    label: data.label,
    data_type: data.data_type || data.dataType || 'string',
    status: data.status || 'active',
    required_for_completion: data.required_for_completion ?? false,
    required_for_export: data.required_for_export ?? false,
    import_required: data.import_required ?? false,
    // ... other fields with defaults
  } as AttributeType;
}
```

**Pros**:
- Single point of normalization
- Consistent API contract
- No frontend changes needed
- Backward compatible

**Cons**:
- Doesn't fix underlying data (docs remain legacy until saved)

### Option B: Frontend Hydration

Add field mapping in `openEdit()`:

```tsx
const openEdit = (attr: Attribute) => {
  const normalized = {
    ...DEFAULT_ATTR,
    ...attr,
    data_type: attr.data_type || (attr as any).dataType || 'string',
    status: attr.status || 'active',
  };
  setFormData(normalized);
};
```

**Pros**:
- Quick fix
- No API changes

**Cons**:
- Doesn't fix list view display issues
- Field mapping duplicated between components
- Fragile if other views added

### Option C: Data Migration (Best Long-Term)

Run a one-time script to normalize all legacy documents:

```typescript
async function migrateAttributes() {
  const docs = await db.collection('settings/attributes/keys').get();
  for (const doc of docs.docs) {
    const data = doc.data();
    if (data.dataType && !data.data_type) {
      await doc.ref.update({
        data_type: data.dataType,
        status: data.status || 'active',
        required_for_completion: data.required_for_completion ?? false,
        // ... normalize all fields
      });
    }
  }
}
```

**Pros**:
- Fixes root cause permanently
- Clean data going forward

**Cons**:
- One-time effort
- Need to handle in-flight edits

### Recommended Approach

**Milestone 4 should implement Option A + Option C**:
1. **Option A** (immediate): Add normalization in `fromFirestore()` so UI works immediately
2. **Option C** (follow-up): Run migration script to fix underlying data

---

## 6. Code Path Reference

### Web (Frontend)

| File | Lines | Purpose |
|------|-------|---------|
| `packages/web/src/pages/Settings/AttributeManager.tsx` | 1-419 | Attribute list + edit modal |
| `packages/web/src/pages/Settings/AttributeManager.tsx` | 78-80 | `openEdit()` - form hydration |
| `packages/web/src/pages/Settings/AttributeManager.tsx` | 30-38 | `DEFAULT_ATTR` - form defaults |
| `packages/web/src/hooks/useAttributes.ts` | 1-357 | API hook for CRUD operations |
| `packages/web/src/hooks/useAttributes.ts` | 119-140 | `fetchAttributes()` - list fetch |
| `packages/web/src/hooks/useAttributes.ts` | 319-327 | `getAttributeById()` - single fetch |

### API (Backend)

| File | Lines | Purpose |
|------|-------|---------|
| `packages/api/src/endpoints/admin/settings.ts` | 43-59 | `listAttributesHandler` |
| `packages/api/src/endpoints/admin/settings.ts` | 61-81 | `getAttributeHandler` |
| `packages/api/src/endpoints/admin/settings.ts` | 118-172 | `updateAttributeHandler` |
| `packages/api/src/services/attributesService.ts` | 83-88 | `fromFirestore()` - no normalization |
| `packages/api/src/services/attributesService.ts` | 213-247 | `updateAttribute()` |
| `packages/api/src/services/attributesService.ts` | 296-317 | `validateAttributeData()` - Zod validation |

### SDK (Schema)

| File | Lines | Purpose |
|------|-------|---------|
| `packages/sdk/src/schema/attribute.ts` | 15-35 | `AttributeSchema` with defaults |

---

## 7. Ready for Milestone 1 UI Shell?

### Decision: **YES** ✅

**Reasoning**:

1. **Root cause is fully understood**: Schema mismatch between legacy (`dataType`) and canonical (`data_type`) documents.

2. **Fix path is clear**: Normalize in `fromFirestore()` (Option A) as part of Milestone 4.

3. **UI shell doesn't depend on fix**: Milestone 1 is about UI structure and layout, not data normalization. The existing `AttributeManager.tsx` provides a working reference.

4. **No blockers**: Navigation is correct, routing works, CRUD operations function (just with the resave-to-fix quirk).

### Pre-requisites for Milestone 1

- [x] Branch created
- [x] Navigation verified
- [x] Audit complete
- [x] Root cause documented
- [ ] **Milestone 4 ticket created** for normalization fix

---

## Appendix: API Sample Files

| File | Description |
|------|-------------|
| `api-samples/list.json` | Full list response (~50 attributes) |
| `api-samples/age_group.json` | Canonical schema example |
| `api-samples/rics_source.brand.json` | Legacy schema example |
| `api-samples/descriptive.gender.json` | Legacy schema example |
| `api-samples/age_group.usage.json` | Usage data |
| `api-samples/rics_source.brand.usage.json` | Usage data |
| `api-samples/descriptive.gender.usage.json` | Usage data |
