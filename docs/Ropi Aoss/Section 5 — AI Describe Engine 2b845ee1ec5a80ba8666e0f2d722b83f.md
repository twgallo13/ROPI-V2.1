# Section 5 — AI Describe Engine

# Section 5 — AI Describe Engine (v1.0)

The AI Describe Engine generates website-specific descriptions and SEO metadata based on:

- Core Information
- Product Attributes
- RICS reference text
- Website selection
- Smart Rules–validated fields

AI is only available when:

- Required attributes are complete
- Website(s) selected
- No blocking observations remain

The user triggers AI from **Tab 5 — AI Actions**.

The AI Describe Engine now integrates with system-wide AI settings defined in `/app/settings/ai` (see "Admin UI Build Spec — Settings CRUD", Section 5 — AI Settings). These global controls determine default templates per site, global tone presets, rate limiting, async generation rules, and experimental feature toggles. When audience templates do not specify a configuration field, the Describe Engine falls back to the corresponding global AI setting.

---

# 5.1 AI Inputs

AI Describe uses:

## From Core Information

- sku, name, slug
- brand, class, category, department
- website (drives output targets)

## From Product Attributes

- gender, ageGroup
- primaryColor, descriptiveColor
- material, outsoleMaterial
- fit, cutType, closureType
- heelHeight, platformHeight
- league, sportsTeam
- collectionName, fastFashion

## From Launch & Media

- hype
- familySizing
- launchDate (if present)

## From RICS (reference only)

- ricsLongDesc
- ricsShortDescription

## Additional global parameters (non-user inputs)

- `defaultTemplateBySite[site]`: Determines which audience template is used if no audience-matched template is found.
- `allowBulkGenerate`: Determines whether `POST /ai/describe-all` is enabled.
- `allowAsyncBatchDescribe`: Allows the engine to run large generation jobs asynchronously.
- `maxSyncDescribePerMinute`: Throttle applied to synchronous Describe requests.
- `maxRegenerations`: Maximum number of times a user can regenerate a description before requiring admin override.
- `experimental.*`: Enables advanced prompt-flow behaviors such as structured bullets or two-pass generation.

These values come from the AI Settings page (`/app/settings/ai`) and are stored in `settings/system/aiSettings`.

---

# 5.2 AI Output Structure

AI generation produces the following fields for each selected website:

### Descriptions

- descriptionShiekh
- descriptionKarmaloop
- descriptionMltd
- descriptionSangremia

### SEO

- metaName
- metaDescription
- keywords

### Scoring

Each site output receives a quality score based on:

- attribute completeness
- clarity
- keyword density
- brand alignment

**Tone Resolution Order:**

1. Use the selected audience template's `voice` configuration if present.
2. If the template does not specify tone, use `globalTonePreset` and `globalToneDescription` from `settings/system/aiSettings`.
3. If neither is set, default to "clean-retail".

This ensures all site outputs have a consistent fallback tone.

---

# 5.3 Generation Modes

## (A) Generate for Single Website

Triggered automatically or manually.

## (B) Generate All

Generates only for websites that were selected in **Core Information**.

If `website = ["[Shiekh.com](http://Shiekh.com)", "MLTD"]` → only those two sites generate.

## (C) Regenerate

User can regenerate any field individually without affecting other sites.

---

# 5.4 Workflow Integration

### W1 Integration (Observations)

AI pauses generation if:

- Attribute inconsistency
- Observations unresolved
- Missing required values

### W2 Integration (Completion)

User runs AI in step 5 of W2.

AI output is populated into Tab 3:

- Site Descriptions
- SEO fields

---

# 5.5 Error Handling & Blockers

AI generation is blocked when:

- Required attributes missing
- Website not selected
- Required SEO fields missing inputs for prompt
- No RICS data when required context missing
- Observations requiring correction exist

Sidebar shows the blockers with details.

**Additional error/blocker cases related to global AI settings:**

