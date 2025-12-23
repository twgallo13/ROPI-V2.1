# Product Schema — JSON (Section 2.1)

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

# Section 2.1 — Product Schema — JSON

This page defines the canonical product document shape used by ROPI for a single product (one MPN).

All attributes are MPN-level. SKUs are stored only as reference strings and for RO export.

- One product document represents **one MPN**.
- SKUs are stored as a simple array of strings.
- Exactly one `exportSku` is used when exporting to RO.
- Attribute values are stored in an `attributes` object, keyed by attribute `id` from the Attribute Registry.

---

## 2.1.1 Ropi Product JSON Schema (base)

```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "title": "Ropi AOSS Product",
  "type": "object",
  "required": ["sku", "mpn", "name", "brand", "category", "class", "department", "website"],
  "properties": {
    "sku": { "type": "string", "description": "Primary SKU / item id" },
    "styleId": { "type": "string", "description": "Vendor or internal style id" },
    "mpn": { "type": "string", "description": "Manufacturer part number" },
    "name": { "type": "string", "description": "Product name as displayed on site" },
    "slug": { "type": "string", "description": "URL slug for primary website" },

    "brand": { "type": "string" },
    "category": { "type": "string" },
    "class": { "type": "string" },
    "department": { "type": "string" },

    "website": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Multi-select sites (e.g. Shiekh, Karmaloop, MLTD, Sangremia)"
    },

    "productIsActive": { "type": "boolean", "default": true },
    "status": { "type": "string", "description": "Internal status (Draft, Ready, Exported, etc.)" },

    "launchDate": { "type": ["string", "null"], "format": "date", "description": "Public launch date (if launch product)" },
    "klPostDate": { "type": ["string", "null"], "format": "date", "description": "Karmaloop post date (if applicable)" },
    "familySizing": { "type": ["string", "null"], "description": "Family sizing grouping text" },
    "hype": { "type": ["boolean", "null"], "description": "Flags high-interest / hype products" },
    "firstReceived": { "type": ["string", "null"], "format": "date-time" },
    "lastReceived": { "type": ["string", "null"], "format": "date-time" },

    "height": { "type": ["number", "null"], "description": "Package or product height" },
    "length": { "type": ["number", "null"], "description": "Package or product length" },
    "width": { "type": ["number", "null"], "description": "Package or product width" },
    "weight": { "type": ["number", "null"], "description": "Package or product weight" },

    "gender": { "type": ["string", "null"] },
    "ageGroup": { "type": ["string", "null"] },

    "primaryColor": { "type": ["string", "null"] },
    "descriptiveColor": { "type": ["string", "null"] },

    "material": { "type": ["string", "null"] },
    "outsoleMaterial": { "type": ["string", "null"] },
    "closureType": { "type": ["string", "null"] },
    "cutType": { "type": ["string", "null"] },
    "fit": { "type": ["string", "null"] },
    "heelHeight": { "type": ["string", "null"] },
    "platformHeight": { "type": ["string", "null"] },
    "heelType": { "type": ["string", "null"] },
    "shoeHeightMap": { "type": ["string", "null"] },
    "madeIn": { "type": ["string", "null"] },
    "league": { "type": ["string", "null"] },
    "sportsTeam": { "type": ["string", "null"] },

    "collectionName": { "type": ["string", "null"] },
    "fastFashion": { "type": ["boolean", "null"] },
    "taxClass": { "type": ["string", "null"], "description": "Taxable Goods, Non-taxable, etc." },

    "descriptionShiekh": { "type": ["string", "null"] },
    "descriptionKarmaloop": { "type": ["string", "null"] },
    "descriptionMltd": { "type": ["string", "null"] },
    "descriptionSangremia": { "type": ["string", "null"] },

    "metaName": { "type": ["string", "null"] },
    "metaDescription": { "type": ["string", "null"] },
    "keywords": { "type": ["string", "null"] },

    "ricsLongDesc": {
      "type": ["string", "null"],
      "description": "Imported RICS long description; reference-only, not exported"
    },
    "ricsShortDescription": {
      "type": ["string", "null"],
      "description": "Imported RICS short description; reference-only, not exported"
    },

    "mediaStatus": { "type": ["string", "null"], "description": "Overall media readiness state" },
    "hideImageDate": {
      "type": ["string", "null"],
      "format": "date",
      "description": "Date when images should no longer be shown on public site"
    },

    "map": { "type": ["number", "null"], "description": "Minimum advertised price" },
    "scomRegularPrice": { "type": ["number", "null"] },
    "scomSalePrice": { "type": ["number", "null"] },
    "promo": { "type": ["string", "null"], "description": "Promo flags or tags" },

    "standardShippingOverride": { "type": ["number", "null"] },
    "expeditedOverrideShipping": { "type": ["number", "null"] },

    "customMessage": {
      "type": ["string", "null"],
      "description": "Internal launch message shown in internal Launch Calendar views only"
    },

    "totalInv": { "type": ["number", "null"] },
    "warehouseInv": { "type": ["number", "null"] },
    "storeInv": { "type": ["number", "null"] }
  }
}
```

