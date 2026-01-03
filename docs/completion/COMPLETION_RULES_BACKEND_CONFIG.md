# Completion Rules — Backend Config Objects (1:1 Mapping)

This document defines the canonical config objects used to store and evaluate Completion Rules.  
**Non-negotiable:** No hard-coded readiness logic. Completion evaluation derives from:
- Attribute Registry snapshot (canonical attributes + categories + metadata)
- Completion Rules config (segments, weights, rules, selectors)
- Product selected websites (site-aware evaluation)

---

## 1) Storage Layout (Recommended)

### Live active rules (single doc)
**Path:** `settings/exportSettings/completionRules`

### Immutable version snapshots
**Path:** `settings/exportSettings/completionRulesVersions/{rulesVersion}`

### Optional audit events (append-only)
**Path:** `settings/exportSettings/completionRulesAudit/{eventId}`

---

## 2) CompletionRulesConfig (Top-level)

```json
{
  "schemaVersion": "1.0",
  "rulesVersion": 12,
  "updatedAt": "2026-01-03T00:00:00Z",
  "updatedBy": "user:john",

  "exportUnlockThresholdPct": 100,

  "segments": [
    {
      "id": "seg_core",
      "name": "Core attributes",
      "enabled": true,
      "weightPct": 30,
      "ruleType": "ALL_REQUIRED",
      "appliesTo": { "mode": "ALL_PRODUCTS", "sites": [] },
      "attributeSelector": {
        "source": "REGISTRY",
        "categories": ["classification", "core_identity"],
        "requirementFlag": "completionRequired",
        "siteAware": false,
        "includeInternalOnly": false,
        "excludeAttributeIds": []
      }
    }
  ],

  "builtInSegments": {
    "descriptionsSeoPerSite": {
      "segmentId": "seg_descriptions_seo",
      "lockedSemantics": true
    }
  },

  "exclusions": {
    "media": { "affectsCompletion": false, "reason": "informational_only" },
    "pricing": { "affectsCompletion": false, "reason": "override_only" }
  }
}
```

### Field meanings

* `schemaVersion`: config schema version for migration safety
* `rulesVersion`: monotonic integer incremented on every Save
* `exportUnlockThresholdPct`: export allowed when completionPct >= threshold
* `segments[]`: operator-defined segments (weight + rule + selector)
* `builtInSegments`: declares built-in segment IDs and locked semantics
* `exclusions`: locked invariants (media/pricing never affect completion)

---

## 3) SegmentConfig (UI card 1:1)

```json
{
  "id": "seg_descriptions_seo",
  "name": "Descriptions + SEO (per selected website)",
  "enabled": true,
  "weightPct": 40,
  "ruleType": "ALL_REQUIRED",
  "appliesTo": { "mode": "ONLY_SELECTED_SITES", "sites": [] },
  "attributeSelector": {
    "source": "REGISTRY",
    "categories": ["descriptions_sites", "seo_sites"],
    "requirementFlag": "completionRequired",
    "siteAware": true,
    "includeInternalOnly": false,
    "excludeAttributeIds": []
  }
}
```

### Allowed values

* `ruleType`: `"ALL_REQUIRED" | "ANY_REQUIRED"`
* `appliesTo.mode`: `"ALL_PRODUCTS" | "ONLY_SELECTED_SITES"`

### Constraints (enforced server-side)

* If `enabled == true`, `weightPct` must be 0–100
* Sum of `weightPct` across enabled segments must equal 100
* `categories` must be non-empty
* `requirementFlag` must be one of allowed enum values (see below)

---

## 4) AttributeSelectorConfig (Segment membership logic)

```json
{
  "source": "REGISTRY",
  "categories": ["technical", "product_flags"],
  "requirementFlag": "completionRequired",
  "siteAware": false,
  "includeInternalOnly": false,
  "excludeAttributeIds": ["internal.debugOnlyField"]
}
```

### Selector semantics

* `source: REGISTRY` means membership is derived from registry snapshot only.
* `categories`: registry categories included in this segment.
* `requirementFlag`: which registry flag determines "required" within this segment.

### Allowed requirement flags (explicit enum)

