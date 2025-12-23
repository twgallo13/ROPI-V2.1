# Import Engine — Row Schema (Section 3.1)

[Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

**Section 3.1 — Import Engine — Row Schema**

This section defines the **canonical row schema** used by the AOSS Import Engine. It describes how a single raw row from a CSV / spreadsheet / external feed:

1. Enters the system as a **Raw Input Row**
2. Becomes a **Normalized Row** via Section 3.2 rules
3. Is wrapped into an **Import Engine Row** that holds normalized data, source data, and warnings/errors

This row schema is the "spine" that connects:

- External vendor data →
- Normalization Rules (Section 3.2) →
- Product Schema (Section 2.1) →
- Attribute Validation (Section 2.2) →
- Domain Rules (Section 2.3)

**3.1.0 Goals & responsibilities**

**Goals**

- Provide a single, consistent contract for all import rows, regardless of vendor or file format.
- Make it easy to debug any imported product by inspecting a single row document.
- Cleanly separate `raw` vs `normalized` vs `meta` so you can see exactly what changed.
- Ensure downstream code (validation, product creation, smart rules) never has to guess about types.

**Responsibilities of the Import Engine Row schema**

**3.1.0.1 Import Row Schema — JSON**

The following JSON defines the canonical row schema covering all core, attribute, pricing, RICS, tax, and override fields used in the Product Editor:

> **Export Use:**
> 

> The Export Manager reuses this row schema's `name` fields as CSV headers.
> 

> See [RetailOps CSV Field Mapping](RetailOps%20CSV%20Field%20Mapping%20348d1e671b7b407d984ec243a02981d1.md) for export usage.
> 

```json
{
  "version": "1.0.0",
  "row_schema": {
    "columns": [
      { "name": "SKU",                     "maps_to": "sku",                   "required": true },
      { "name": "StyleID",                 "maps_to": "styleId",               "required": false },
      { "name": "MPN",                     "maps_to": "mpn",                   "required": true },
      { "name": "ProductName",             "maps_to": "name",                  "required": true },
      { "name": "Slug",                    "maps_to": "slug",                  "required": false },

      { "name": "Brand",                   "maps_to": "brand",                 "required": true },
      { "name": "Category",                "maps_to": "category",              "required": true },
      { "name": "Class",                   "maps_to": "class",                 "required": true },
      { "name": "Department",              "maps_to": "department",            "required": true },

      { "name": "Websites",                "maps_to": "website",               "required": true,  "type": "multi_select", "delimiter": "|" },
      { "name": "ProductIsActive",         "maps_to": "productIsActive",       "required": false, "default": true },

      { "name": "LaunchDate",              "maps_to": "launchDate",            "required": false },
      { "name": "KLPostDate",              "maps_to": "klPostDate",            "required": false },
      { "name": "FamilySizing",            "maps_to": "familySizing",          "required": false },
      { "name": "Hype",                    "maps_to": "hype",                  "required": false },

      { "name": "FirstReceived",           "maps_to": "firstReceived",         "required": false },
      { "name": "LastReceived",            "maps_to": "lastReceived",          "required": false },

      { "name": "Height",                  "maps_to": "height",                "required": false },
      { "name": "Length",                  "maps_to": "length",                "required": false },
      { "name": "Width",                   "maps_to": "width",                 "required": false },
      { "name": "Weight",                  "maps_to": "weight",                "required": false },

      { "name": "Gender",                  "maps_to": "gender",                "required": false },
      { "name": "AgeGroup",                "maps_to": "ageGroup",              "required": false },

      { "name": "PrimaryColor",            "maps_to": "primaryColor",          "required": false },
      { "name": "DescriptiveColor",        "maps_to": "descriptiveColor",      "required": false },

      { "name": "Material",                "maps_to": "material",              "required": false },
      { "name": "OutsoleMaterial",         "maps_to": "outsoleMaterial",       "required": false },
      { "name": "ClosureType",             "maps_to": "closureType",           "required": false },
      { "name": "CutType",                 "maps_to": "cutType",               "required": false },
      { "name": "Fit",                     "maps_to": "fit",                   "required": false },
      { "name": "HeelHeight",              "maps_to": "heelHeight",            "required": false },
      { "name": "PlatformHeight",          "maps_to": "platformHeight",        "required": false },
      { "name": "HeelType",                "maps_to": "heelType",              "required": false },
      { "name": "ShoeHeightMap",           "maps_to": "shoeHeightMap",         "required": false },
      { "name": "MadeIn",                  "maps_to": "madeIn",                "required": false },
      { "name": "League",                  "maps_to": "league",                "required": false },
      { "name": "SportsTeam",              "maps_to": "sportsTeam",            "required": false },

      { "name": "CollectionName",          "maps_to": "collectionName",        "required": false },
      { "name": "FastFashion",             "maps_to": "fastFashion",           "required": false },
      { "name": "TaxClass",                "maps_to": "taxClass",              "required": false, "default": "Taxable Goods" },

      { "name": "RICS_LongDesc",           "maps_to": "ricsLongDesc",          "required": false, "usage": "reference_only" },
      { "name": "RICS_ShortDesc",          "maps_to": "ricsShortDescription",  "required": false, "usage": "reference_only" },

      { "name": "MAP",                     "maps_to": "map",                   "required": false },
      { "name": "SCOM_RegularPrice",       "maps_to": "scomRegularPrice",      "required": false },
      { "name": "SCOM_SalePrice",          "maps_to": "scomSalePrice",         "required": false },
      { "name": "Promo",                   "maps_to": "promo",                 "required": false },

      { "name": "StdShipOverride",         "maps_to": "standardShippingOverride",   "required": false },
      { "name": "ExpeditedShipOverride",   "maps_to": "expeditedOverrideShipping",  "required": false },

      { "name": "TotalInv",                "maps_to": "totalInv",              "required": false },
      { "name": "WarehouseInv",            "maps_to": "warehouseInv",          "required": false },
      { "name": "StoreInv",                "maps_to": "storeInv",              "required": false }
    ]
  }
}
```

**Key Notes:**

- **RICS fields** (`RICS_LongDesc`, `RICS_ShortDesc`) are marked as `usage: "reference_only"` and are never exported.
- **Website** is a multi-select field using `|` as the delimiter.
- **TaxClass** defaults to `"Taxable Goods"` when blank.

---

**Responsibilities of the Import Engine Row schema**

- Represent one "candidate product row" after parsing and normalization.
- Retain original source data for support/debugging.
- Collect warnings and errors related to normalization and validation.
- Link clearly to a future or existing `products/{productId}` document.

**3.1.1 Row-level contracts (high-level shape)**

An **Import Engine Row** is a JSON object:

```
{
  "rowId": "import-2025-11-30-000123",
  "batchId": "batch-2025-11-30-shiekh-main",
  "source": { /* raw source data */ },
  "normalized": { /* normalized values */ },
  "validation": { /* validation state */ },
  "meta": { /* bookkeeping / routing */ }
}
```

Each part is described in the following sections.

**3.1.2 `source` object — raw values from vendor**

The `source` object holds **exactly what we received** from the import file / feed, with minimal structure added. It is **never mutated** after initial parse.

**Example**

```
"source": {
  "rawRowNumber": 42,
  "fileName": "nike-foamposites.csv",
  "feedName": "NikeMasterFeed",
  "columns": {
    "SKU": "nk-foam-001 ",
    "Brand": "NIKE",
    "Title": "AIR FOAMPOSITE PRO PEARL",
    "Gender": "mens",
    "Categories": "Mens;Basketball;Footwear",
    "RetailPrice": "$249.99",
    "ReleaseDate": "2025-11-30",
    "IsActive": "yes"
  }
}
```

**Rules**

- `columns` is a map of header → raw string value.
- No normalization is done in `source.columns` beyond:
    
    ◦ Guarantee presence of all headers (missing ones use `""` or `null` as appropriate).
    
- This is the "truth" for support when a partner says "that's not what we sent."

**3.1.3 `normalized` object — after Section 3.2 rules**

The `normalized` object holds the **canonical, typed representation** of all relevant attributes, after applying the **Import Normalization Rules (Section 3.2)** and mapping to the **Product Schema (Section 2.1)**.

**Example**

```
"normalized": {
  "sku": "NK-FOAM-001",
  "brand": "Nike",
  "title": "Air Foamposite Pro Pearl",
  "gender": "Men",
  "categories": ["Footwear", "Basketball"],
  "retail_price": {
    "amount": 249.99,
    "currency": "USD"
  },
  "release_date": "2025-11-30T00:00:00.000Z",
  "is_active": true
}
```

**Notes**

- Values here are **already cleaned and normalized** via Section 3.2 (trimming, case, money, enums, dates, booleans).
- Field names are aligned with **Product Schema (Section 2.1)** — they are the same keys that will exist on `products/{id}`.
- For multi-site attributes or advanced attributes, the schema simply expands as needed with additional keys (e.g., `siteOverrides.shiekh.price` etc.) as defined in Section 2.1.

**3.1.4 `validation` object — status & field-level issues**

The `validation` object captures the **results of schema and business validation** applied after normalization.

**Core fields**

```
"validation": {
  "status": "pending|valid|invalid",
  "errors": [
    {
      "field": "gender",
      "code": "UNKNOWN_ENUM",
      "message": "Value 'adult' is not a valid gender.",
      "severity": "error"
    }
  ],
  "warnings": [
    {
      "field": "categories",
      "code": "PARTIAL_MATCH",
      "message": "Category 'Mens Shoes' mapped to 'Footwear'.",
      "severity": "warning"
    }
  ],
  "lastValidatedAt": "2025-11-30T02:15:00.000Z"
}
```

**Rules**

- `status` is:
    
    ◦ `pending` — normalization done, validation not yet run.
    
    ◦ `valid` — all required attributes satisfied per Section 2.2.
    
    ◦ `invalid` — at least one required attribute failed validation.
    
- `errors` and `warnings` reference **normalized** field names (e.g., `gender`, `categories`, `retail_price`).
- Codes like `MISSING_REQUIRED`, `UNKNOWN_ENUM`, `INVALID_FORMAT` are defined in the Validation Schema (Section 2.2).

**3.1.5 `meta` object — bookkeeping & routing**

The `meta` object holds operational details about the row.

**Example**

```
"meta": {
  "productId": "NK-FOAM-001", 
  "matchedExistingProduct": true,
  "existingProductRef": "products/NK-FOAM-001",
  "importedAt": "2025-11-30T02:00:00.000Z",
  "importedBy": "system:importer",
  "sourceSystem": "nike_master_feed",
  "site": "shiekh",
  "rowHash": "sha256:abcd1234...",
  "version": 1
}
```

**Responsibilities**

- Record whether this row:
    
    ◦ Creates a new product
    
    ◦ Updates an existing product
    
- Provide traceability to the originating system (`sourceSystem`) and file.
- Allow deduplication via `rowHash`.
- Allow versioning of re-imported rows (`version` increments when same SKU is re-imported in a later batch).

**3.1.6 Full Import Engine Row example**

Putting it all together:

```
{
  "rowId": "import-2025-11-30-000123",
  "batchId": "batch-2025-11-30-shiekh-main",
  "source": {
    "rawRowNumber": 42,
    "fileName": "nike-foamposites.csv",
    "feedName": "NikeMasterFeed",
    "columns": {
      "SKU": "nk-foam-001 ",
      "Brand": "NIKE",
      "Title": "AIR FOAMPOSITE PRO PEARL",
      "Gender": "mens",
      "Categories": "Mens;Basketball;Footwear",
      "RetailPrice": "$249.99",
      "ReleaseDate": "2025-11-30",
      "IsActive": "yes"
    }
  },
  "normalized": {
    "sku": "NK-FOAM-001",
    "brand": "Nike",
    "title": "Air Foamposite Pro Pearl",
    "gender": "Men",
    "categories": ["Footwear", "Basketball"],
    "retail_price": { "amount": 249.99, "currency": "USD" },
    "release_date": "2025-11-30T00:00:00.000Z",
    "is_active": true
  },
  "validation": {
    "status": "valid",
    "errors": [],
    "warnings": [
      {
        "field": "categories",
        "code": "PARTIAL_MATCH",
        "message": "Category 'Mens;Basketball;Footwear' normalized into ['Footwear','Basketball']",
        "severity": "warning"
      }
    ],
    "lastValidatedAt": "2025-11-30T02:15:00.000Z"
  },
  "meta": {
    "productId": "NK-FOAM-001",
    "matchedExistingProduct": true,
    "existingProductRef": "products/NK-FOAM-001",
    "importedAt": "2025-11-30T02:00:00.000Z",
    "importedBy": "system:importer",
    "sourceSystem": "nike_master_feed",
    "site": "shiekh",
    "rowHash": "sha256:abcd1234...",
    "version": 1
  }
}
```

**3.1.7 Relationship to Product Schema (Section 2.1)**

- All keys under `normalized` must align with the **Product Schema** in Section 2.1. For example:
    
    ◦ `normalized.sku` → `products/{id}.sku`
    
    ◦ `normalized.brand` → `products/{id}.brand`
    
    ◦ `normalized.retail_price` → `products/{id}.pricing.retail_price` (if nested per schema)
    
- The Import Engine **does not decide final nesting**. Instead, a later mapping step (product upsert) uses the row's normalized values + mapping config to build the final `products/{id}` object.
- The Import Engine Row is therefore the **staging representation**, not necessarily identical to the final product doc. But names should be as close as reasonably possible to final schema to reduce cognitive load.

**3.1.8 Lifecycle of an Import Engine Row**

1. **Parse step**
    
    ◦ Read CSV/Excel row.
    
    ◦ Build `source` object with `columns`, `rawRowNumber`, `fileName`, etc.
    
    ◦ Assign `rowId`, `batchId`, `meta.sourceSystem`, [`meta.site`](http://meta.site).
    
2. **Normalization step**
    
    ◦ Apply **Section 3.2** rules to build `normalized`.
    
    ◦ Collect any normalization warnings (e.g., unknown enum → `null`) and attach to `validation.warnings` as informational messages.
    
3. **Validation step**
    
    ◦ Apply **Section 2.2** Validation Schema and **Section 2.3** domain rules.
    
    ◦ Set `validation.status` to `valid` or `invalid`.
    
    ◦ Populate `validation.errors` and `validation.warnings`.
    
4. **Routing / upsert step**
    
    ◦ Use `meta.productId` and `meta.matchedExistingProduct` to decide:
    
    ▪ Create new product doc
    
    ▪ Update existing product doc
    
    ◦ If `validation.status = 'valid'`, row is eligible to be applied.
    
    ◦ If `validation.status = 'invalid'`, row remains in import queue for user review.
    
5. **Logging and metrics**
    
    ◦ Import pipeline logs the final `validation.status` and critical errors for monitoring.
    
    ◦ Section 11 defines the observability and KPIs for import success/failure rates.
    

**3.1.9 Minimal vs extended schemas**

The row schema above shows a **minimal set** of fields. Real implementations may include additional:

- Per-site overrides (e.g., `normalized.siteOverrides[site].price`)
- Vendor-specific metadata (`meta.vendorRef`, `source.vendorPayload`)
- Extended tracking fields (e.g., `meta.firstSeenAt`, `meta.lastSeenAt`)

**Rules**

- Any extension must live under `source.*`, `normalized.*`, `validation.*`, or `meta.*`.
- Extensions **must not** break the core meaning of these top-level keys.
- All extensions should be documented either here (3.1.x) or in the Appendix (Section 14).

**Navigation**

- ← Back to [Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)
- ← Back to [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)
- All extensions should be documented either here (3.1.x) or in the Appendix (Section 14).

---

### Cross-Link: Import Settings

Import behavior is governed by Import Settings (`/app/settings/import-settings`).

These settings override default behavior for:

- Missing columns
- Normalization rules
- Error handling
- Smart Rule execution
- Default mappings

See "Admin UI Build Spec — Settings CRUD", Section 6 — Import Settings.

---

**Navigation**

- ← Back to [Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)
- ← Back to [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

**3.1.10 Smart Rules Execution in Import (Updated Reference)**

After normalization (Section 3.2) and before validation (Section 2.2), Smart Rules (Section 4 — Part 1 for behavior, Part 2 for rule definitions) evaluate both source.* and normalized.* fields.

During import:

- Smart Rules may auto-apply values to eligible empty fields that are marked requiredForExport in the Product Schema (Section 2.1).
- Suggestion-only rules generate pending suggestions stored with the product for later review in W1/W2.
- Conflicts are created if multiple rules propose different values for the same attribute.
- All Smart Rules outputs respect the user-protection and precedence rules defined in Section 4; they never overwrite human-edited values.

Smart Rules never modify raw vendor data (source.*), ensuring full auditability of the original feed row.

---

**Navigation**

- ← Back to [Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)
- ← Back to [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)
- ← Back to [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

---

### 3.1.x Cross-Link: Where Imported Products Go Next

Once rows are successfully mapped into product documents using this schema, they are completed via:

- **Workflow W2 — Full Product Completion (One-Person Process)** [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)
- The unified Product Editor (Section 7.3) and Export Readiness sidebar (Section 7.5.4)

Think of Section 3.1 / 3.2 as defining "how products arrive," and W2 as defining "how products are finished."