## 2.1.2 Notes

- `mpn` is the canonical identifier and is required for all products.
- `skus` is optional but recommended when exporting to RO.
- `exportSku` is optional on initial creation, but must be set before RO export. It should always be one of the entries in `skus`.
- `attributes` contains all attribute values (descriptive, launch, pricing, sku_core, source_metadata, technical) keyed by their `id` from the Attribute Registry.
- The Attribute Registry controls:
    - which attributes exist,
    - their types,
    - import/export behavior,
    - AI usage,
    - and whether they can be edited by users or AI.

Future steps will extend this schema to add:

- explicit typing for selected attributes,
- validation rules for exports,
- and links to Smart Rules and Observations.

## 2.1.3 Attribute value model

The `attributes` object stores values for all attributes defined in the Attribute Registry.

Each key in `attributes` is an attribute `id` from the registry (e.g., `ageGroup`, `primaryColor`, `material`, `map`, etc.).

Example shape:

```json
{
  "mpn": "ABC1234",
  "skus": ["ABC1234-BLK-8", "ABC1234-BLK-9"],
  "exportSku": "ABC1234-BLK-9",
  "attributes": {
    "ageGroup": "Adult",
    "gender": "Men",
    "primaryColor": "Black",
    "material": ["Leather", "Mesh"],
    "map": "89.99",
    "promo": true,
    "launchDate": "2025-02-15",
    "website": ["shiekh", "karmaloop"],
    "ricsLongDesc": "NIKE MENS AIR MAX 90 BLACK/WHITE...",
    "height": 5.0
  }
}
```

### 2.1.3.1 Value types by attribute dataType

Attribute value types are determined by the `dataType` field in the Attribute Registry:

- `text` → stored as a **string**
- `longText` → stored as a **string**
- `number` → stored as a **number**
- `boolean` → stored as a **boolean**
- `select` → stored as a **string** (one of the allowed options)
- `multiSelect` → stored as an **array of strings** (zero or more allowed options)
- `money` → stored as a **string** (e.g., `"89.99"`)
- `date` → stored as a **string** in ISO 8601 format (e.g., `"2025-02-15"`)

### 2.1.3.2 Behavior notes

- All attribute values live under `attributes` and are keyed by attribute `id` (not label).
- Multi-select attributes (e.g., `material`, `website`, `madeIn`) are always arrays of strings.
- Source-only attributes (from `source_metadata`) are stored under `attributes` like any other attribute but are treated as read-only by the UI and Smart Rules.
- Pricing and inventory-related attributes (e.g., `map`, `scomRegularPrice`, `storeInv`, `warehouseInv`) follow the same type rules and are also stored under `attributes`.

---

### 2.1.3.3 Custom Message Field

Each product document includes an optional `customMessage` field for internal notes:

```json
{
  "mpn": "ABC1234",
  "skus": ["ABC1234-BLK-8", "ABC1234-BLK-9"],
  "exportSku": "ABC1234-BLK-9",
  "customMessage": "Hot release! Feature on homepage hero banner. Coordinate with social team for launch day post.",
  "attributes": {
    "ageGroup": "Adult",
    "gender": "Men",
    "primaryColor": "Black"
  }
}
```

**Custom Message Specification:**

| Property | Value |
| --- | --- |
| **Field name** | `customMessage` |
| **Type** | `string` |
| **Max length** | 1000 characters |
| **Required** | No (optional) |
| **Exported to RO** | No |
| **Visible on website** | No |
| **Purpose** | Internal notes for merch, marketing, buyers |

**Use Cases:**

- Launch coordination notes ("Feature on homepage Nov 27")
- Marketing instructions ("Coordinate with social team")
- Buyer notes ("Reorder if sells through")
- Special handling ("Hold for VIP customer request")

**Note:** `customMessage` lives at the root level of the product document (alongside `mpn`, `skus`, `attributes`), not inside `attributes`, because it is operational metadata rather than a product attribute.

**Note:** `customMessage` lives at the root level of the product document (alongside `mpn`, `skus`, `attributes`), not inside `attributes`, because it is operational metadata rather than a product attribute.

**Ops Note:** Operational monitoring and runbooks related to product lifecycle and system status are defined in [**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md).

**Ops Note:** Operational monitoring and runbooks related to product lifecycle and system status are defined in [**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md).

---

### 2.1.x Launch Calendar — Drawing Mode

Add the following property to the `attributes` object in the Product schema:

