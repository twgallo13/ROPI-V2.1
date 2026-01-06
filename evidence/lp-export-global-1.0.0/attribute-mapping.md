# Attribute Mapping & Reconciliation Plan
**LP-export-global-1.0.0 | HES B Deliverable**  
**Author:** Homer (AI Agent)  
**Date:** 2026-01-06  
**Status:** Design Ready

---

## Executive Summary

This document reconciles **attribute flags** across SDK registry and Firestore completion rules, establishes **canonical normalization rules**, and provides a **reconciliation script** to detect anomalies.

**Key Finding:** SDK registry uses BOTH `required_for_completion` (snake_case) AND `requiredForExport` (camelCase) inconsistently. Normalization required.

---

## 1. Attribute Flag Inventory

### 1.1 SDK Registry Flags (attributeRegistry.json)

**File:** [packages/sdk/config/attributeRegistry.json](packages/sdk/config/attributeRegistry.json)

**Observed Flags:**
- `required_for_completion` (boolean) — Snake case, used in 15 attributes
- `required_for_export` (boolean) — Snake case, used in 24 attributes  
- `requiredForExport` (boolean) — **Camel case** duplicate of `required_for_export`
- `exportable` (boolean) — All attributes have this
- `internalOnly` (boolean) — Excludes from exports if true

**Example (sku attribute, L4-18):**
```json
{
  "attribute_id": "sku",
  "label": "SKU",
  "category": "sku_core",
  "required_for_completion": true,
  "required_for_export": true,
  "exportable": true,
  "internalOnly": false,
  "requiredForExport": true  // ← DUPLICATE in camelCase
}
```

**Inconsistency:** Some attributes have BOTH `required_for_export` AND `requiredForExport` with same value (redundant).

---

### 1.2 Required Attributes Lists (from HES A)

#### Completion-Required (15 attributes)
**File:** [evidence/lp-export-global-1.0.0/required-attributes-completion.json](evidence/lp-export-global-1.0.0/required-attributes-completion.json)

```json
[
  { "attribute_id": "sku", "category": "sku_core" },
  { "attribute_id": "mpn", "category": "sku_core" },
  { "attribute_id": "name", "category": "sku_core" },
  { "attribute_id": "brand", "category": "sku_core" },
  { "attribute_id": "category", "category": "classification" },
  { "attribute_id": "class", "category": "classification" },
  { "attribute_id": "department", "category": "classification" },
  { "attribute_id": "website", "category": "sku_core" },
  { "attribute_id": "product_is_active", "category": "sku_core" },
  { "attribute_id": "gender", "category": "identity_demographic" },
  { "attribute_id": "age_group", "category": "identity_demographic" },
  { "attribute_id": "primary_color", "category": "physical" },
  { "attribute_id": "descriptive_color", "category": "physical" },
  { "attribute_id": "material", "category": "physical" },
  { "attribute_id": "fit", "category": "physical" }
]
```

#### Export-Required (24 attributes)
**File:** [evidence/lp-export-global-1.0.0/required-attributes-export.json](evidence/lp-export-global-1.0.0/required-attributes-export.json)

**Includes all 15 completion-required PLUS 9 additional:**
- gtin, slug, (additional attributes not in completion list)

---

## 2. Canonical Normalization Rules

### 2.1 Flag Precedence (Snake Case Wins)

**Rule:** Accept EITHER `required_for_export` OR `requiredForExport`, prefer **snake_case**.

**Normalization Logic:**
```typescript
function normalizeExportRequiredFlag(attr: any): boolean {
  // Prefer snake_case, fallback to camelCase
  if (typeof attr.required_for_export === 'boolean') {
    return attr.required_for_export;
  }
  if (typeof attr.requiredForExport === 'boolean') {
    return attr.requiredForExport;
  }
  return false; // Default: not required
}
```

**Applies to:**
- `required_for_export` / `requiredForExport`
- (No other flags have this duplication)

---

### 2.2 Category Mapping (SDK → Firestore)

