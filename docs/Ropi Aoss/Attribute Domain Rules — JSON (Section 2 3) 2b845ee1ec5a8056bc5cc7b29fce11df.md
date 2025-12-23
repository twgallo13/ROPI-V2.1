# Attribute Domain Rules — JSON (Section 2.3)

## Section 2.3 — Attribute Domain Rules (JSON Structure)

This section defines the **JSON structure** used to represent attribute domains (allowed values, labels, and related metadata) in AOSS.

> **Canonical Data Source**
> 

> The complete set of domain values (gender, website, promo, material, league, sportsTeam, etc.) lives in:
> 

> - **[Attribute Registry — Human & JSON](Attribute%20Registry%20%E2%80%94%20Human%20&%20JSON%202b845ee1ec5a81228b07ca97964cd033.md)**
> 

> - Human-readable table of attributes and domains
> 

> - Machine-readable JSON file checked into the repository
> 

Section 2.3 focuses on the **shape** of the `domains` object that frontend and backend code consume, not on duplicating every domain value inline.

Domain definitions are used by:

- The Product Editor (dropdowns and multi-selects)
- Import normalization (Section 3.2)
- Validation and Smart Rules (Section 2.2, Section 4)

---

### 2.3.1 Example Domain Structure

```json
{
  "$schema": "[http://json-schema.org/draft-07/schema#](http://json-schema.org/draft-07/schema#)",
  "title": "ROPI Attribute Domains",
  "type": "object",
  "properties": {
    "gender": {
      "type": "array",
      "description": "Allowed values for attributes.gender. Full list in Attribute Registry.",
      "items": {
        "type": "object",
        "properties": {
          "value": { "type": "string" },
          "label": { "type": "string" },
          "active": { "type": "boolean" }
        },
        "required": ["value", "label"]
      }
    },
    "website": {
      "type": "array",
      "description": "Allowed sites for the `website` multi-select. Full list in Attribute Registry.",
      "items": {
        "type": "object",
        "properties": {
          "value": { "type": "string" },
          "label": { "type": "string" },
          "active": { "type": "boolean" }
        },
        "required": ["value", "label"]
      }
    }
    /*
      Additional domain keys (material, closureType, league, sportsTeam, promo, taxClass, etc.)
      follow the same pattern as shown above and are maintained in the Attribute Registry JSON.
    */
  },
  "additionalProperties": false
}
```

**Implementation note:** The actual domain values used by AOSS must be loaded from the Attribute Registry JSON. This section describes the schema those domains must conform to, but does not re-define or duplicate the full lists.

**Implementation note:** The actual domain values used by AOSS must be loaded from the Attribute Registry JSON. This section describes the schema those domains must conform to, but does not re-define or duplicate the full lists.

---

### 2.3.x Domain Rule — Launch Drawing Mode

Add a domain rule for the `attributes.drawing` field:

```json
{
  "attribute": "attributes.drawing",
  "ruleId": "launch_drawing_mode_enum",
  "description": "Launch Calendar drawing mode must be one of the supported internal options when set.",
  "constraints": {
    "allowedValues": [
      "fcfs",
      "store_only",
      "web_only",
      "store_web",
      "token_set"
    ],
    "required": false
  },
  "notes": "This is an internal Launch Calendar-only field. It is not imported from external systems and is not exported to RetailOps CSV."
}
```

---

## 📋 Reference: Legacy Domain Values (from Excel file)

The domain values below are preserved from the original Excel import for reference. These support Smart Rules and AI Describe but are being transitioned to the streamlined domains above.

```json
{
  "domains": {
    "ageGroup": [
      "Adult",
      "Grade-School",
      "Infant",
      "Kids",
      "Pre-School",
      "Toddler"
    ],
    "gender": [
      "Boys",
      "Girls",
      "Kids",
      "Men's",
      "Unisex",
      "Women's"
    ],
    "website": [
      "[shiekh.com](http://shiekh.com)",
      "[karmaloop.com](http://karmaloop.com)",
      "[mltd.com](http://mltd.com)",
      "[sangremia.com](http://sangremia.com)"
    ]
  }
}
```

---

"

```

```

---

---

### Navigation

← Previous: [Attribute Validation Schema — JSON (Section 2.2)](Attribute%20Validation%20Schema%20%E2%80%94%20JSON%20(Section%202%202)%202b845ee1ec5a805fba0ef665dfb17396.md)

→ Next: [Attribute Registry — Human & JSON](Attribute%20Registry%20%E2%80%94%20Human%20&%20JSON%202b845ee1ec5a81228b07ca97964cd033.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})