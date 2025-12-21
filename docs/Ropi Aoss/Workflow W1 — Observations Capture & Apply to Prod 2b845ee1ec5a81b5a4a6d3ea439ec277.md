# Workflow W1 — Observations Capture & Apply to Product

## Workflow W1 — Observations Capture & Apply to Product (Updated for Editor v1.0)

### Purpose

W1 defines how internal users record product insights and how the system converts those insights into Smart Suggestions that can be applied directly to the product.

This workflow supports:

- Quality checks while products are being built
- Launch verification (materials, colors, dates, pricing)
- AI generation accuracy (attributes must be correct before generation)
- Cross-team collaboration (Merchant, Buyer, Copywriter, Ops)

---

## 1. Observation Entry (Right Sidebar)

Observations are recorded from the **right sidebar** of any product:

- Free-text or image-based inputs
- Status tags: *open*, *resolved*
- Severity tags: *low*, *medium*, *high*
- Auto-timestamp + user ID
- Optional suggested changes (structured key/value diffs)

Users never leave the product page; observation entry is always available.

---

## 2. Automatic Routing to Smart Suggestions

When an observation is added:

1. System parses the text
2. Maps detected issues to attributes in the product schema
3. Produces **Smart Suggestions** (right sidebar panel)
4. Each suggestion includes:
    - Target attribute
    - Proposed new value
    - Reason (observation reference)
    - Confidence score
    - Apply / Ignore actions

Smart Suggestions never overwrite fields automatically. Human approval is required.

---

## 3. Applying Observations to Product

User reviews suggestions **without leaving the product**:

- Click **Apply** → attribute updates instantly
- Click **Ignore** → suggestion dismissed
- All changes appear in **Product History** tab

Applied suggestions immediately update:

- Export Readiness scores
- AI Actions eligibility
- Website-specific content requirements

---

## 4. Integration with Editor Tabs

W1 integrates directly with the new 5-tab layout:

- **Core Information** — foundational data for observations
- **Product Attributes** — color/material/fit corrections are common suggestions
- **Descriptions & SEO** — flagged inconsistencies from buyer or brand
- **Launch & Media** — launch date, pricing, hype verification
- **AI Actions** — observations must be resolved for highest-quality generation

The user never switches pages; all review and application happens in a single workspace.

---

## 5. Completion & Resolution

When all issues are addressed:

- Observations marked **resolved**
- Export Readiness updates
- Smart Suggestions panel clears

W1 ends when the product is free of open observations that block completion or export.

---

[← Back to ROPI AOSS Hub](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)