**Problem:** Firestore completion rules use `categories[]` selector (e.g., `["product", "general"]`), but SDK registry uses specific category names.

**Canonical Category Groups (for completionRules segments):**

| Segment | Categories (SDK registry) | Attributes |
|---------|--------------------------|------------|
| **core-attributes** | `sku_core`, `identifiers` | sku, mpn, name, brand, website, product_is_active |
| **description-seo** | `description`, `seo` | description, seo_title, seo_description |
| **product-classification** | `classification` | category, class, department |
| **identity-demographic** | `identity_demographic` | gender, age_group |
| **physical-attributes** | `physical` | primary_color, descriptive_color, material, fit |

**Normalization Rule:** When creating Firestore `attributeSelector.categories`, use SDK registry `category` field directly (already normalized).

---

### 2.3 Required Flags Reconciliation

**Rule:** For GLOBAL mode, use `required_for_completion` flag as primary signal.

**Classification Special Case:**
- SDK: `category`, `class`, `department` have `required_for_completion: true`
- Firestore: Classification segment likely MISSING or disabled
- **Fix:** Add classification segment in Phase 4 (migration-plan.md)

---

## 3. Attribute Anomalies Detection

### 3.1 Anomaly Types

1. **Duplicate Flags:** Attribute has BOTH `required_for_export` AND `requiredForExport`
2. **Missing Category:** Attribute has `required_for_completion: true` but category not in any Firestore segment
3. **Orphaned Attributes:** Attribute in Firestore segment but NOT in SDK registry

---

### 3.2 Detection Script

**File:** `evidence/lp-export-global-1.0.0/scripts/detect_attribute_anomalies.js`

**Code:**
```javascript
const fs = require('fs');
const path = require('path');

// Load SDK registry
const registryPath = path.join(__dirname, '../../../packages/sdk/config/attributeRegistry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

// Load completion-required list
const completionPath = path.join(__dirname, '../required-attributes-completion.json');
const completionRequired = JSON.parse(fs.readFileSync(completionPath, 'utf8'));

// Anomaly 1: Duplicate flags (required_for_export AND requiredForExport)
console.log('=== Anomaly 1: Duplicate Export Flags ===');
const duplicates = registry.attributes.filter(attr => 
  attr.hasOwnProperty('required_for_export') && attr.hasOwnProperty('requiredForExport')
);
console.log(`Found ${duplicates.length} attributes with duplicate flags:`);
duplicates.forEach(attr => {
  const match = attr.required_for_export === attr.requiredForExport;
  console.log(`  ${attr.attribute_id}: required_for_export=${attr.required_for_export}, requiredForExport=${attr.requiredForExport} [${match ? 'MATCH' : 'MISMATCH'}]`);
});

// Anomaly 2: Classification attributes not enforced (from HES A finding)
console.log('\n=== Anomaly 2: Classification Attributes Status ===');
const classificationAttrs = ['category', 'class', 'department'];
classificationAttrs.forEach(attrId => {
  const attr = registry.attributes.find(a => a.attribute_id === attrId);
  if (attr) {
    console.log(`  ${attrId}: required_for_completion=${attr.required_for_completion}, category=${attr.category}`);
  } else {
    console.log(`  ${attrId}: NOT FOUND in registry`);
  }
});
console.log('  ⚠️  These should be in a "classification" segment with 20% weight (see Phase 4)');

// Anomaly 3: Attributes in completion list but wrong category
console.log('\n=== Anomaly 3: Category Mismatches ===');
const categoryMap = {
  'sku_core': ['sku', 'mpn', 'name', 'brand', 'website', 'product_is_active'],
  'classification': ['category', 'class', 'department'],
  'identity_demographic': ['gender', 'age_group'],
  'physical': ['primary_color', 'descriptive_color', 'material', 'fit']
};

Object.entries(categoryMap).forEach(([expectedCategory, attrIds]) => {
  attrIds.forEach(attrId => {
    const attr = registry.attributes.find(a => a.attribute_id === attrId);
    if (attr && attr.category !== expectedCategory) {
      console.log(`  ${attrId}: Expected category "${expectedCategory}", got "${attr.category}"`);
    }
  });
});

// Summary
console.log('\n=== Normalization Recommendations ===');
console.log('1. Remove duplicate `requiredForExport` fields (keep snake_case `required_for_export`)');
console.log('2. Add classification segment to Firestore completionRules (Phase 4)');
console.log('3. Verify all completion-required attributes have correct category');
```

