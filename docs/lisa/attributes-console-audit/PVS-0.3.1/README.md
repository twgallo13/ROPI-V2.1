# PVS-0.3.1 Mapping API Documentation

## Overview

The Mapping API provides header aliases, value synonyms, and per-source overrides for attribute data transformation during imports.

### Two-Layer Architecture

1. **Global Mapping** (`settings/attribute_mappings/global`)
   - Centralized aliases and synonyms
   - Quick lookups for common transformations
   - Applies to all attributes unless overridden

2. **Attribute-Level Mapping** (`settings/attributes/keys/{attribute_id}/mapping`)
   - Per-attribute customization
   - Source-specific overrides
   - Higher precedence than global

### Precedence Order

```
Source-specific → Attribute-level → Global
(highest)                         (lowest)
```

---

## Firestore Schema

### Global Mapping Document

**Path:** `settings/attribute_mappings/global`

```json
{
  "aliases": {
    "VendorColumnName": "canonical.attribute_id",
    "colour": "primary_color",
    "Product Color": "primary_color"
  },
  "value_synonyms": {
    "primary_color": {
      "Black": ["blk", "noir", "schwarz"],
      "White": ["wht", "blanc", "weiss"],
      "Navy": ["navy blue", "nav"]
    },
    "size": {
      "Small": ["sm", "s"],
      "Medium": ["md", "m"],
      "Large": ["lg", "l", "lrg"]
    }
  },
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "updatedBy": "user-123"
}
```

### Attribute-Level Mapping Document

**Path:** `settings/attributes/keys/{attribute_id}/mapping`

```json
{
  "aliases": {
    "My Custom Color": "primary_color"
  },
  "value_synonyms": {
    "Black": ["dark", "onyx"],
    "Red": ["crimson", "scarlet"]
  },
  "sources": {
    "vendorA": {
      "aliases": {
        "VendorA_Color_Code": "primary_color"
      },
      "value_synonyms": {
        "Black": ["BLK-001"],
        "White": ["WHT-001"]
      }
    },
    "vendorB": {
      "value_synonyms": {
        "Black": ["B", "BK"]
      }
    }
  },
  "updatedAt": "2024-01-15T11:00:00.000Z",
  "updatedBy": "user-456"
}
```

---

## API Endpoints

### Global Mapping

#### GET /api/admin/settings/mappings

Returns the global mapping document.

**Response:**
```json
{
  "aliases": { ... },
  "value_synonyms": { ... },
  "updatedAt": "...",
  "updatedBy": "..."
}
```

#### PUT /api/admin/settings/mappings

Update global mapping with merge or replace semantics.

**Query Parameters:**
- `merge` (boolean, default: true) - Merge with existing or full replace

**Request Body:**
```json
{
  "aliases": {
    "New Header": "target_attribute"
  },
  "value_synonyms": {
    "target_attribute": {
      "Canonical": ["syn1", "syn2"]
    }
  },
  "reason": "Adding vendor X mappings"
}
```

**Response:** Updated mapping document

---

### Attribute-Level Mapping

#### GET /api/admin/settings/attributes/{id}/mapping

Get merged mapping view for an attribute.

**Query Parameters:**
- `source` (string, optional) - Source ID for source-specific resolution
- `raw` (boolean, default: false) - Return raw attribute mapping without merge

**Response (merged):**
```json
{
  "aliases": { ... },
  "value_synonyms": { ... },
  "source": "vendorA",
  "precedence": "source"
}
```

#### PUT /api/admin/settings/attributes/{id}/mapping

Update attribute-level mapping.

**Query Parameters:**
- `merge` (boolean, default: true) - Merge with existing or full replace

**Request Body:**
```json
{
  "aliases": {
    "Custom Header": "attribute_id"
  },
  "value_synonyms": {
    "Black": ["custom-black"]
  },
  "reason": "Customer-specific mapping"
}
```

#### DELETE /api/admin/settings/attributes/{id}/mapping

Delete attribute-level mapping (preserves source overrides by default).

**Request Body:**
```json
{
  "reason": "Resetting to global defaults"
}
```

---

### Source Overrides

#### GET /api/admin/settings/attributes/{id}/mapping/sources

List all sources with overrides.

**Response:**
```json
{
  "sources": ["vendorA", "vendorB"],
  "overrides": {
    "vendorA": { "aliases": {...}, "value_synonyms": {...} },
    "vendorB": { "value_synonyms": {...} }
  }
}
```

#### GET /api/admin/settings/attributes/{id}/mapping/sources/{sourceId}

Get a specific source override.

#### PUT /api/admin/settings/attributes/{id}/mapping/sources/{sourceId}

Upsert a source-specific override.

**Request Body:**
```json
{
  "aliases": {
    "Vendor_Specific_Header": "attribute_id"
  },
  "value_synonyms": {
    "Black": ["VENDOR-BLK"]
  },
  "reason": "Vendor A uses custom codes"
}
```

#### DELETE /api/admin/settings/attributes/{id}/mapping/sources/{sourceId}

Delete a source-specific override.

---

### Import Preview

#### POST /api/admin/imports/preview

Preview import transformation with mapping application.

**Request Body:**
```json
{
  "sampleRows": [
    { "VendorColor": "blk", "Size": "sm", "Unknown_Col": "value" },
    { "VendorColor": "wht", "Size": "lg", "Unknown_Col": "other" }
  ],
  "sourceId": "vendorA",
  "mappingOverrides": {
    "aliases": {
      "VendorColor": "primary_color"
    },
    "value_synonyms": {
      "primary_color": {
        "Black": ["blk"],
        "White": ["wht"]
      }
    }
  }
}
```