- `BULK_GENERATION_DISABLED`: Bulk generation attempted while `allowBulkGenerate === false`.
- `ASYNC_DESCRIBE_DISABLED`: User attempted an async Describe job while `allowAsyncBatchDescribe === false`.
- `MAX_REGENERATIONS_REACHED`: Regenerate attempts exceed `maxRegenerations` for this product/user/session.
- `NO_ACTIVE_DEFAULT_TEMPLATE`: The site's default template is disabled or missing.
- `INVALID_SITE_MAPPING`: A site ID is passed to Describe but does not exist in `defaultTemplateBySite`.

All of these errors must be logged in the Describe telemetry pipeline and surfaced in the Describe API response.

---

# 5.6 Template System (Audience Templates)

The AI Describe Engine uses **audience templates** defined in the Admin UI under `/app/settings/ai-templates` (see "Admin UI Build Spec — Settings CRUD", AI Templates Manager). These templates control:

- Which products they apply to (conditions)
- How the output is formatted (layout, paragraphs, bullets)
- Tone and voice (preset + brand rules)
- SEO patterns (meta title composition)
- Banned/avoid terms

## 5.6.1 Template Source

- Templates are stored in Firestore at `settings/ai/prompts/{templateKey}` using the `AITemplate` model described in Admin UI Build Spec — Settings CRUD, Section 4.2.
- Examples of `templateKey` values:
    - `default`
    - `mens_footwear`
    - `womens_footwear`
    - `kids_gs`
    - `toddler`
    - `apparel_mens`
    - `apparel_womens`
    - `accessories`

## 5.6.2 Selection Algorithm (High Level)

Given a product and a target `site`:

1. Load all `AITemplate` docs where:
    - `scope === 'audience'`
    - `status === 'active'`
2. Evaluate each template's `conditions` against the product document:
    - `field` maps to product attributes (e.g., `gender`, `department`, `ageGroup`, `materials`, `launchDate`).
    - `operator` defines how to compare (e.g., `==`, `is-any-of`, `includes`, `within-last-n-days`).
    - `value` holds the comparison value (string, number, or array).
3. Apply `matchMode`:
    - If `matchMode === 'ALL'`, **all** conditions must be satisfied.
    - If `matchMode === 'ANY'`, **at least one** condition must be satisfied.
4. If one or more audience templates match:
    - Select the best template according to a deterministic priority rule (for v1, simplest is "first matching template in sorted order"; more advanced scoring rules can be introduced later and documented here).
5. If no audience template matches:
    - Use the `default` template as fallback (if `status !== 'disabled'`).

The selection logic itself lives in the AI Describe backend. The settings UI only defines the templates; it does not perform matching.

### 5.6.2 (cont.) Global Fallback & Default Template Per Site

If no audience template matches a product, the Describe Engine loads the global default template for the current site using:

```
settings/system/aiSettings.defaultTemplateBySite[site]
```

If this default template is disabled (`status === 'disabled'`), the engine falls back to the system `default` template key. If that is also disabled, Describe returns a configuration error.

This ensures that Describe never guesses which template to use; it always follows explicit admin-defined priority.

## 5.6.3 Applying Template Fields

Once a template is selected, the AI Describe Engine uses these parts:

- **Formatting (`format`):**
    - `layout` → decides whether to generate headline + paragraph + bullets, paragraph-only, or short blurb.
    - Paragraph min/max, allowTwoParagraphs → influence target word count and paragraph break behavior.
    - Bullet `min`, `max`, `topics` → drive whether to generate bullets and what topics (Fit, Comfort, Durability, Use Case, Care, Traction) to emphasize.
- **Tone & Voice (`voice`):**
    - `preset` → selects a base tone profile (clean retail, hype drop, parent-friendly, tech performance, luxury).
    - `description` → additional freeform guidance.
    - `avoid` and `banned_terms` → explicit words/phrases the model must not use.
    - `brandRules` → brand-specific constraints (e.g., no mentioning certain competitors or phrases).
