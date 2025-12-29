# Attribute Registry Documentation

## Overview

The **Attribute Registry** is the canonical source of truth for all product attributes in the ROPI AOSS system. It defines the schema, validation rules, and metadata for every attribute that can be assigned to products.

## Location

**Canonical file:** [`packages/sdk/config/attributeRegistry.json`](../packages/sdk/config/attributeRegistry.json)

**Firestore storage:** `settings/attributes/keys/{attributeId}`

## Purpose

The attribute registry serves multiple critical functions:

1. **Validation** — Ensures all product data conforms to defined schemas
2. **Import/Export** — Maps CSV columns to attributes and validates imported data
3. **UI Generation** — Drives dynamic form generation in the Product Editor
4. **Data Integrity** — Prevents undefined or mistyped attributes from entering the system
5. **Documentation** — Provides authoritative reference for all product fields

## Registry Format

The registry is a JSON file with the following structure:

```json
{
  "version": "1.0.3",
  "attributes": [
    {
      "attribute_id": "sku",
      "label": "SKU",
      "external_header": "SKU",
      "category": "sku_core",
      "data_type": "text",
      "required_for_completion": true,
      "required_for_export": true,
      "import_required": false,
      "ai_usage_notes": "Primary SKU / item id. Optional for import (MPN is primary identifier).",
      "status": "active"
    },
    ...
  ]
}
```

## Attribute Definition Fields

Each attribute in the registry contains:

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `attribute_id` | string | Unique identifier (snake_case, no spaces) |
| `label` | string | Human-readable display name |
| `data_type` | enum | One of: `text`, `number`, `boolean`, `enum`, `currency`, `json`, `multiSelect`, `date`, `longText`, `select`, `money` |

### Optional Metadata

| Field | Type | Description |
|-------|------|-------------|
| `external_header` | string | Column name in CSV imports |
| `category` | string | Grouping (e.g., `sku_core`, `identifiers`, `pricing`, `sizing`) |
| `allowed_values` | string[] | Valid values for `enum` or `select` types |
| `allow_custom_values` | boolean | Allow values outside `allowed_values` |
| `synonyms` | string[] | Alternative CSV column names |
| `required_for_completion` | boolean | Must be filled to mark product complete |
| `required_for_export` | boolean | Must be present to export product |
| `import_required` | boolean | Must be in import CSV (e.g., MPN) |
| `import_strict` | boolean | Reject import if value is invalid |
| `ai_usage_notes` | string | Guidance for AI agents and developers |
| `status` | enum | `active`, `deprecated`, `hidden` |

## Sync Flow

```
packages/sdk/config/attributeRegistry.json (source of truth)
           ↓
    [Build/Deploy Process]
           ↓
    packages/api (runtime)
           ↓
[syncAttributeRegistry task]
           ↓
Firestore: settings/attributes/keys/{attributeId}
           ↓
    [@ropi-aoss/web UI]
```

### Sync Script Location

`packages/api/src/tasks/syncAttributeRegistry.ts`

### How Sync Works

1. **Load Registry** — Reads `attributeRegistry.json` from SDK package
2. **Validate** — Ensures all attributes have required fields
3. **Upsert to Firestore** — Writes/updates each attribute to `settings/attributes/keys/{attributeId}`
4. **Write Metadata** — Updates `settings/attributes/meta` with:
   - `registry_version` — Version from JSON file
   - `lastSyncedAt` — ISO timestamp
   - `lastSyncedBy` — Actor (system, admin email, etc.)

### Triggering Sync

**Via API (recommended for production):**
```bash
pnpm api:sync:attributes
```

**Via Firebase Functions (if deployed as callable):**
```javascript
const syncAttributes = firebase.functions().httpsCallable('syncAttributeRegistry');
await syncAttributes({ dryRun: false });
```

**During Deployment:**
The deploy process automatically syncs the registry to Firestore using the service account credentials.

## Usage in Code

### SDK (TypeScript)

```typescript
import { getAttributeById, validateAttributeDomain } from '@ropi-aoss/sdk';

// Get attribute definition
const attrDef = getAttributeById('color');
console.log(attrDef.data_type); // 'enum'
console.log(attrDef.allowed_values); // ['red', 'blue', 'green', ...]

// Validate value against registry
const result = validateAttributeDomain('color', 'blue');
if (!result.valid) {
  console.error(result.message);
}
```

### API (Backend)

```typescript
import { getAttribute } from './services/attributesService';

// Fetch from Firestore
const attr = await getAttribute('brand');
console.log(attr.label); // 'Brand'
```

### Web UI (React)

```typescript
import { useAttributes } from '@/hooks/useAttributes';

function ProductEditor() {
  const { attributes, loading } = useAttributes();
  
  return (
    <div>
      {attributes.map(attr => (
        <FormField key={attr.attribute_id} definition={attr} />
      ))}
    </div>
  );
}
```

## Adding a New Attribute