```json
"drawing": {
  "type": "string",
  "enum": [
    "fcfs",
    "store_only",
    "web_only",
    "store_web",
    "token_set"
  ],
  "nullable": true,
  "description": "Launch calendar drawing mode. Used by internal Launch Calendar UI to indicate how access to the launch is handled. Not imported from external systems and not exported to RetailOps CSV."
}
```

**Semantics:**

- `"fcfs"` — First come, first serve (no drawing; normal release).
- `"store_only"` — Drawing / access is limited to in-store only.
- `"web_only"` — Drawing / access is limited to web only.
- `"store_web"` — Drawing / access may take place both in-store and on web.
- `"token_set"` — Indicates that the user setting up the launch has configured a token/drawing flow in Magento; AOSS treats this as an internal reminder flag.

This field:

- Is optional (`nullable: true`).
- Is used only by:
    - Product Editor Launch tab.
    - Internal Launch Calendar views (Section 7.2).
- Should not be included in Import Engine mappings (Section 3.1 / 3.2) or RetailOps export CSV (Section 7.2.5, Section 9.3.4).

---

---

### Navigation

← Previous: [Section 1 — Navigation & Page Index](Section%201%20%E2%80%94%20Navigation%20&%20Page%20Index%20eba3cfdc44fd49ef98c38b183642cc7b.md)

}

```

### Status Flags

The `statusFlags` object tracks validation and export-related state for the product. It is used by:

- Workflow W2 (Export Readiness)
- Export Manager (Section 7.2.5.x)
- Backend export logic (Section 9.3.4)

**statusFlags schema:**

```

"statusFlags": {

"type": "object",

"properties": {

"validation_status": {

"type": "string",

"enum": ["valid", "has_errors", "has_warnings"],

"description": "Overall validation state for this product."

},

"ready_for_export": {

"type": "boolean",

"default": false,

"description": "True when all blocking items are resolved and the product is ready for RetailOps export."

},

"completion_status": {

"type": "string",

"enum": ["draft", "in_progress", "complete"],

"description": "High-level completion status for W2."

},

"uploaded_to_ro": {

"type": "boolean",

"default": false,

"description": "True once this product has been included in a RetailOps CSV export and marked as uploaded (see Section 7.2.5.6 and Section 9.3.4)."

}

},

"additionalProperties": false

}

```

### RetailOps Export Metadata

These fields are set when a product is exported via the Export Manager and marked as uploaded to RetailOps (see Section 7.2.5.6 and Section 9.3.4). They are **system-managed** and not directly edited by users.

**Root-level schema properties:**

```

"roUploadBatchId": {

"type": "string",

"nullable": true,

"description": "Identifier of the export batch that last contained this product. Typically a UUID generated when the CSV is created (see Section 7.2.5.7)."

},

"roUploadDate": {

"type": "string",

"format": "date-time",

"nullable": true,

"description": "Timestamp (ISO 8601) of when this product was marked as uploaded to RetailOps."

}

```

These fields are set when:

- The user confirms upload in the Export Manager (Section 7.2.5.6), which applies:
	- `statusFlags.uploaded_to_ro = true`
	- `statusFlags.ready_for_export = false`
	- `roUploadDate = <timestamp>`
	- `roUploadBatchId = <uuid>`

### Export Eligibility
```

A product is eligible for export when:

- `validation_status = "valid"`
- `ready_for_export = true`
- `uploaded_to_ro = false`

After a product is included in a RetailOps CSV batch and the user confirms upload:

- `uploaded_to_ro` becomes `true`
- `roUploadBatchId` stores the batch ID
- `roUploadDate` stores the upload timestamp

### Important: Export Readiness Does Not Depend on Images

**Images, media status, and Launch Calendar presentation fields are not part of export readiness.** They do not affect RetailOps CSV export and do not block a product from being marked `ready_for_export`.

Export readiness is determined solely by:

- Core Information completeness (brand, name, mpn, sku, department, class, category, website)
- Product Attributes completeness (gender, ageGroup, primaryColor, taxClass)
- Descriptions & SEO completeness (per selected website)
- Validation status
- Resolution of blocking Observations and Smart Rules

These fields drive the Export Manager workflow defined in Section 7.2.5.

---

### Navigation

← Previous: [Section 1 — Navigation & Page Index](Section%201%20%E2%80%94%20Navigation%20&%20Page%20Index%20eba3cfdc44fd49ef98c38b183642cc7b.md)

→ Next: [Attribute Validation Schema — JSON (Section 2.2)](Attribute%20Validation%20Schema%20%E2%80%94%20JSON%20(Section%202%202)%202b845ee1ec5a805fba0ef665dfb17396.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})Notion/link_69265bd0a644819182985a79b1bea511/fetch",

"args": "{"id":"2b845ee1ec5a80078781eb8f6d9ac357"}"

}

-->