**Response:**
```json
{
  "transformedRows": [
    {
      "attributes": { "primary_color": "Black", "size": "Small" },
      "unmappedHeaders": ["Unknown_Col"],
      "synonymsApplied": [
        { "attribute": "primary_color", "original": "blk", "canonical": "Black" },
        { "attribute": "size", "original": "sm", "canonical": "Small" }
      ]
    },
    {
      "attributes": { "primary_color": "White", "size": "Large" },
      "unmappedHeaders": ["Unknown_Col"],
      "synonymsApplied": [
        { "attribute": "primary_color", "original": "wht", "canonical": "White" },
        { "attribute": "size", "original": "lg", "canonical": "Large" }
      ]
    }
  ],
  "summary": {
    "totalRows": 2,
    "totalUnmappedHeaders": 1,
    "uniqueUnmappedHeaders": ["Unknown_Col"],
    "totalSynonymsApplied": 4
  },
  "truncated": false,
  "originalRowCount": 2
}
```

---

## Merge Semantics

### Default: Merge Mode (`merge=true`)

When updating mappings, new keys are added and existing arrays are merged:

**Before:**
```json
{
  "aliases": { "Color": "primary_color" },
  "value_synonyms": {
    "Black": ["blk"]
  }
}
```

**Update:**
```json
{
  "aliases": { "Colour": "primary_color" },
  "value_synonyms": {
    "Black": ["noir"],
    "White": ["wht"]
  }
}
```

**After:**
```json
{
  "aliases": { "Color": "primary_color", "Colour": "primary_color" },
  "value_synonyms": {
    "Black": ["blk", "noir"],
    "White": ["wht"]
  }
}
```

### Replace Mode (`merge=false`)

Full replacement of the mapping:

**Before:** (same as above)

**Update with `?merge=false`:**
```json
{
  "aliases": { "Colour": "primary_color" },
  "value_synonyms": {
    "White": ["wht"]
  }
}
```

**After:**
```json
{
  "aliases": { "Colour": "primary_color" },
  "value_synonyms": {
    "White": ["wht"]
  }
}
```

---

## Validation Rules

### Aliases

1. Alias keys must be strings (header names)
2. Alias values must map to existing registered attribute IDs
3. Invalid canonical IDs return 400 with helpful message

### Value Synonyms

1. Canonical values are the keys
2. Synonyms are arrays of strings
3. Duplicates within an attribute are not allowed (case-insensitive)
4. Warnings are logged (not errors) if canonical values don't match `allowed_values`

---

## Audit Trail

All mapping mutations create audit events:

**Path:** `settings/attributes/keys/{attribute_id}/auditEvents/{event_id}`

For global mappings, `attribute_id` is `_global_mapping`.

**Event Shape:**
```json
{
  "event_id": "m4xyz_abc123",
  "attribute_id": "primary_color",
  "actor": "user-123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "action": "mapping_update",
  "before": { "aliases": {...} },
  "after": { "aliases": {...} },
  "reason": "Added vendor B synonyms",
  "context": {
    "source": "api",
    "scope": "attribute",
    "sourceId": "vendorB"
  }
}
```

---

## Security

- All mapping endpoints require `admin` role
- Use existing `requireAdmin` middleware
- Rate limiting recommended for production

---

## How It Works (UI Summary)

The Mapping tab in the Attribute Editor allows you to:

1. **View Current Mappings** - See which headers and values map to this attribute
2. **Add Header Aliases** - Map vendor-specific column names to canonical attributes
3. **Define Value Synonyms** - Map variant spellings/codes to canonical values
4. **Source Overrides** - Configure per-vendor customizations
5. **Test Mappings** - Preview transformations on sample data before import

Changes are tracked in the audit trail and can be reverted if needed.

---

## Examples

### Example 1: Add a Simple Alias

```bash
curl -X PUT /api/admin/settings/mappings \
  -H "Content-Type: application/json" \
  -d '{
    "aliases": {
      "Product Colour": "primary_color"
    },
    "reason": "UK spelling support"
  }'
```

### Example 2: Add Value Synonyms for an Attribute

```bash
curl -X PUT /api/admin/settings/attributes/primary_color/mapping \
  -H "Content-Type: application/json" \
  -d '{
    "value_synonyms": {
      "Black": ["noir", "schwarz", "nero"],
      "White": ["blanc", "weiss", "bianco"]
    },
    "reason": "Multi-language support"
  }'
```

### Example 3: Configure Vendor-Specific Overrides

```bash
curl -X PUT /api/admin/settings/attributes/primary_color/mapping/sources/vendorA \
  -H "Content-Type: application/json" \
  -d '{
    "value_synonyms": {
      "Black": ["BLK-001", "COLOR-BLACK"],
      "White": ["WHT-001", "COLOR-WHITE"]
    },
    "reason": "Vendor A uses product codes"
  }'
```

### Example 4: Test Import Transformation

```bash
curl -X POST /api/admin/imports/preview \
  -H "Content-Type: application/json" \
  -d '{
    "sampleRows": [
      {"Product Colour": "noir", "Size": "sm"}
    ],
    "sourceId": "vendorA"
  }'
```

**Response:**
```json
{
  "transformedRows": [{
    "attributes": {
      "primary_color": "Black",
      "size": "Small"
    },
    "unmappedHeaders": [],
    "synonymsApplied": [
      {"attribute": "primary_color", "original": "noir", "canonical": "Black"},
      {"attribute": "size", "original": "sm", "canonical": "Small"}
    ]
  }],
  "summary": {
    "totalRows": 1,
    "totalUnmappedHeaders": 0,
    "uniqueUnmappedHeaders": [],
    "totalSynonymsApplied": 2
  }
}
```