1. **Edit Registry File**
   ```bash
   # Edit packages/sdk/config/attributeRegistry.json
   vim packages/sdk/config/attributeRegistry.json
   ```

2. **Add Attribute Entry**
   ```json
   {
     "attribute_id": "new_field",
     "label": "New Field",
     "data_type": "text",
     "category": "custom",
     "required_for_completion": false,
     "status": "active"
   }
   ```

3. **Increment Version**
   ```json
   {
     "version": "1.0.4",  // Increment version
     "attributes": [...]
   }
   ```

4. **Rebuild SDK**
   ```bash
   pnpm --filter @ropi-aoss/sdk build
   ```

5. **Sync to Firestore**
   ```bash
   pnpm api:sync:attributes
   ```

6. **Verify**
   - Check Firestore: `settings/attributes/keys/new_field` exists
   - Check Firestore: `settings/attributes/meta.registry_version` matches JSON
   - Open Product Editor and verify new field appears

## Validation Rules

### Server-Side Validation

All product attribute updates go through `PATCH /api/products/:productId/attributes`, which:

1. **Validates attribute exists** — Rejects undefined attribute keys
2. **Validates data type** — Ensures value matches `data_type`
3. **Validates enums** — Checks value is in `allowed_values` (if `allow_custom_values` is false)
4. **Enforces required fields** — Blocks completion if required attributes are missing

### Client-Side Validation

The web UI performs real-time validation:
- Input type matching (number inputs for `number` types)
- Dropdown/select for `enum` types
- Date pickers for `date` types
- Autocomplete with suggestions from registry

## Security & Access Control

### Direct Firestore Writes Blocked

Firestore rules **prevent direct client writes** to the `products` collection:

```javascript
// firestore.rules
match /products/{productId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && (isAdmin() || isAdminViaMetadata());
}
```

All product updates must go through the API, which validates against the registry.

### Attribute Registry Collection

The registry itself (`settings/attributes/keys`) is read-only from clients:

```javascript
match /settings/attributes/keys/{attributeId} {
  allow read: if request.auth != null;
  allow write: if false; // Only server can write
}
```

## Firestore Schema

### `settings/attributes/keys/{attributeId}`

```javascript
{
  attribute_id: "sku",
  label: "SKU",
  data_type: "text",
  category: "sku_core",
  required_for_completion: true,
  required_for_export: true,
  import_required: false,
  status: "active",
  // ... other fields from registry
  
  // System metadata (added by sync)
  definition_version: "1.0.3",
  syncedAt: "2025-12-29T10:00:00.000Z",
  syncedBy: "system:deploy"
}
```

### `settings/attributes/meta`

```javascript
{
  registry_version: "1.0.3",
  registry_source: "json",
  git_sha: "abc123...",
  lastSyncedAt: "2025-12-29T10:00:00.000Z",
  lastSyncedBy: "system:deploy",
  totalAttributes: 818
}
```

## Version Management

The registry uses semantic versioning:

- **Major** (1.x.x) — Breaking changes (removed attributes, changed types)
- **Minor** (x.1.x) — New attributes, backward-compatible changes
- **Patch** (x.x.1) — Fixes, clarifications, metadata updates

**Current Version:** Check [`packages/sdk/config/attributeRegistry.json`](../packages/sdk/config/attributeRegistry.json)

## Troubleshooting

### Registry not syncing to Firestore

1. **Check registry file exists:**
   ```bash
   ls -la packages/sdk/config/attributeRegistry.json
   ```

2. **Check registry version:**
   ```bash
   jq -r '.version' packages/sdk/config/attributeRegistry.json
   ```

3. **Run sync manually:**
   ```bash
   pnpm api:sync:attributes
   ```

4. **Check Firestore meta:**
   - Open Firebase Console
   - Navigate to Firestore → `settings/attributes/meta`
   - Verify `registry_version` matches local file

### Attributes not appearing in UI

1. **Check attribute status:**
   - Ensure `status: "active"` (not "hidden" or "deprecated")

2. **Refresh UI:**
   - The web app caches attributes; hard refresh may be needed

3. **Check Firestore rules:**
   - Ensure authenticated users can read `settings/attributes/keys`

### Import validation failing

1. **Check `import_required` fields:**
   - MPN is required by default (see `import_required: true`)

2. **Check `import_strict` flag:**
   - If true, invalid values will reject entire import

3. **Check CSV column names:**
   - Must match `external_header` or be in `synonyms` list

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Service account and sync during deploy
- [DEV-SETUP.md](DEV-SETUP.md) — Local development setup
- [API Endpoints](../packages/api/src/endpoints/admin/settings.ts) — Attribute CRUD operations
- [Product Schema](../packages/sdk/src/schema/product.ts) — Product data model

## References

- **Notion Spec:** Section 2.2 — Attribute Validation Schema
- **Firestore Path:** `settings/attributes/keys/{attributeId}`
- **Sync Script:** `packages/api/src/tasks/syncAttributeRegistry.ts`
- **SDK Export:** `packages/sdk/src/registry/index.ts`
