# 🧩 Workflow W2 — Full Product Completion (One-Person Process)

## Workflow W2 — Full Product Completion (One-Person Process)

### Purpose

W2 is the single-user method of completing a product from import → attributes → descriptions → launch data → export readiness.

It is optimized for speed and accuracy using the new 5-tab Product Editor.

---

# 1. Start at the Product Editor

User lands on a SKU with:

- Header metadata (received dates, inv, status)
- 5 editing tabs
- Right-sidebar: Observations, Smart Suggestions, Export Readiness

The user completes the product top-to-bottom in a single session.

### Upstream Source (Import Engine)

In the standard AOSS flow, the SKU the user lands on was created by the **Import Engine**:

- Source rows were mapped into the product model using **Import Engine — Row Schema (Section 3.1)** [Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)
- Values were cleaned and standardized according to **Import Normalization Rules (Section 3.2)** [Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)

W2 assumes this import + normalization has already happened. The user's job in W2 is to finish the product from "normalized import" to "export-ready" using the 5-tab Product Editor and Export Readiness sidebar.

---

# 2. Tab 1 — CORE INFORMATION

User completes all foundational fields:

- SKU, Style ID, MPN
- Name, Slug
- Brand, Category, Class, Department
- **Website multi-select (critical)**
- Active status
- Lifecycle meta (first received, last received, launch date if relevant)
- Dimensions (height, length, width, weight)

**Rules:**

- Website selection determines which descriptions the AI will generate.
- Missing core fields will block Export Readiness.

---

# 3. Tab 2 — PRODUCT ATTRIBUTES

User fills all descriptive fields:

- Gender, Age Group
- Primary Color + Descriptive Color
- Material, Outsole Material, Closure, Cut, Fit
- Heel/Platform fields (optional)
- Shoe Height Map, Made In
- Sports attributes (league, sportsTeam)
- Flags: Collection Name, Fast Fashion
- **Tax Class (required for export)**

Smart Suggestions appear in the sidebar if anything looks inconsistent.

---

# 4. Tab 3 — DESCRIPTIONS & SEO

User works through three sections:

### (A) Site Descriptions (per selected website)

- descriptionShiekh
- descriptionKarmaloop
- descriptionMltd
- descriptionSangremia

**Fields appear only if the website is selected.**

### (B) SEO Fields

- Meta Name
- Meta Description
- Keywords

### (C) RICS Reference (read-only)

- RICS Long Description
- RICS Short Description

RICS data is for reference + AI signal; never exported.

---

# 5. Tab 4 — LAUNCH & MEDIA

User completes launch-related data:

### Product Images

- Upload minimum 4 images
- Reorder
- Media Status
- Hide Image Date

### Core Pricing (Launch)

- MAP
- SCOM Regular Price
- SCOM Sale Price
- Promo

### Shipping Overrides

- Standard Shipping Override
- Expedited Override Shipping

### Internal Launch Message

- Custom message (internal only)

---

# 6. Tab 5 — AI ACTIONS

Actions use the current attributes and selected websites:

- Generate Description (single site)
- Generate All (only for selected sites)
- Suggest Keywords
- Validate Name

W2 requires:

- Core Information complete
- Product Attributes complete
- Website selected
- Observations resolved

AI output fills Description + SEO fields in Tab 3.

### AI Description Step (Integrated with Section 5 — AI Describe Engine)

During product completion, the AI description step consists of:

1. Running Describe to generate a first-pass description, bullets, meta tags, and keywords.
2. Allowing the user to regenerate sections based on selected templates.
3. Previewing tone and structure derived from:
    - Audience Template (Section 4 — AI Templates Manager)
    - Global AI Settings (`/app/settings/ai`)
4. Flagging any missing attributes required by the selected template (e.g., gender, materials, ageGroup).
5. Automatically writing fields back into the product document on acceptance.

A template card shows which template matched and why (conditions evaluated).

### Describe Errors & Blockers

If Describe cannot run, the UI must show a structured error sourced from the Describe Engine:

- Missing required attributes (template-level or schema-level)
- All matching templates disabled
- No default template for this site
- Bulk generation disabled (per AI Settings)
- Regeneration limit reached (per AI Settings)
- Attribute values invalid per Attribute Registry

