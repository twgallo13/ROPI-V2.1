# VVP: LP-export-readiness-attribute-registry-1.0.0

**Status:** Awaiting execution  
**PR:** #419  
**Branch:** `feature/LP-export-readiness-attribute-registry-1.0.0`

## Pre-conditions

**Environment:** Must test against feature branch build (NOT production aoss-main)

Options:
1. **Local build:** `npm run dev` from feature branch
2. **Preview deployment:** Trigger "Deploy AOSS PR Preview" workflow for PR #419
3. **Staging deployment:** Manual merge to staging branch

## VVP Test Cases

### TC1: Product with NO images is export-ready (AC1)

**Given:**
- A product with **zero images** (no `media` field or empty array)
- All registry attributes marked `requiredForExport: true` are filled

**When:**
- Open Product Edit Drawer
- Navigate to Export Readiness section

**Expected:**
- ✅ Export Readiness shows **"Ready"**
- NO warning/error about missing images
- missingAttributes array is empty

**Verification point:** Confirms images do NOT affect Export Readiness

---

### TC2: Missing attribute shows LABEL not ID (AC3)

**Given:**
- A product missing `brand` attribute (registry label: "Brand")
- Attribute Registry has `brand.requiredForExport = true`

**When:**
- Open Product Edit Drawer
- View Export Readiness section

**Expected:**
- ❌ Export Readiness shows **"Not Ready"**
- Missing attributes list displays: **"Brand"** (NOT "brand")
- UI shows: "Missing Required Attributes: Brand"

**Verification point:** Confirms label hydration from registry

---

### TC3: Toggle requiredForExport changes readiness (AC3)

**Given:**
- A product with all currently-required attributes filled
- Product is export-ready

**When:**
- In Attribute Registry (`packages/sdk/config/attributeRegistry.json`), set a currently-optional attribute (e.g., `style_id`) to `requiredForExport: true`
- Restart API server to reload registry
- Reload Product Edit Drawer

**Expected:**
- ❌ Export Readiness now shows **"Not Ready"**
- Missing attributes list shows the newly-required attribute by label
- After filling the attribute, readiness returns to ✅ **"Ready"**

**Verification point:** Confirms registry-driven behavior

---

### TC4: Multi-site aggregation

**Given:**
- A product with multiple website entries
- Different sites missing different required attributes

**When:**
- Open Product Edit Drawer
- View Export Readiness section

**Expected:**
- Aggregated view shows **union** of all missing attributes across sites
- Per-site breakdown shows site-specific missing attributes
- All attributes displayed by **label** (not ID)

**Verification point:** Confirms UI aggregation logic

---

## Test Evidence Format

For each test case, provide:

```json
{
  "test_case": "TC1",
  "status": "PASS | FAIL",
  "evidence": {
    "screenshot_url": "https://...",
    "console_logs": "...",
    "api_response": { "ready": true, "missingAttributes": [] }
  },
  "notes": "..."
}
```

## Exit Criteria

- **Pass threshold:** All 4 test cases PASS
- **Fail threshold:** Any test case FAIL requires code fix

## Next Steps After VVP

- ✅ **If VVP PASS:** Add `state:vvp-passed` label, proceed to merge
- ❌ **If VVP FAIL:** Add `state:vvp-failed` label, document findings, return to EXECUTING phase
