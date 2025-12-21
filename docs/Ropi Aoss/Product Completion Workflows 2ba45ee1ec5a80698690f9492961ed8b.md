# Product Completion Workflows

# Product Completion Workflows — Overview (v1.0)

AOSS v1.0 defines two complementary product workflows:

- **W1 — Observations Capture & Apply**
- **W2 — Full Product Completion (One-Person Process)**

Both workflows now operate entirely within the unified Product Editor workspace.

---

## Upstream Data Flow (Imports → W2)

Workflow W2 assumes that most products enter AOSS through the **Import Engine**, which:

- Ingests source rows as defined in **Import Engine — Row Schema (Section 3.1)** [Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)
- Cleans and standardizes data via **Import Normalization Rules (Section 3.2)** [Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)
- Writes normalized product documents into Firestore, ready for completion in the Product Editor

W2 then picks up from that normalized state, moving from "imported row" → "complete, export-ready product" within the unified Product Editor (tabs 1–5).

---

# 1. Unified Product Workspace

Each product has:

### The 5 editor tabs:

1. Core Information
2. Product Attributes
3. Descriptions & SEO
4. Launch & Media
5. AI Actions

### And the right sidebar panels:

- Observations
- Smart Suggestions
- Export Readiness

The user never leaves the page during completion.

---

# 2. Workflow W1 — Observations Loop

W1 covers:

- Recording issues
- Reviewing Smart Suggestions
- Applying corrections
- Resolving attribute inconsistencies

W1 ensures product data is correct **before** the user generates descriptions.

---

# 3. Workflow W2 — Completion Loop

W2 covers the step-by-step creation of a product, from raw import to export readiness, including:

- Completing all core attributes
- Completing descriptive attributes
- Generating site-specific descriptions
- Providing accurate SEO
- Completing launch and media requirements
- Passing all export checks

The user follows W2 from tab 1 to tab 5 sequentially.

---

# 4. Intersection of W1 and W2

Both workflows operate in parallel:

| Workflow Piece | Purpose | Interaction |
| --- | --- | --- |
| W1 (Observations) | Validate and correct | Sidebar suggestions update fields during W2 |
| W2 (Completion) | Build required data | Completion triggers new suggestions in W1 |
| AI Actions | Enhance & generate | Requires W1 issues resolved |
| Export Readiness | Verify | Driven by both W1 and W2 |

W1 ensures correctness.

W2 ensures completeness.

Together they create publishable product data.

## Describe Preview State

Before completing a product, the user can enter a preview state that shows:

- Which audience template matched
- Which conditions matched (e.g., gender = mens, department = footwear)
- Tone preset applied (template-level or global override)
- Bullet count and paragraph settings
- Expected SEO title (rendered from metaTitlePattern)

This helps validate the expected output before finalizing.

## Describe Acceptance Behavior

When the user accepts the generated description:

- `description<Site>` is written
- `metaName`, `metaDescription`, `keywords` are updated
- A snapshot of the matched template key is stored in product history
- Regeneration counters update to prevent infinite retries

---

# 5. Completion Outcome

A product is considered complete when:

- All core and attribute fields meet validation rules
- Website selections align with site requirements
- Images meet minimum upload requirements
- All descriptions exist for selected websites
- All SEO fields are complete
- No blocking observations remain

When all criteria pass, the product is safe for export.

---

## Related Workflows

- **Workflow W1 — Observations Capture & Apply to Product**
    
    [Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)
    
- **Workflow W2 — Full Product Completion (One-Person Process)**
    
    [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)
    

---

[← Back to ROPI AOSS Hub](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)