**Execute:**
```bash
cd /workspaces/ROPI-V2.1
node evidence/lp-export-global-1.0.0/scripts/detect_attribute_anomalies.js
```

**Expected Output:**
```
=== Anomaly 1: Duplicate Export Flags ===
Found 15 attributes with duplicate flags:
  sku: required_for_export=true, requiredForExport=true [MATCH]
  mpn: required_for_export=true, requiredForExport=true [MATCH]
  ...

=== Anomaly 2: Classification Attributes Status ===
  category: required_for_completion=true, category=classification
  class: required_for_completion=true, category=classification
  department: required_for_completion=true, category=classification
  ⚠️  These should be in a "classification" segment with 20% weight (see Phase 4)

=== Anomaly 3: Category Mismatches ===
  (no output = all categories correct)

=== Normalization Recommendations ===
1. Remove duplicate `requiredForExport` fields (keep snake_case `required_for_export`)
2. Add classification segment to Firestore completionRules (Phase 4)
3. Verify all completion-required attributes have correct category
```

---

## 4. Reconciliation Plan

### 4.1 Phase 1: Normalize SDK Registry (Optional Cleanup)

**Goal:** Remove duplicate `requiredForExport` fields from attributeRegistry.json.

**Script:** `scripts/normalize_registry_flags.js`
```javascript
const registry = require('../../../packages/sdk/config/attributeRegistry.json');

// Remove requiredForExport if required_for_export exists
registry.attributes.forEach(attr => {
  if (attr.hasOwnProperty('required_for_export') && attr.hasOwnProperty('requiredForExport')) {
    delete attr.requiredForExport;
    console.log(`Normalized ${attr.attribute_id}: removed duplicate requiredForExport`);
  }
});

// Write back
fs.writeFileSync(
  path.join(__dirname, '../../../packages/sdk/config/attributeRegistry.json'),
  JSON.stringify(registry, null, 2)
);
console.log('✅ Registry normalized');
```

**Risk:** Low — Backend code already handles both flag names.

---

### 4.2 Phase 2: Verify Firestore Segment Mappings

**Goal:** Ensure Firestore completionRules segments cover all required_for_completion attributes.

**Query Firestore:**
```javascript
const admin = require('firebase-admin');
admin.initializeApp();

async function verifySegments() {
  const docRef = admin.firestore()
    .collection('settings')
    .doc('default')
    .collection('completionRules')
    .doc('config');
  
  const snapshot = await docRef.get();
  const segments = snapshot.data()?.segments || [];
  
  // Expected categories per segment
  const expectedMappings = {
    'core-attributes': ['sku_core', 'identifiers'],
    'description-seo': ['description', 'seo'],
    'product-classification': ['classification'], // ← Should exist in Phase 4
    'identity-demographic': ['identity_demographic'],
    'physical-attributes': ['physical']
  };
  
  segments.forEach(seg => {
    const expected = expectedMappings[seg.id];
    const actual = seg.attributeSelector.categories;
    console.log(`Segment ${seg.id}:`);
    console.log(`  Expected categories: ${expected}`);
    console.log(`  Actual categories: ${actual}`);
    console.log(`  Enabled: ${seg.enabled}`);
  });
}

verifySegments().catch(console.error);
```

**Expected Output (Before Phase 4):**
```
Segment core-attributes:
  Expected categories: sku_core,identifiers
  Actual categories: product,general  ← MISMATCH (legacy naming)
  Enabled: true
Segment description-seo:
  Expected categories: description,seo
  Actual categories: description,seo  ← MATCH
  Enabled: true
Segment product-classification:
  NOT FOUND ← Missing, should be added in Phase 4
```

