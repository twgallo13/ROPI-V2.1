# Completion Rules — UI Specification (Single Screen)

**Location:** Settings → Export Settings → Completion Rules  
**Purpose:** Provide a single, authoritative settings surface to control how **Completion %** is computed and how **export eligibility** is gated, with full operator visibility (segment + site + missing attributes).  
**Non-negotiable:** No hard-coded logic in the readiness path. All behavior must derive from **Attribute Registry + Completion Rules settings + selected websites**.

---

## 0) Invariants (Always True)

- **Completion is the single canonical gate**: export is not allowed unless completion meets the configured threshold.
- **Media/images** have **zero impact** on completion, export readiness, or Smart Rules. Media is informational only (Launch Calendar + AI Observations only).
- **Pricing** has **zero impact** on completion or export. Pricing is override-only and informational.
- **Descriptions + SEO are required per selected website** (site-aware). Missing required description/SEO for any selected site must block completion.
- Every UI control must have a direct, observable effect on completion computation. No dead controls.

---

## 1) Page Header / Contract Panel (Top of Page)

### Header
**Completion Rules**

### Contract text (static)
> Completion defines when a product is eligible for export.  
> Export is unlocked only when Completion requirements are met.

### Read-only status badges (informational)
- **Completion Mode:** Weighted, settings-driven
- **Export Gate:** Completion only
- **Registry Source:** Attribute Registry (live snapshot)

### "Last updated" line (read-only)
- `Rules version: v{rulesVersion}`  
- `Updated: {timestamp} by {actor}`

---

## 2) Global Setting — Export Unlock Threshold

### Control
**Export Unlock Threshold (%)**
- Numeric input (0–100)
- Default: **100**
- Validation: integer only

### Help text (static)
> Export is allowed only when Completion % meets or exceeds this threshold.

---

## 3) Segments List (Core of Screen)

Segments are shown as a vertical list of cards. Order is display-only.

### Segment card layout (each segment)

#### A) Segment header row
- **Segment Name** (editable text)
- **Enabled toggle** (on/off)
- **Weight (%)** (numeric input)
- Drag handle (optional; does not affect logic unless explicitly configured later)

**Validation rules:**
- Enabled segments must have weight between 0–100
- Sum of weights across enabled segments must equal **100**
- If sum ≠ 100: disable Save and show error banner at top of segments list

#### B) Segment scope
**Applies to:**
- ( ) **All products**
- ( ) **Only when specific websites are selected**
  - If selected: show a multi-select of websites (values from canonical site list)
  - If empty selection: segment is treated as non-applicable (score=1.0) and must show warning inline

#### C) Segment completion rule type
**Completion Rule:**
- ( ) **ALL required attributes must be present**
- ( ) **ANY required attribute in this segment is sufficient**

#### D) Attribute inclusion (read-only, derived)
Section title: **Attributes included (derived from registry)**

Show a read-only list/table:
- Attribute **Label**
- Attribute **ID** (secondary text)
- Category badge
- Optional flags: internalOnly/exportable (if helpful)
- If site-aware segment: show "Site-aware" badge

**Explanatory text (static):**
> This list is derived from the Attribute Registry + Completion Rules selector.  
> To change which attributes appear here, update registry metadata or the segment selector rules.

#### E) Segment selector (minimal controls; settings-driven)
Section title: **Selector**

Controls (minimal, to avoid confusing operators):
- **Categories included** (multi-select; uses registry category names)
- **Requirement flag** (dropdown; options must be explicit and validated)
  - Allowed values:
    - `completionRequired` (recommended canonical for completion)
    - `requiredForExport` (allowed only if explicitly chosen; must show warning: "Export-required ≠ completion-required by default")
- **Exclude attribute IDs** (optional text area; newline-separated IDs)
  - Help text: "Exclude specific attributes from this segment without code changes."

**Important constraint:**
- This selector is the only way segment membership is defined. No hard-coded lists elsewhere.

#### F) Segment preview (read-only)
Section title: **Preview (how this segment will score)**
Show:
- `Required count: X`
- `Missing count: Y` (example placeholder if no product selected)
- If site-aware: show per-site required/missing counts in preview

Note: This preview is schema-based, not product-based unless a product context is supplied elsewhere.

---

## 4) Mandatory Built-in Segment: Descriptions + SEO (Per Selected Website)

This segment must exist and cannot be deleted. Name and weight configurable, but core semantics fixed.

### Fixed semantics (non-editable)
- Applies to: **Only when specific websites are selected** (uses the product's selected sites)
- Rule type: **ALL required**
- Site-aware enforcement enabled

### UI behavior
- Card shows "Locked semantics" badge
- Selector categories are fixed to:
  - `descriptions_sites`
  - `seo_sites`
- Requirement flag fixed to `completionRequired` (or equivalent canonical completion flag)
- Operator can adjust:
  - Segment name
  - Enabled (allowed, but if disabled show prominent warning: "Disabling site descriptions removes a core export requirement; export may become invalid.")
  - Weight

---

## 5) Explicit Exclusions (Read-only, Locked)

Section title: **Always Excluded from Completion**

Show two locked rows:
- **Media / Images** — Informational only (Launch Calendar + AI Observations). **Never blocks completion or export.**
- **Pricing** — Override-only. **Never blocks completion or export.**

No toggles. No edits.

---

## 6) "Why blocked?" Operator Visibility (Read-only Contract)

Section title: **Blocking explanation contract**

Static text:
> For any product that is not exportable, the system must show:
> - Which segment is blocking
> - Which website (if applicable)
> - Which attributes are missing (labels + IDs)
> If this information cannot be shown, it is a bug.

---

## 7) Save / Versioning / Safety

### Save behavior
- **Save** button persists the current rules to `settings/exportSettings/completionRules`
- On save, system must:
  - Increment `rulesVersion`
  - Write immutable snapshot to `completionRulesVersions/{rulesVersion}`
  - Write audit entry (optional) with actor + timestamp + summary

### Validation blocking Save
Save is disabled if:
- Enabled segment weights do not sum to 100
- Threshold outside 0–100
- Any segment missing required fields (ruleType, selector categories, requirement flag)
- Any sites chosen are invalid
- Built-in descriptions segment missing fixed selector categories (should be impossible)

---

## 8) Non-goals (Explicit)

This screen does not:
- Edit attributes directly (that belongs to Attribute Settings)
- Allow media/pricing to be added into completion
- Create hidden defaults or fallback logic
- Provide KPI dashboards

---

## End State Guarantee

After this ships:
- Completion behavior is fully controllable via settings
- Export gating is fully explainable (segment + site + missing attributes)
- No dead controls exist
- No hard-coded readiness logic exists in the path
