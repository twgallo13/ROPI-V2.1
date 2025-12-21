# Import Normalization Rules (Section 3.2)

[Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

**Section 3.2 — Import Normalization Rules**

This section defines the **normalization pipeline** that transforms raw import values (strings from CSV / spreadsheets / feeds) into **canonical, strongly-typed values** compatible with:

- **Section 3.1 — Import Engine — Row Schema**
- **Section 2.1 — Product Schema — JSON**
- **Section 2.2 — Attribute Validation Schema — JSON**
- **Section 2.3 — Attribute Domain Rules — JSON**

Normalization runs **before validation**, is **pure** (no external I/O), and must be **idempotent**: applying it multiple times yields the same result.

**3.2.0 Goals & invariants**

**Goals**

- Convert messy, feed-specific values into consistent, canonical values.
- Centralize all normalization rules in one place, not scattered across UI or exporters.
- Ensure downstream validation operates on predictable data types and formats.
- Preserve original raw data for debugging and vendor support.

**Invariants**

### 3.2 Import Normalization Rules — v1.0

The Import Engine converts each input row (Section 3.1) into a normalized product object (Section 2.1). The following rules apply:

```json
{
  "version": "1.0.0",
  "normalization": {
    "website": {
      "source_column": "Websites",
      "delimiter": "|",
      "trim": true,
      "map_values": {
        "Shiekh": "[Shiekh.com](http://Shiekh.com)",
        "[Shiekh.com](http://Shiekh.com)": "[Shiekh.com](http://Shiekh.com)",
        "Karmaloop": "Karmaloop",
        "KL": "Karmaloop",
        "MLTD": "MLTD",
        "Sangremia": "Sangremia"
      },
      "dedupe": true,
      "drop_empty": true
    },
    "taxClass": {
      "source_column": "TaxClass",
      "default": "Taxable Goods"
    },
    "booleans": {
      "FastFashion": {
        "maps_to": "fastFashion",
        "truthy": ["Y", "Yes", "true", "1"],
        "falsy": ["N", "No", "false", "0", ""]
      },
      "ProductIsActive": {
        "maps_to": "productIsActive",
        "truthy": ["Y", "Yes", "true", "1"],
        "falsy": ["N", "No", "false", "0", ""]
      },
      "Hype": {
        "maps_to": "hype",
        "truthy": ["Y", "Yes", "true", "1"],
        "falsy": ["N", "No", "false", "0", ""]
      }
    },
    "dates": {
      "LaunchDate":      { "maps_to": "launchDate",     "format": "YYYY-MM-DD" },
      "KLPostDate":      { "maps_to": "klPostDate",     "format": "YYYY-MM-DD" },
      "FirstReceived":   { "maps_to": "firstReceived",  "format": "YYYY-MM-DDTHH:mm:ss" },
      "LastReceived":    { "maps_to": "lastReceived",   "format": "YYYY-MM-DDTHH:mm:ss" },
      "HideImageDate":   { "maps_to": "hideImageDate",  "format": "YYYY-MM-DD" }
    },
    "numbers": {
      "Height":                  { "maps_to": "height",                  "allow_null": true },
      "Length":                  { "maps_to": "length",                  "allow_null": true },
      "Width":                   { "maps_to": "width",                   "allow_null": true },
      "Weight":                  { "maps_to": "weight",                  "allow_null": true },
      "MAP":                     { "maps_to": "map",                     "allow_null": true },
      "SCOM_RegularPrice":       { "maps_to": "scomRegularPrice",        "allow_null": true },
      "SCOM_SalePrice":          { "maps_to": "scomSalePrice",           "allow_null": true },
      "StdShipOverride":         { "maps_to": "standardShippingOverride","allow_null": true },
      "ExpeditedShipOverride":   { "maps_to": "expeditedOverrideShipping","allow_null": true },
      "TotalInv":                { "maps_to": "totalInv",                "allow_null": true },
      "WarehouseInv":            { "maps_to": "warehouseInv",            "allow_null": true },
      "StoreInv":                { "maps_to": "storeInv",                "allow_null": true }
    },
    "rics_reference": {
      "RICS_LongDesc":         { "maps_to": "ricsLongDesc",         "usage": "reference_only" },
      "RICS_ShortDesc":        { "maps_to": "ricsShortDescription", "usage": "reference_only" }
    },
    "text_passthrough": [
      { "source": "Gender",            "maps_to": "gender" },
      { "source": "AgeGroup",          "maps_to": "ageGroup" },
      { "source": "PrimaryColor",      "maps_to": "primaryColor" },
      { "source": "DescriptiveColor",  "maps_to": "descriptiveColor" },
      { "source": "Material",          "maps_to": "material" },
      { "source": "OutsoleMaterial",   "maps_to": "outsoleMaterial" },
      { "source": "ClosureType",       "maps_to": "closureType" },
      { "source": "CutType",           "maps_to": "cutType" },
      { "source": "Fit",               "maps_to": "fit" },
      { "source": "HeelHeight",        "maps_to": "heelHeight" },
      { "source": "PlatformHeight",    "maps_to": "platformHeight" },
      { "source": "HeelType",          "maps_to": "heelType" },
      { "source": "ShoeHeightMap",     "maps_to": "shoeHeightMap" },
      { "source": "MadeIn",            "maps_to": "madeIn" },
      { "source": "League",            "maps_to": "league" },
      { "source": "SportsTeam",        "maps_to": "sportsTeam" },
      { "source": "CollectionName",    "maps_to": "collectionName" },
      { "source": "Promo",             "maps_to": "promo" },
      { "source": "FamilySizing",      "maps_to": "familySizing" }
    ]
  }
}
```

**Key notes:**

- **RICS fields** are always imported but flagged as `reference_only` and never exported directly.
- **Website parsing** is the single source of truth for which site descriptions and AI actions are available.
- **Tax class** defaults to **Taxable Goods** when blank.

---

**Invariants**

- Never silently invent data. If a value cannot be normalized → return `null` or an explicit error flag, never "guess."
- Never drop the original raw value; store it under a `source.*` field when needed.
- Normalization is **deterministic** (no randomness, no time-of-day influence).
- Normalization is **idempotent** (re-running has no further effect).

**3.2.1 Base String Cleaning**

Applied to any raw string field **before** any type-specific normalization.

**Operations**

1. **Trim whitespace**
    
    ◦ Remove leading/trailing spaces, tabs, newlines.
    
    ◦ Collapse consecutive internal spaces to a single space if configured for that field.
    
2. **Control characters**
    
    ◦ Strip non-printable control characters.
    
3. **Unicode normalization**
    
    ◦ Normalize to NFC (canonical composition) to avoid weird accent variations.
    
4. **Empty to null**
    
    ◦ If, after trimming, string is empty → treat as `null` (unless field explicitly allows empty string).
    

**Example**

- Raw: `"  Pearl  \n"` → `"Pearl"`
- Raw: `"   "` → `null`

**3.2.2 Case Normalization**

Applied based on **attribute type** and **domain rules** (Section 2.3).

**Rules**

- **SKUs, IDs, codes**
    
    ◦ Normalize to **upper case**: `"abc-123"` → `"ABC-123"`
    
    ◦ Preserve dashes/underscores as-is.
    
- **Brands**
    
    ◦ Either:
    
    ▪ Use a case map from Attribute Domain Rules (e.g., `NIKE` → `Nike`), or
    
    ▪ Apply Title Case if no mapping exists and the field is configured for `brand-style`.
    
- **Freeform text (titles, descriptions)**
    
    ◦ No forced case normalization beyond base string cleaning (to avoid damaging natural language).
    
- **Enums / selects**
    
    ◦ Normalized via **Select Normalization** (3.2.4), not generic case rules.
    

**3.2.3 Multi-select Normalization**

For fields that map to **multi-select** attributes (e.g., tags, categories, materials):

**Input examples**

- `"Men; Basketball; Footwear"`
- `"men | basketball | footwear"`
- `"Men,Basketball,Footwear"`

**Steps**

1. **Split** on configured delimiters (`,`, `;`, `|`, `/` depending on field config).
2. **Trim & clean** each token using base string cleaning.
3. **Drop empties** (ignore empty tokens).
4. **Map to canonical values** via Attribute Domain Rules, e.g.:
    
    ◦ `"mens"` → `"Men"`
    
    ◦ `"MENS"` → `"Men"`
    
    ◦ `"Basketball Shoes"` → `"Basketball"`
    
5. **Deduplicate** final list while preserving order.
6. **Sort** if field is configured as `normalizedSorted: true`.

**Output**

- Always an **array of canonical strings**, e.g.:

`["Men", "Basketball", "Footwear"]`

**3.2.4 Select / Enum Normalization**

For **single-select** fields (size scale, gender, condition, etc.).

**Steps**

1. Base string cleaning.
2. Lowercase for matching: `"Mens"` → `"mens"`.
3. Look up in **Attribute Domain Rules** for that attribute, which defines:
    
    ◦ Allowed values (e.g., `["Men", "Women", "Unisex", "Kids"]`)
    
    ◦ Known synonyms (e.g., `"mens","male" → "Men"`).
    
4. If a match is found → return canonical value.
5. If no match:
    
    ◦ If attribute is **optional** → return `null` and add a warning to the import report.
    
    ◦ If **required** → mark field as `invalid` and attach a normalization error reason.
    

**Example**

- Raw: `"mens"` → canonical: `"Men"`
- Raw: `"adult"` with no mapping → `null` (optional) or error (required).

**3.2.5 Number Normalization**

For integer or decimal numeric attributes (e.g., `heelHeightMm`, `weightGrams`, `inventory_qty`).

**Steps**

1. Base string cleaning.
2. Remove thousands separators if configured (e.g., `"1,200"` → `"1200"`).
3. Replace localized decimal separators if configured (e.g., `"12,5"` → `"12.5"` for EU locales).
4. Parse as number.
5. If parse fails → return `null` and add a warning/error depending on requiredness.
6. Optionally clamp to allowed min/max from Attribute Domain Rules.

**Example**

- Raw: `" 1,200 "` → `1200`
- Raw: `"12.50"` → `12.5`

**3.2.6 Money Normalization**

For price fields (e.g., `retail_price`, `sale_price`, `cost`).

**Input formats**

- `"49.99"`
- `"$49.99"`
- `"USD 49.99"`

**Steps**

1. Base string cleaning.
2. Strip known currency symbols/words (`"$"`, `"USD"`), but retain them in a `source.currency` attribute when needed.
3. Apply number normalization to the remaining numeric part.
4. If the product-level or site-level currency is known, attach that as canonical currency (e.g., `"USD"`).

**Output**

Canonical form:

```
{
  "amount": 49.99,
  "currency": "USD"
}
```

If we only store numeric values in the product schema, keep `amount` and rely on site/store config for currency.

**3.2.7 Boolean Normalization**

For attributes like `is_active`, `is_returnable`, `is_featured`.

**Accepted truthy strings** (case-insensitive, trimmed):

- `"true"`, `"yes"`, `"y"`, `"1"`, `"on"`

**Accepted falsy strings**:

- `"false"`, `"no"`, `"n"`, `"0"`, `"off"`

**Steps**

1. Base string cleaning.
2. Lowercase.
3. Map to `true`/`false` via lists above.
4. If no match → `null` + warning if field important, or simply `null` for non-critical flags.

**Output**

- `true`, `false`, or `null`.

**3.2.8 Date / Time Normalization**

For attributes like `release_date`, `street_date`, `created_at_source`.

**Accepted examples**

- `"2025-11-30"`
- `"11/30/2025"` (depending on configured locale)
- `"2025-11-30T15:30:00Z"`

**Steps**

1. Base string cleaning.
2. Try parsing against configured date formats:
    
    ◦ ISO first (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ssZ`)
    
    ◦ Then site/vendor-specific formats (e.g., `MM/DD/YYYY`).
    
3. Always normalize to a canonical internal format, e.g., ISO 8601 UTC string.
4. If unparseable → `null` and add a warning.

**Output**

- Canonical ISO string, e.g., `"2025-11-30T00:00:00.000Z"`.

**3.2.9 Source-only attributes & output format**

Some values must be **preserved exactly as provided by the vendor** for support/debugging, even if we also normalize them.

**Examples**

- Original title from vendor.
- Original category path string.
- Original size run description.

**Behavior**

- For attributes flagged as `sourceOnly` in schema:
    
    ◦ Store **only** under `source.*` (not used in export or front-end).
    
- For attributes flagged as `sourceAndCanonical`:
    
    ◦ Store the raw value under `source.*`.
    
    ◦ Store normalized result in the canonical field.
    

**Output contract (row-level)**

After normalization but before validation, each row should look like:

```
{
  "productId": "ABC-123",
  "normalized": {
    "sku": "ABC-123",
    "brand": "Nike",
    "gender": "Men",
    "categories": ["Footwear","Basketball"],
    "retail_price": { "amount": 49.99, "currency": "USD" },
    "is_active": true,
    "release_date": "2025-11-30T00:00:00.000Z"
  },
  "source": {
    "rawSku": "abc-123 ",
    "rawBrand": "NIKE",
    "rawCategories": "Mens;Basketball;Footwear",
    "rawRetailPrice": "$49.99"
  },
  "normalizationWarnings": [
    "Unknown gender 'adult' → null",
    "Unparseable date 'TBD' → null"
  ]
}
```

This normalized object is what moves into **Section 3.1 row schema** and is then validated against **Section 2** attribute rules.

[Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)

[Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

[Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

---

### 3.2.x Downstream Workflow

After normalization rules are applied and products are written into Firestore:

- Products become candidates for **Workflow W2 — Full Product Completion (One-Person Process)** [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)
- Users complete core fields, attributes, descriptions, SEO, and launch/media, then drive Export Readiness per W2 and Section 7.5.4

This completes the pipeline:

**Import row → Normalized product (Section 3.1 / 3.2) → Completed & export-ready product (W2).**