* `completionRequired` (recommended canonical completion flag)
* `requiredForExport` (allowed only if explicitly chosen; must be treated as a completion input by settings, not by default)

### Site-aware semantics

* If `siteAware == true`, evaluation must be computed per selected site:

  * required attributes are resolved per site
  * missing attributes are reported per site
  * any selected site missing required fields blocks the segment under ALL_REQUIRED

---

## 5) Built-in Descriptions + SEO Segment (Locked Semantics)

This segment must exist with fixed semantics (membership fixed by categories, ruleType fixed).

```json
{
  "segmentId": "seg_descriptions_seo",
  "lockedSemantics": true,
  "fixed": {
    "ruleType": "ALL_REQUIRED",
    "appliesToMode": "ONLY_SELECTED_SITES",
    "selectorCategories": ["descriptions_sites", "seo_sites"],
    "selectorRequirementFlag": "completionRequired",
    "siteAware": true
  }
}
```

Operators may edit:

* `name`
* `enabled` (if allowed; strongly discouraged)
* `weightPct`

Operators may NOT edit:

* selector categories
* rule type
* applies-to mode
* siteAware flag

---

## 6) CompletionEvaluationResponse (Runtime output for UI)

This object is returned by the completion evaluation endpoint and must be used by Product Drawer and Admin Preview.

```json
{
  "rulesVersion": 12,
  "completionPct": 72,
  "thresholdPct": 100,
  "exportAllowed": false,

  "segments": [
    {
      "segmentId": "seg_core",
      "name": "Core attributes",
      "enabled": true,
      "weightPct": 30,
      "ruleType": "ALL_REQUIRED",
      "status": "INCOMPLETE",
      "requiredCount": 10,
      "missingCount": 2,
      "missingAttributes": [
        { "attributeId": "sku_core.brand", "label": "Brand" }
      ]
    },
    {
      "segmentId": "seg_descriptions_seo",
      "name": "Descriptions + SEO (per selected website)",
      "enabled": true,
      "weightPct": 40,
      "ruleType": "ALL_REQUIRED",
      "status": "BLOCKED",
      "requiredCount": 8,
      "missingCount": 3,
      "missingAttributes": [],
      "bySite": [
        {
          "siteId": "shiekh",
          "status": "INCOMPLETE",
          "requiredCount": 4,
          "missingCount": 1,
          "missingAttributes": [
            { "attributeId": "desc.shiekh.metaTitle", "label": "Meta Title" }
          ]
        },
        {
          "siteId": "nordstrom",
          "status": "COMPLETE",
          "requiredCount": 4,
          "missingCount": 0,
          "missingAttributes": []
        }
      ]
    }
  ],

  "exclusions": {
    "media": { "affectsCompletion": false, "present": false },
    "pricing": { "affectsCompletion": false, "present": false }
  }
}
```

### Output invariants

* Must include `segmentId`, `status`, and missing attributes by **label + id**
* If site-aware, must include `bySite[]` for selected sites
* Must expose `rulesVersion` used for evaluation (debuggable parity)

---

## 7) Deterministic Completion Math (Required)

For enabled segments `s`:

### Segment score

* If `requiredCount == 0`, score = 1.0
* If `ruleType == ALL_REQUIRED`:

  * score = (requiredCount - missingCount) / requiredCount
* If `ruleType == ANY_REQUIRED`:

  * score = 1.0 if (missingCount < requiredCount) else 0.0

### Completion %

```text
completionPct = round( Σ(score(s) * weightPct(s)) / 100 * 100 )
```

### Export gate

```text
exportAllowed = completionPct >= exportUnlockThresholdPct
```

No other export gating logic is permitted.

---

## 8) Server-side Save Validation (Reject invalid configs)

Reject save if:

* thresholdPct not in [0,100]
* any enabled segment missing required properties
* enabled segment weights do not sum to 100
* unknown requirementFlag
* site IDs invalid
* built-in descriptions segment semantics modified

---

## 9) Notes on Registry vs Validation

* The registry is canonical for attributes + categories + flags.
* Validation/enforcement must derive allowed/required sets from:

  * registry snapshot + completionRules config + selected sites
* No static whitelists or hard-coded attribute lists are allowed in the completion path.
