# Attribute Validation Schema — JSON (Section 2.2)

This page defines the validation rules for all attribute values in ROPI.

It ensures that imported, AI-generated, and manually edited attribute values always match the data model defined in the Attribute Registry.

This schema works together with:

- Section 2.1 — Product Schema (core product shape)
- Attribute Registry — Human & JSON (attribute definitions)
- Smart Rules engine
- Import engine
- Product Editor validation
- AI Describe workflows

---

## 1. Attribute Validation Schema — JSON

The JSON below defines validation rules for product attributes, including required fields, export readiness requirements, and constraints aligned with the new Product Editor layout.

```json
{
  "version": "1.0.0",
  "required_core_attributes": [
    "sku",
    "mpn",
    "name",
    "brand",
    "category",
    "class",
    "department",
    "website",
    "gender",
    "ageGroup",
    "primaryColor",
    "descriptiveColor",
    "material"
  ],
  "required_for_export_only": [
    "slug",
    "taxClass",
    "metaName",
    "metaDescription",
    "keywords"
  ],
  "ai_descriptions": {
    "required_sites": ["shiekh", "karmaloop", "mltd", "sangremia"]
  }
}
```

This schema defines validation rules organized around Export Readiness buckets and the Product Editor tabs (Core Information, Descriptions & SEO, Product Attributes, Launch & Media, AI Actions).

Export validation focuses on core product data, attribute completeness, tax settings, and per-website descriptions/SEO. Media fields (including images) are validated separately for quality but are not part of the export readiness gate.

---

### 2.1.5 Current Status & Export Rules

This section defines the **structure** of attribute validation metadata (how errors, warnings, and per-site requirements are modeled), but it is **not** the canonical source for all export rules.

In particular:

- It does **not** contain a complete list of:
    - Required attributes per website
    - How those requirements roll up into the Export Readiness percentage/checklist
- It does **not** define any dependency on **images**, media, or Launch Calendar presentation fields.

Functional export behavior is defined by:

- **Workflow W2 — Full Product Completion (One-Person Process)**
    - Export Readiness checklist in the Product Editor.
- **Section 7 — Frontend & Launch Calendar**
    - `7.5.4 Export Readiness Indicator`
    - `7.2.5 Export Manager (RetailOps CSV Workflow)`
- **Section 9 — Firebase Implementation & Security**
    - `9.3.4 RetailOps Export Backend Behavior`

Implementers SHOULD:

- Use this section for the **shape and patterns** of validation payloads:
    - error/warning objects
    - per-site requirement flags
    - hints for UI display
- Derive actual **"required for export"** behavior from:
    - W2's Export Readiness criteria, and
    - the Export Manager logic (RetailOps CSV workflow).

Images, image counts, and other media-related fields are **explicitly excluded** from export validation. They may be important for Launch Calendar and merchandising quality but DO NOT block RetailOps CSV export or affect `ready_for_export`.

---

## 2. Attribute Validation Rules by dataType

These rules apply to every attribute based on the `dataType` defined in the Attribute Registry.

| dataType | Stored As | Validation Notes |
| --- | --- | --- |
| text | string | Any non-empty string allowed |
| longText | string | No length limit |
| number | number | Must be numeric |
| boolean | boolean | True/false only |
| select | string | Must match one allowed option from registry |
| multiSelect | array of strings | Each entry must match allowed options |
| money | string | Stored like `"89.99"` (no currency symbol) |
| date | string (ISO 8601) | `"YYYY-MM-DD"` format |

---

## 3. Import & AI validation behaviors

### 3.1 Import rules

- All imported values must match the `dataType`.
- Unknown keys are ignored.
- “MPN missing” causes the entire row to be rejected.
- For multiSelect fields, a comma-separated string is split automatically.

### 3.2 AI generation rules

AI outputs must:

- Match dataType shapes.
- Never generate new attributes.
- Never write invalid select/multiSelect options.
- Always preserve data types (e.g., money stays string).

### 3.3 Smart Rules validation

- Smart Rules validate type compliance before writing.
- Smart Rules never write to source_metadata.
- Smart Rules may auto-fill missing required-for-export values.

---

## 4. Domain-backed validation for select and multiSelect

Select and multiSelect attributes must conform to the domain lists defined in:

- **Section 2.3 — Attribute Domain Rules — JSON**
    
    (the `domains` JSON object keyed by attribute id)
    

When validating attributes:

- If an attribute has `dataType = "select"` **and** a corresponding key in `domains[attributeId]`:
    - The stored value **must** be one of the strings listed under `domains[attributeId]`.
- If an attribute has `dataType = "multiSelect"` **and** a corresponding key in `domains[attributeId]`:
    - The stored value **must** be an array of strings.
    - Each entry in the array **must** be one of the strings in `domains[attributeId]`.
- If an attribute does **not** have a domain entry in `domains`:
    - It is treated as an **open set** and any string is allowed (shape is still validated by dataType).

This behavior applies to:

- Import engine
- Product Editor validation
- Smart Rules write operations
- AI-generated attribute values

---

## 4. Next Steps

Future micro-steps will attach per-attribute domain validation (allowed values) for:

- select attributes
- multiSelect attributes
- date validations
- required-for-export enforcement

### 2.2.x Validation — attributes.drawing

Add a validation rule for the `attributes.drawing` field:

```json
"attributes.drawing": {
  "type": "string",
  "nullable": true,
  "enum": [
    "fcfs",
    "store_only",
    "web_only",
    "store_web",
    "token_set"
  ],
  "description": "Launch calendar drawing mode used by internal Launch Calendar. Optional; when present, must be one of the defined enum values."
}
```

This field is not required for product validity, but if present must match one of the allowed values above.

---

## 4. Next Steps

Future micro-steps will attach per-attribute domain validation (allowed values) for:

- select attributes
- multiSelect attributes
- date validations
- required-for-export enforcement

---

### Navigation

← Previous: [Product Schema — JSON (Section 2.1)](Product%20Schema%20%E2%80%94%20JSON%20(Section%202%201)%202b845ee1ec5a811bb355ee431515f0c4.md)

→ Next: [Attribute Domain Rules — JSON (Section 2.3)](Attribute%20Domain%20Rules%20%E2%80%94%20JSON%20(Section%202%203)%202b845ee1ec5a8056bc5cc7b29fce11df.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

{

"path": "/Notion/link_69265bd0a644819182985a79b1bea511/fetch",

"args": "{"id":"2b845ee1ec5a805fba0ef665dfb17396"}"

}

-->