- **SEO (`seo`):**
    - `metaTitlePattern` → Handlebars-style template for metaTitle (e.g. `brand name | fit category`).
    - `includeFit`, `includeUseCase`, `includeMaterial` → booleans that toggle whether those aspects are emphasized in description and/or metadata.
- **Advanced fields:**
    - `prompt_body`, `seo_rules`, `tone_rules`, `length_rules`, and `examples` provide additional prompt scaffolding and few-shot examples to the underlying LLM.

The engine constructs a full prompt from:

- Product data (Section 2.1)
- Template configuration (`AITemplate`)
- Site-specific context (e.g. Shiekh vs MLTD)
- Any global AI settings (once defined in `/app/settings/ai`)

## 5.6.4 Backward Compatibility

Older templates that only have the simpler fields (`prompt_body`, `seo_rules`, `tone_rules`, `length_rules`, `examples`, `banned_terms`) are **normalized** into the full `AITemplate` shape by the Admin UI and/or backend before use. Missing fields fall back to the default values described in the Settings CRUD spec.

---

# 5.7 AI Action Logging

All AI actions are written to the AI Action Log with:

- timestamp
- user
- action type (validate, suggest, generate)
- site target
- fields updated

The log is visible in Tab 5.

---

# 5.8 Prompt Construction Pipeline

Global AI settings merge into the prompt pipeline after template resolution:

1. Determine audience-matched template (or default template per site).
2. Merge template-level voice, SEO, formatting, and rules.
3. If any template fields are missing, apply fallback values from `aiSettings`:
    - `globalTonePreset`
    - `globalToneDescription`
    - experimental flags (`enableAdvancedSEO`, `enableStructuredBullets`, etc.)
4. Apply system limits (`maxRegenerations`, `maxSyncDescribePerMinute`, bulk-generate permissions).
5. Build the final prompt including:
    - product data
    - audience template data
    - global settings
    - site-level behavior

The Describe Engine must never produce output that contradicts settings defined in `/app/settings/ai`.

---

# 5.9 Describe UX Integration (Admin + Product Completion)

The Describe Engine is consumed by two main UX surfaces:

1. **Settings**
    - Admins configure templates and global controls
    - Preview panel shows how changes influence Describe
2. **Product Completion Workflow**
    - Shows which template matched
    - Highlights matched conditions
    - Provides regenerate options using:
        - Current template
        - Selected alternate templates
    - Enforces safety limits from AI Settings

---

# 5.10 Template Match Explanation

The Describe response includes a machine-readable block:

```json
{
  "matchedTemplate": "mens_footwear",
  "matchMode": "ALL",
  "matchedConditions": [
    { "field": "gender", "value": "mens" },
    { "field": "department", "value": "footwear" }
  ]
}
```

The Product Completion UI surfaces this to help admins understand why a template applied.

---

# 5.12 Performance & Caching (Settings Integration)

The Describe Engine must respect `aiPerformanceSettings` from `settings/system/aiPerformanceSettings`:

- **Concurrency:**
    - Reject or queue new Describe requests when `maxConcurrentPerUser` or `maxConcurrentGlobal` is exceeded.
- **Async Jobs:**
    - Enforce `maxItemsPerAsyncJob` for async Describe tasks.
- **Caching:**
    - When `enableResultCaching = true`, reuse Describe output for identical (product, site, templateKey) requests within `cacheTTLMinutes`.
    - Invalidate cache entries when:
        - The product document changes in Describe-relevant fields.
        - The matched audience template is updated.
- **Limit Behavior:**
    - If `onLimitBehavior = 'reject'`, Describe returns a clear error.
    - If `onLimitBehavior = 'queue'`, Describe accepts the request and processes it once capacity is available (subject to `maxQueueDepth`).

Timing metrics (if enabled) must be emitted to the observability stack defined in Section 11.

---

[← Back to ROPI AOSS Hub](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)