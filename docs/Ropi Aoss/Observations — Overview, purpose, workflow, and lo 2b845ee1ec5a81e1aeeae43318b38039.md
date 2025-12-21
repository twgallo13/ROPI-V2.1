# Observations — Overview, purpose, workflow, and logic

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

# Observations — Overview (v1.1)

Observations are **ground-truth inputs** that describe what the product *actually is*, based on human inspection and image-analysis signals. They form the factual core used by W1, W2, Smart Rules, AI Describe, and AI Complete.

Observations combine:

- human insight (notes, tags, structured tokens)
- uploaded images
- ai_insights from automated image analysis
- metadata (camera, timestamps)
- verification status

They serve as the **trusted source of truth** for downstream AI and rules-based systems across ROPI.

## O0.0 — Role of Observations in AOSS

Observations exist to:

1. Capture physical traits missing from imports
2. Provide evidence for attribute decisions
3. Reduce hallucination in AI Describe
4. Create Smart Rules triggers
5. Enable W1/W2 automation
6. Provide clean, auditable signals for Search, Filters, and Exports

Observations are *not optional.*

They are the input layer for the entire AOSS product completion pipeline.

---

## O1.0 — Purpose & Rationale (v1.1)

Observations exist to solve critical gaps in manufacturer data and imports.

### O1.1 — Why Observations Matter

1. **Reality vs data**
    
    RICS/PO data is authoritative but incomplete; Observations capture real-world product truth.
    
2. **High-quality attribute evidence**
    
    Image + notes = factual signals for material, closure, features, color, silhouette, and pattern.
    
3. **AI stability**
    
    Verified observations constrain AI Describe to factuality.
    
4. **Studio ergonomics**
    
    Store/studio users can capture details directly from the product rack.
    
5. **Verification & Auditability**
    
    When Merch verifies an observation, it becomes the strongest evidence layer in AOSS.
    

### O1.2 — Where Observations Are Used

- W1 — Observations Capture & Apply
- W2 — Full Product Completion
- Smart Rules suggestion + auto-apply logic
- AI Describe (Section 5)
- AI Complete
- Attribute validation (Section 2)
- Admin workflows (Section 13)
- Export & launch operations (Section 7)

---

## O2.0 — Observation Schema (v1.1)

This defines the canonical structure for an Observation document.

### O2.1 — Required Fields

- `obsId`
- `productId`
- `created_by`
- `created_at`
- `notes` (short free text)
- `images[]` (zero or more)
- `verified` (default: false)

### O2.2 — Optional Fields

