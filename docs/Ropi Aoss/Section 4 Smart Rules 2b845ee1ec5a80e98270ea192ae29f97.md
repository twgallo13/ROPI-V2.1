# Section 4 Smart Rules

# Section 4 — Smart Rules (v1.0)

Smart Rules are automated, deterministic transformations that improve attribute data **before AI generation** and **before export validation**.

Smart Rules are NOT AI.

They are transparent, predictable, and rules-based.

Smart Rules operate on:

- Core Information
- Product Attributes
- Launch & Media metadata
- Website-driven requirements
- RICS reference text

Smart Rules output **Smart Suggestions** (right sidebar), never auto-overwrite fields.

---

# 4.1 Smart Rules Pipeline

Smart Rules run in three scenarios:

1. **On Product Load**
2. **When an attribute changes**
3. **When an Observation is added (W1)**

In all cases, Smart Rules produce structured suggestions, such as:

```json
{
  "field": "primaryColor",
  "suggestedValue": "Black",
  "reason": "Detected color from descriptiveColor: 'Black/White'"
}
```

Suggestions appear in the **Smart Suggestions sidebar**.

---

# 4.2 Rule Categories

## (A) Identity & Demographic Rules

- If `ageGroup` is missing but shoe size mapping suggests grade school → suggest `"Grade School"`.
- If `gender` is missing but product name contains "Wmns" → suggest `"Womens"`.

## (B) Color Rules

- If `primaryColor` missing but first color token in `descriptiveColor` is valid domain → suggest primaryColor.
- If descriptiveColor inconsistent with images (future feature) → flag observation.

## (C) Material / Construction Rules

- If RICS_LongDesc contains keywords (e.g., "leather") → suggest material update.
- If "mid" appears in RICS → suggest `"Mid"` for `shoeHeightMap`.

## (D) Sports Rules

- If league ∈ {NBA, NFL, MLB, NHL} and sportsTeam is empty → require Smart Suggestion.
- If sportsTeam appears in name but league missing → suggest league.

## (E) Website Rules

- If website list includes a site, show required fields for that site.
- If a site has no description → generate a suggestion for Tab 3.

## (F) Launch & Media Rules

- If launchDate is missing but hype = true → suggest setting launchDate.
- If image count < 4 → Smart Suggestion to upload required minimum.

## (G) SEO Rules

- If metaDescription missing → generate suggestion from name + attributes.
- If keywords empty → suggest tokenized list.

---

# 4.3 Rule Execution Example

When a new Observation is added:

1. System parses text:
    - "Color should be Black/Red"
2. Smart Rule triggers:
    - Suggest update to descriptiveColor
    - Suggest primaryColor = "Black"
3. Sidebar displays suggestions
4. User applies the ones they want

---

# 4.4 Output of Smart Rules

Each rule produces:

- `field`
- `oldValue`
- `suggestedValue`
- `confidence`
- `reason`
- `observationLink` (if triggered from W1)

Smart Rules never overwrite fields automatically.

---

# 4.5 Interaction with Export Readiness

Smart Rules power several readiness checkpoints:

- Required Attributes
- Website Descriptions
- Image Minimum
- SEO Fields
- Tax Class

All Smart Suggestions must be applied or ignored before export.

---

### Cross-Links

Smart Rules affect downstream AI systems:

- **AI Templates:** Since audience templates rely on product attributes for matching, Smart Rules can directly affect which template is selected.
- **AI Settings:** Global AI Settings control Describe behavior such as default templates per site, tone, rate limits, and async generation. Smart Rules may interact with these settings when transforming fields.
- **Describe Engine:** Smart Rules run before Describe. Any attribute normalization or flag-setting will influence both template matching and prompt composition.

Admins should review AI Templates and AI Settings whenever making major Smart Rules changes to avoid unintended template selection shifts.

---

[← Back to ROPI AOSS Hub](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)