**Action:** Update Firestore segments to use canonical SDK categories.

---

### 4.3 Phase 3: Apply Classification Segment (Migration Phase 4)

**See:** [migration-plan.md Phase 4](migration-plan.md) for full implementation.

**Summary:**
- Add `product-classification` segment with 20% weight
- Categories: `["classification"]`
- Attributes: category, class, department
- RuleType: `ALL_REQUIRED`

---

## 5. Attribute Lists by Segment (Canonical)

### 5.1 Core Attributes (50% weight)
**Categories:** `sku_core`, `identifiers`  
**Attributes:** sku, mpn, name, brand, website, product_is_active

### 5.2 Description & SEO (30% weight)
**Categories:** `description`, `seo`  
**Attributes:** description, seo_title, seo_description  
**Site-Specific:** Yes (ALL_SITES_REQUIRED rule type)

### 5.3 Product Classification (20% weight) — NEW in Phase 4
**Categories:** `classification`  
**Attributes:** category, class, department  
**Current Status:** NOT ENFORCED (segment missing)

### 5.4 Identity/Demographic (Not in completion rules)
**Categories:** `identity_demographic`  
**Attributes:** gender, age_group  
**Status:** Marked `required_for_completion: true` but not in current segments

### 5.5 Physical Attributes (Not in completion rules)
**Categories:** `physical`  
**Attributes:** primary_color, descriptive_color, material, fit  
**Status:** Marked `required_for_completion: true` but not in current segments

**Question:** Should Identity/Demographic and Physical be separate segments? (Deferred to future LP)

---

## 6. jq Snippet for Attribute Inspection

**Query:** List all attributes with `required_for_completion: true` and their categories:
```bash
jq '.attributes[] | select(.required_for_completion == true) | {attribute_id, category, required_for_completion}' \
  packages/sdk/config/attributeRegistry.json
```

**Output:**
```json
{"attribute_id":"sku","category":"sku_core","required_for_completion":true}
{"attribute_id":"mpn","category":"sku_core","required_for_completion":true}
{"attribute_id":"name","category":"sku_core","required_for_completion":true}
{"attribute_id":"brand","category":"sku_core","required_for_completion":true}
{"attribute_id":"category","category":"classification","required_for_completion":true}
...
```

**Query:** Detect duplicate export flags:
```bash
jq '.attributes[] | select(.required_for_export != null and .requiredForExport != null) | {attribute_id, required_for_export, requiredForExport}' \
  packages/sdk/config/attributeRegistry.json
```

---

## 7. Access Blockers (from HES A)

**Firestore Access:** Cannot query Firestore to verify current segment configuration.

**Mitigation:** Scripts provided require Firebase Admin SDK. If blocked:
1. Use Firebase Console UI: Firestore → `settings/{tenant}/completionRules/config`
2. Manually inspect `segments[]` array
3. Request Firestore read access (see [access-blockers.txt](access-blockers.txt))

---

## 8. Summary

**Normalization Rules:**
1. Use snake_case `required_for_completion` / `required_for_export` (ignore camelCase duplicates)
2. Map SDK `category` field directly to Firestore `attributeSelector.categories`
3. Add classification segment in Phase 4 to enforce category/class/department

**Reconciliation Scripts:**
- `detect_attribute_anomalies.js` — Finds duplicates and mismatches
- `normalize_registry_flags.js` — Removes duplicate camelCase flags (optional)
- `verify_segments.js` — Compares Firestore segments to SDK registry

**Blockers:**
- Firestore access required to verify segment configuration
- Runtime testing requires staging credentials (see [access-blockers.txt](access-blockers.txt))

---

**Document Status:** ✅ Ready for Reconciliation  
**Approval Required:** Lisa (LP Governance Lead)  
**Next Artifact:** ui-design.md