- `ai_insights[]`
- `tags[]`
- `confidence`
- [`metadata.camera](http://metadata.camera)_make`
- [`metadata.camera](http://metadata.camera)_model`
- `metadata.exif_date`
- `updated_by`
- `updated_at`

### O2.3 — Full JSON Schema (Notion-friendly)

```json
{
  "obsId": "string",
  "productId": "string",
  "created_by": "string",
  "created_at": "ISO-8601",
  "notes": "string",
  "images": ["string"],
  "ai_insights": ["string"],
  "verified": false,
  "metadata": {
    "camera_make": "string",
    "camera_model": "string",
    "exif_date": "ISO-8601"
  },
  "updated_by": "string",
  "updated_at": "ISO-8601"
}
```

### O2.4 — Constraints

- No GPS stored
- No PII allowed
- Notes limited to 500 characters
- ai_insights must include confidence
- Verified observations override system-generated evidence

---

## O3.0 — Storage & Upload Rules (v1.1)

### O3.1 — Storage Locations

Observations and their images are stored under:

```
/products/{productId}/observations/{obsId}
```

Images stored under:

```
/products/{productId}/observations/{obsId}/{filename}.jpg
```

### O3.2 — File Rules

- Accept: JPG, PNG
- Max size: 5 MB (client should resize)
- Remove all GPS EXIF
- Allow camera model/date
- Only authenticated signed URLs may upload

### O3.3 — Upload Workflow

1. Client requests signed URL
2. Client uploads image to Storage
3. Client posts Observation doc
4. Server writes doc and logs event
5. Image analysis pipeline begins (O4.0)

### O3.4 — ActivityLog Requirements

Every upload must generate:

- `image.uploaded`
- `observation.created`
- traceId (Section 11.7)

---

## O4.0 — AI Insights (v1.1)

AI Insights (ai_insights) are automatically generated product traits extracted from uploaded images using the Vision pipeline.

### O4.1 — Purpose of AI Insights

- Provide factual product traits
- Reduce manual observation entry
- Enable Smart Rules triggers
- Improve AI Describe stability
- Provide evidence for attribute suggestions

### O4.2 — AI Insights Structure

Each ai_insights entry MUST have:

- `sourceImageId`
- `traits[]` (normalized tokens)
- `confidence`
- `timestamp`
- `model_version`

### O4.3 — Supported Trait Types

- Material (mesh, suede, leather)
- Closure type (buckle, lace, strap)
- Feature detection (strap, reflective, padded collar)
- Text detection
- Color detection (normalized colorFamily)
- Pattern detection

### O4.4 — ai_insights Example

```json
{
  "sourceImageId": "img_456",
  "traits": {
    "material": "mesh",
    "closure": "buckle",
    "features": ["strap"],
    "colorFamily": ["black"]
  },
  "confidence": 0.91,
  "model_version": "vision-v4"
}
```

### O4.5 — Observability Links

Log events (Section 11.2):

- `image.analyzed`
- `ai_insights.generated`
- `ai_insights.error`

Metrics (Section 11.3):

- ai_insights.generation_rate
- ai_insights.confidence_distribution

Alerts (Section 11.4):

- Vision API outages
- Low-confidence spike
- Frequent ai_insights failures

---

## O5.0 — Observation Categories (v1.1)

Observations must be classified into one of the normalized categories below. These categories tie directly into Smart Rules (Section 4) and AI Describe (Section 5).

### O5.1 — Human Captured Categories

- Material
- Construction
- Closure type
- Sizing / Fit notes
- Features (pockets, straps, padding)
- Product Story / Marketing Notes
- Retail QA notes
- Regulatory notes

### O5.2 — System Captured Categories

- ai_insights traits
- Image metadata (non-GPS EXIF)
- Imported RICS anomalies
- Smart Rules suggestions

### O5.3 — Category Constraints

- Every Observation MUST have exactly one category
- Category determines which Smart Rules apply
- Some categories only allowed for specific product types
- No cross-category overwrites unless user-authorized

---

## O6.0 — Validation Rules (v1.1)

All observations must pass strict validation prior to acceptance.

### O6.1 — Required Validation

- Product must exist
- User must have W1 permission (Section 13)
- Notes must not exceed 500 characters
- No ambiguous attribute terms
- No PII
- ai_insights must include confidence

### O6.2 — Domain Rule Validation (Section 2.3)

Observation values must not violate:

- Allowed enums
- Attribute relationships
- Category restrictions

### O6.3 — Image Validation

- Image must pass safety scanning
- EXIF must be stripped of GPS tags
- File must be valid JPG/PNG
- File size under limit

### O6.4 — Failure Handling

Validation failure results in:

- Soft block → observation not saved
- Log: `observation.validation_failed`
- traceId captured (11.7)

---

## O7.0 — Merge & Precedence Logic (v1.1)

When multiple sources provide information, precedence rules determine the final attribute value.

### O7.1 — Precedence Order

1. Human-edited attributes
2. Verified observations
3. Unverified observations
4. ai_insights
5. Smart Rules
6. Imports

### O7.2 — Verification Rules

- Verified observations override ALL automated systems
- Only Merch / Admin may verify
- Verified entries cannot be auto-overwritten

### O7.3 — Conflict Detection

Conflicts occur when:

- Two sources assign different values to the same attribute
- A value violates domain rules
- ai_insights generate conflicting data
- Smart Rules and observations disagree

### O7.4 — Conflict Resolution

Winners:

1. Human
2. Verified observation
3. Unverified observation
4. ai_insights
5. Smart Rules
6. Imports

Every resolution logs:

- `conflict.detected`
- `conflict.resolved`

---

## O12.0 — Observability Hooks (v1.1)

Observations are fully monitored under Section 11 (Observability v1.1). Every event must be logged, traced, and measured.

### O12.1 — Required Logs

- `observation.created`
- `observation.updated`
- `observation.verified`
- `observation.deleted`
- `image.uploaded`
- `ai_insights.generated`
- `smart_rules.triggered`
- `conflict.detected`
- `conflict.resolved`

### O12.2 — Metrics (Section 11.3)

- observations.created_per_hour
- ai_insights.confidence_distribution
- smart_rules.trigger_rate
- validation.error_rate
- conflicts.detected
- conflicts.resolved

### O12.3 — Tracing (Section 11.7)

Every observation action must attach:

- `traceId`
- `spanId`
- `productId`
- `actorId`
- `workflow: "W1"`

### O12.4 — Alerts (Section 11.4)

Alert when:

- ai_insights generation fails >5%
- conflict storms occur
- validation errors spike
- upload failures exceed threshold

---

## O13.0 — Tests (v1.1)

Observations require full test coverage across schema, workflow, AI, rules, and observability.

### O13.1 — Observation Tests

- Create → stored correctly
- Update → version increment
- Delete → soft-delete rules enforced

### O13.2 — Image Tests

- EXIF GPS stripped
- Invalid file rejected
- AI pipeline triggered

### O13.3 — AI Insights Tests

- ai_insights generated
- Low-confidence behavior
- Failure-mode handling (timeout, invalid image)

### O13.4 — Smart Rules Tests

- Rule triggers
- Rule outputs
- Rule safety constraints

### O13.5 — Merge & Precedence Tests

- Verified observation wins
- Conflicts resolved correctly
- Domain rule enforcement

### O13.6 — Observability Tests

- Logs emitted
- Metrics recorded
- Alerts triggered
- Trace propagation

---

## O14.0 — Section Summary (v1.1)

Observations are the factual foundation of AOSS.

They power W1, enrich W2, trigger Smart Rules, stabilize AI Describe, and provide the clearest source of truth across the product catalog.

This section defined:

- The role of Observations
- Schema & validation rules
- ai_insights pipeline
- Conflict resolution
- Storage rules
- Observability hooks
- Tests & reliability expectations

Observations ensure the entire catalog is stable, factual, auditable, and AI-ready.

### Search & Filters Integration

Observations provide clean, auditable signals for Search and Filters:

- Observations related to attribute quality, tagging, and domain consistency improve filter reliability.
- When attributes used as facets (configured under `/app/settings/search`) are incomplete or inconsistent, Observations can flag products as "filter-risk" until corrected.
- This ensures the product catalog list shows trustworthy filter counts and prevents broken or confusing filter experiences.

See also: Search & Filter Settings in "Admin UI Build Spec — Settings CRUD".

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)