---

# 7. Handle Observations & Suggestions During Editing

At any moment:

- Observations can be logged
- Smart Suggestions appear
- User resolves issues inline before generating or exporting

This ensures descriptions + export data stay accurate.

---

# 8. Export Readiness (Sidebar)

The Export Readiness sidebar tells the user whether the product is ready to be included in **RetailOps CSV exports**.

Export Readiness is a **data completeness + validation** state. It does **not** depend on media or Launch Calendar presentation.

A product is considered **"Ready for Export"** when all of the following are TRUE:

1. **Core Information is complete**
    - `brand`
    - `name`
    - `mpn`
    - `sku` (or equivalent SKU field)
    - `department`, `class`, and `category`
    - At least one `website` selected (the site(s) this product will appear on)
2. **Product Attributes are complete**
    - Key descriptive attributes:
        - `gender`
        - `ageGroup`
        - `primaryColor`
    - Tax/classification:
        - `taxClass` is set
    - Additional attributes required by domain rules (Section 2.3) for this type of product are present.
3. **Descriptions & SEO are complete (per selected website)**
    
    For every website selected in `website`:
    
    - Site-specific description exists:
        - e.g. `descriptionShiekh` for Shiekh
        - `descriptionKarmaloop` for Karmaloop, etc.
    - Basic SEO fields are filled:
        - `metaName`
        - `metaDescription`
    - RICS Long/Short descriptions are **reference-only**:
        - They do not count as "done".
        - They are not exported.
4. **Validation passes**
    - `statusFlags.validation_status === "valid"`:
        - No blocking validation errors (missing required fields, invalid values).
    - Any Smart Rules marked as "blocking" have been resolved.
    - Any Observations marked as "blocking" have been resolved (or explicitly ignored where allowed).
5. **Ready-for-export has been confirmed**
    - `statusFlags.ready_for_export === true` is set by the app when the checklist above has no blocking items.

## 8.1 What Does NOT Affect Export Readiness

The following do **not** block a product from being "Ready for Export":

- Number of images or any image-related fields
- Launch Calendar-specific fields:
    - `launchDate`
    - `klPostDate`
    - `hype`
    - `familySizing`
- Shipping overrides:
    - `standardShippingOverride`
    - `expeditedOverrideShipping`
- Internal-only fields:
    - `customMessage`
    - Any purely internal tags or notes

These may be important for **Launch Calendar quality** or internal workflows, but they are not part of the export readiness gate for RetailOps CSV.

## 8.2 Sidebar UI Behavior

The sidebar summarizes readiness as:

```
Export Ready: 72%  ███████░░░
Blocking: Tax Class, Shiekh Description
Warnings: Meta Description (Karmaloop)
```

- **Blocking items** must be fixed before `ready_for_export` can be set to `true`.
- **Warnings** are recommended but do not block export; they can be left unresolved.

When all blocking items are resolved:

- The sidebar shows `Export Ready: 100%`.
- The system sets:
    - `statusFlags.validation_status = "valid"`
    - `statusFlags.ready_for_export = true`

This state is what the **Export Manager** (Section 7.x) uses to show products in the **Export Queue** for RetailOps CSV.

> **Next Step:**
> 

> Once a product reaches `ready_for_export`, it appears in the queue defined in
> 

> [Export Manager — RetailOps CSV Workflow](Export%20Manager%20%E2%80%94%20RetailOps%20CSV%20Workflow%2073e34ec744234dc3a9ad043c36bdbdc6.md).
> 

---

---

# 9. Product Completion Output

When W2 is complete:

- Product is export-ready
- All descriptions exist
- All observations resolved
- All Smart Suggestions applied/ignored
- Export Preview is available

W2 ends when the product satisfies Export Readiness with no blocking items.

### Cross-Links

- AI Templates influence describe structure, tone, and SEO (Section 4 — AI Templates Manager).
- AI Settings influence defaults, rate limits, and fallback behavior (Settings: `/app/settings/ai`).
- Attribute Registry enforces required data consistency before Describe.
- Smart Rules may adjust product fields before Describe runs.

---

[← Back to ROPI AOSS Hub](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)