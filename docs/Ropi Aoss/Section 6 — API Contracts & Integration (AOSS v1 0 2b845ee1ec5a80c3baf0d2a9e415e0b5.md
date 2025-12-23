# Section 6 — API Contracts & Integration (AOSS v1.0)

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

**Owner:** John / Theo

**Version:** AOSS v1.0 — API v1

**Date:** 2025-11-25

---

## 6.0 Summary / How to use this section

This section is the authoritative API contract for ROPI. Use it to:

**Owner:** John / Theo

**Version:** AOSS v1.0 — API v1

**Date:** 2025-11-25

---

### Cross-Link: Export Settings

Outbound export mappings and formatting are controlled in `/app/settings/export-settings`.

The export pipeline must:

- Use mapped field names from `fieldMappingsBySite`
- Apply transforms listed in `outputTransforms`
- Include/exclude optional fields based on `includeOptionalFields`

See "Admin UI Build Spec — Settings CRUD", Section 7 — Export Settings.

---

### Cross-Link: Search & Filter Settings

The `filters` query param and search endpoint behavior must respect configuration in `/app/settings/search`:

- Only attributes listed in `searchSettings.facets` are exposed as UI filters.
- Filter values are validated against the Attribute Registry domain rules.
- Searchable fields used by full-text queries are defined in `searchSettings.searchableFields`.

See "Admin UI Build Spec — Settings CRUD", Section 8 — Search & Filter Settings.

---

## 6.0 Summary / How to use this section

This section is the authoritative API contract for ROPI. Use it to:

- Implement server-side routes (Cloud Functions) and client code.
- Generate typed SDKs from OpenAPI.
- Validate front-end integration and CI contract tests.
- Integrate third-parties (Magento / RO) using the Export contract.

**Files to add to your repo:**

- `06-api/openapi.yaml` — primary API spec (below).
- `06-api/error-codes.md` — error catalog (below).
- `06-api/ts-client-example.ts` — TypeScript client usage examples (below).
- `06-api/integration-guides/magento.md` — Magento/RO integration guidance (below).
- `06-api/postman_collection.json` — optional (I can generate on request).

### 6.0.1 Launch Calendar Export APIs (Public vs Internal)

The Launch Calendar uses two related API surfaces that project from the unified product model defined in Section 2.1 and the Launch & Media tab in Section 7.

### Public Launch Calendar feed — `GET /public/launch-cards`

- No Firebase auth required (for [Shiekh.com](http://Shiekh.com) frontend, edge worker, or build pipeline).
- Returns a restricted, public-safe representation of launch products.
- Fields are derived from:
    - Core Information
    - Product Attributes
    - Launch & Media (public-safe subset)
    - Descriptions & SEO ([Shiekh.com](http://Shiekh.com) only)

**Example response shape (simplified):**

```json
{
  "launchCards": [
    {
      "productId": "prod_123",
      "sku": "NKM90-001-GS",
      "name": "Nike Air Max 90 GS",
      "brand": "Nike",
      "gender": "Unisex",
      "ageGroup": "Grade School",
      "primaryColor": "Black",
      "descriptiveColor": "Black/White",
      "launchDate": "2025-01-12",
      "hype": true,
      "familySizing": "Family Sizing",
      "imageUrl": "[https://cdn.example.com/](https://cdn.example.com/)...",
      "productUrl": "[https://shiekh.com/](https://shiekh.com/)...",
      "descriptionShiekh": "<p>Street-ready version of the classic Air Max 90...</p>"
    }
  ]
}
```

**Important:**

- Public feed MUST NOT expose:
    
    ◦ `customMessage`
    
    ◦ RICS reference fields (`ricsLongDesc`, `ricsShortDescription`)
    
    ◦ Export readiness status
    
    ◦ Tax class or internal pricing overrides
    
- Public feed focuses on:
    
    ◦ Display info (name, brand, colors, gender, ageGroup)
    
    ◦ Launch info (launchDate, hype, familySizing)
    
    ◦ Hero image + product URL
    
    ◦ [Shiekh.com](http://Shiekh.com) description only
    

### Internal Launch Calendar feed — `GET /launch-cards`

- Firebase-authenticated, internal-only endpoint.
- Returns full internal launch card representation including:
    
    ◦ Internal launch message (`customMessage`)
    
    ◦ Media status and counts
    
    ◦ Export readiness flags
    
    ◦ Additional meta fields for Ops and Merch roles
    
- Honors:
    
    ◦ Role-based access rules (Section 9 — Firebase Implementation & Security)
    
    ◦ Launch Calendar behavior (Section 7 — Frontend & Launch Calendar)
    

---

## 6.1 API design principles & conventions (quick)

---

### 6.0.2 Product & AI Describe Core Endpoints (Overview)

This section summarizes the key endpoints that interact with the product model (Section 2.1) and the AI Describe Engine (Section 5). Full details are in the OpenAPI spec (Section 6.2).

### Products

- `GET /api/v1/products/{productId}`
    - Returns the full product document as defined in Section 2.1.
    - Includes all editor tabs: Core Information, Product Attributes, Descriptions & SEO, Launch & Media.
- `PATCH /api/v1/products/{productId}`
    - Partial update of product fields.
    - Validated against Attribute Validation Schema (Section 2.2) and Domain Rules (Section 2.3).
    - Smart Rules (Section 4) may produce Smart Suggestions based on changes, but do not auto-apply.

### AI Describe

- `POST /api/v1/ai/describe`
    - Generates or refreshes descriptions for a specific product and website.
    - Body (simplified):
        
        ```json
        {
          "productId": "prod_123",
          "site": "[Shiekh.com](http://Shiekh.com)",
          "templateKey": "shiekh.default"
        }
        ```
        
    - Uses:
        - Core Information
        - Product Attributes
        - Launch & Media highlights (hype, launchDate, familySizing)
        - RICS reference text
    - Writes into:
        - `descriptionShiekh` (or the site-specific description field)
        - `metaName`, `metaDescription`, `keywords` as needed

**Generate All behavior (frontend):**

- The "Generate All" button in the Product Editor (AI Actions tab) is a **frontend convenience**:
    - Reads the current `website` multi-select for the product.
    - Calls `POST /api/v1/ai/describe` once per selected site.
    - There is no separate "generate-all" API; it is just multiple per-site calls using the same endpoint.

This keeps the API surface small and the behavior consistent with Section 5 — AI Describe Engine and Section 7 — Frontend & Launch Calendar.

---

## 6.1 API design principles & conventions (quick)

- Base path: `/api/v1`

## 6.0.3 Export API Contract (RetailOps CSV Batches)

The Export API supports:

### 1. Export Queue Retrieval

Returns all products where:

- `ready_for_export = true`
- `validation_status = "valid"`
- `uploaded_to_ro = false`

**Shape:**

```json
{
  "productId": "...",
  "sku": "...",
  "brand": "...",
  "websites": ["shiekh", "karmaloop"],
  "completion": {...},
  "statusFlags": {...}
}
```

### 2. CSV Batch Generation

Triggered client-side; backend provides:

- CSV format specification
- Field mappings
- Normalization helpers
- Batch ID generation

### 3. Batch Metadata Storage

Backend writes:

```
export_batches/{batchId}
```

### 4. Upload Confirmation

API updates:

```json
{
  "uploaded_to_ro": true,
  "roUploadBatchId": batchId,
  "roUploadDate": serverTimestamp()
}
```

This closes the lifecycle of the export batch.

> **CSV Mapping Reference:**
> 

> The full header-to-field mapping is documented in [RetailOps CSV Field Mapping](RetailOps%20CSV%20Field%20Mapping%20348d1e671b7b407d984ec243a02981d1.md).
> 

> **Operational Reference:**
> 

> For the full user-facing workflow and CSV batch behavior, see
> 

> [Export Manager — RetailOps CSV Workflow](Export%20Manager%20%E2%80%94%20RetailOps%20CSV%20Workflow%2073e34ec744234dc3a9ad043c36bdbdc6.md).
> 

---

---

---

## 6.1 API design principles & conventions (quick)

- Base path: `/api/v1`
- JSON for request/response bodies
- All authenticated endpoints use Firebase JWT Bearer (`Authorization: Bearer <idToken>`)
- Role enforcement via custom claims (`admin`, `merch`, `photographer`, `buyer`, `viewer`)
- Pagination: cursor-based (`pageToken`, `pageSize`), response contains `nextPageToken`
- Filters: `filters` query param accepts URL-encoded JSON (or individual query params for common filters)
- Field projection: `fields` query param (comma-separated)
- Bulk operations via `POST /api/v1/<resource>/bulk`
- Rate-limited endpoints return `429` with `Retry-After`
- All schema validation errors return `400` with structure `{code, message, details}`
- Public endpoints (e.g., `GET /public/launch-cards`) are explicitly marked with `security: []` in OpenAPI and must only return public-safe data subsets as defined in Section 7

---

## 6.2 OpenAPI v3 spec (copy/paste ready)

Below is `06-api/openapi.yaml`. It assumes you have the Section 2 JSON Schemas stored in `../02-schema/` relative to this file. When you put the files into the repo, the `$ref` will work for many OpenAPI tools.

> Note: This is the full, production-ready spec for core endpoints. It's long but complete. Paste directly into 06-api/openapi.yaml.
> 

NOTE: The full OpenAPI spec is temporarily stored here until the AOSS repo is initialized. Once the repo is created, this spec will be relocated into /06-api/openapi.launch-calendar.yaml.

[openapi.launch-calendar.yaml](openapi.launch-calendar.yaml)

---

## 6.3 Error codes & UI mapping

Create file `06-api/error-codes.md`. Below is the catalog and mapping.

### Error response shape

All errors return:

```json
{
  "code": "API-ERR-XXXX",
  "message": "Human readable message",
  "details": { ... } // optional
}

```

### Catalog (representative)

- `API-ERR-4001` — `invalid_filters` — "Invalid filter format. Pass a JSON object."
- `API-ERR-4002` — `missing_mpn` — "MPN or SKU is required."
- `API-ERR-4003` — `invalid_csv` — "CSV parsing failed: "
- `API-ERR-4011` — `unauthorized` — "Authentication token missing or invalid."
- `API-ERR-4031` — `forbidden` — "You do not have permission to perform this action."
- `API-ERR-4041` — `not_found` — "Resource not found."
- `API-ERR-4091` — `product_locked` — "Resource locked by processing job. Try again later."
- `API-ERR-4291` — `rate_limit_exceeded` — "Rate limit exceeded. Retry after ."
- `API-ERR-5001` — `internal_error` — "Unexpected error. Please contact admin."

**UI mapping**

- Display `message` directly for non-technical users.
- For `missing_mpn` error in import, link to docs showing the required CSV template.

---

## 6.4 Authentication & Security details

**Firebase JWT**

- Frontend includes `Authorization: Bearer <idToken>`.
- Backend verifies with Firebase Admin SDK (`admin.auth().verifyIdToken(idToken)`).
- Custom claims used for RBAC: `role: 'admin'|'merch'|'photographer'|'buyer'|'viewer'`.
- For server-to-server calls (CI/worker), use Service Account keys via environment owners; Cloud Functions use default service account with proper IAM.

**Webhook signing**

- Each webhook includes `X-ROPI-Signature: sha256=<hmac>` computed over raw body with secret from Secret Manager.
- Verify signature server-side; reject 401 if invalid.

**Rate-limiting**

- Recommend per-user 100 requests/min default (adjust per endpoint); more restrictive for AI sync endpoints.
- Return `429` with `Retry-After` header.

**Field-level write protection**

- Validate target fields before applying writes. Example: rules or API cannot write `/settings/*`, /users/* or private subcollections unless admin.

---

## 6.5 Pagination, filtering, sorting conventions

**Pagination**

- Cursor-based: `pageSize` + `pageToken`.
- Response must return `nextPageToken` if more results exist.
- For bulk operations, support server-side `selectAllMatching=true` — returns a jobId to operate on full result.

**Filters**

- Use `filters` as JSON object (encoded): example `filters={"brand":["Nike"],"statusFlags":{"ready_for_export":true}}`
- Standard filter operators supported server-side: `EQ`, `IN`, `GT`, `LT`, `BETWEEN`, `ARRAY_CONTAINS`.

**Sorting**

- `sort` query param: `field:dir` comma separated. e.g., `sort=technical.launchDate:asc,ropiScore:desc`

**Projection**

- `fields=productId,sku_core.brand,sku_core.name,ropiScore` reduces payload and speeds queries.

---

## 6.6 TypeScript client examples (Updated)

Create `06-api/ts-client-example.ts`. Replace `API_BASE` with your environment.

```tsx
// Minimal client examples using fetch

const API_BASE =
  process.env.API_BASE || "[https://api.ropi.shiekhshoes.org](https://api.ropi.shiekhshoes.org)";

async function apiGet(path: string, idToken: string, params: Record<string, any> = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).reduce((acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = String(v);
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  const url = `${API_BASE}${path}${qs ? "?" + qs : ""}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`${res.status} ${err.code ?? ""} - ${err.message ?? "API error"}`);
  }

  return res.json();
}

async function apiPost(path: string, idToken: string, body: any) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`${res.status} ${err.code ?? ""} - ${err.message ?? "API error"}`);
  }

  return res.json();
}

// Example: search products
export async function searchProducts(
  idToken: string,
  q: string,
  filters: Record<string, any>,
  pageSize = 25
) {
  const params = {
    q,
    pageSize: pageSize.toString(),
    filters: JSON.stringify(filters)
  };
  return apiGet("/products", idToken, params);
}

// Example: generate description for a single site
export async function generateDescriptionForSite(
  idToken: string,
  productId: string,
  site: "[Shiekh.com](http://Shiekh.com)" | "Karmaloop" | "MLTD" | "Sangremia",
  templateKey = "default"
) {
  return apiPost("/ai/describe", idToken, {
    productId,
    site,
    templateKey
  });
}

// Example: "Generate All" for all selected websites on a product
export async function generateDescriptionsForAllSites(
  idToken: string,
  productId: string,
  websites: string[]
) {
  const results: Record<string, any> = {};

  for (const site of websites) {
    // Optionally: skip unknown / unsupported sites
    try {
      results[site] = await generateDescriptionForSite(idToken, productId, site as any);
    } catch (err) {
      // Handle or log per-site failure without breaking the whole loop
      results[site] = { error: (err as Error).message };
    }
  }

  return results;
}

// Example: start export for a set of products
export async function startExport(
  idToken: string,
  productIds: string[],
  profile: string
) {
  return apiPost("/exports", idToken, {
    productIds,
    exportProfile: profile
  });
}
```

These examples are consistent with:

- Product schema and attributes (Section 2.1–2.3)
- Smart Rules and Observations (Section 4, W1)
- AI Describe behavior and Generate All semantics (Section 5)
- Frontend tab layout and Launch Calendar usage (Section 7)
- Frontend tab layout and Launch Calendar usage (Section 7)

---

## 6.7 Launch Calendar Feed API

The Launch Calendar Feed API exposes a **public-safe** view of upcoming launch products for use by the shopper-facing [Shiekh.com](http://Shiekh.com) Launch Calendar (see **Section 7.2 — Launch Calendar — Main View**) and related public UIs.

This endpoint **must never** expose internal fields such as:

- Observations
- Smart Suggestions
- Export readiness / internal status flags
- Internal notes (`customMessage`)
- AI action logs
- Any other internal-only attributes

The feed is a **read-only**, public-safe projection of product data, defined here and in **Section 9.3.3 — Launch Calendar Export**.

---

### 6.7.1 Endpoint

**Method:** `GET`

**Path:** `/launchCalendarFeed`

**Description:**

- Returns a list of launch products with only the fields required to render the public Launch Calendar product cards and detail view.
- Results are filtered by `launchDate` and an optional display window.

---

### 6.7.2 Query Parameters

All parameters are optional; defaults align with the Launch Calendar display window in **Section 7.2.1**.

- `startDate` (optional, `YYYY-MM-DD`)
    - If provided, only include products with `attributes.launchDate >= startDate`.
    - If omitted, defaults to the beginning of the display window (e.g., 30 days in the past).
- `endDate` (optional, `YYYY-MM-DD`)
    - If provided, only include products with `attributes.launchDate <= endDate`.
    - If omitted, defaults to a configurable number of days in the future.

If both are omitted, the backend applies a default window consistent with the calendar UI (see Section 7.2.1).

---

### 6.7.3 Response Schema

**Status codes:**

- `200 OK` — Feed returned successfully.
- `400 Bad Request` — Invalid date parameters.
- `500 Internal Server Error` — Unexpected error in feed generation.

**Body:**

```json
{
  "items": [
    {
      "productId": "string",
      "slug": "string",
      "name": "string",
      "brand": "string",
      "gender": "string",
      "primaryColor": "string | null",
      "descriptiveColor": "string | null",
      "launchDate": "YYYY-MM-DD",
      "imageUrl": "string | null",
      "descriptionShiekh": "string | null",
      "productUrl": "string | null"
    }
  ],
  "window": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  }
}
```

**Field mapping (from Product Schema):**

**productId**

Source: Firestore document ID for the product.

**slug**

Source: `slug` (see Section 7.4.2 and Product Schema — JSON (Section 2.1)).

Used to generate public product URLs when applicable.

**name**

Source: [`attributes.name`](http://attributes.name)

Displayed as the product name in the Launch Calendar card and detail view (see Section 7.2.2 and 7.3.4).

**brand**

Source: `attributes.brand`

Rendered as brand text or logo (Section 7.2.2).

**gender**

Source: `attributes.gender`

Rendered as a badge (Section 7.2.2, 7.3.4).

**primaryColor**

Source: `attributes.primaryColor`

Displayed in the detail view (Section 7.3.4).

**descriptiveColor**

Source: `attributes.descriptiveColor`

Displayed on Launch Calendar cards and detail view (Section 7.2.2, 7.3.4).

**launchDate**

Source: `attributes.launchDate`

Required for inclusion in the feed; controls calendar placement (Section 7.2.1).

Formatted as YYYY-MM-DD in the API; rendered as e.g. "Nov 27, 2025" in the UI.

**imageUrl**

Source: first image in `media[]`, mapped to a public Storage URL under `/public/products/{productId}/...` as defined in Section 9.4 and enforced by Section 9.5 Storage Security Rules.

If no image is available, the frontend uses a placeholder image (Section 7.2.2).

**descriptionShiekh**

Source: `descriptionShiekh` (site-specific description for [Shiekh.com](http://Shiekh.com), Section 7.3.2, 7.3.4).

Used as the description text in the public detail view.

**productUrl**

Source: Derived from the public [Shiekh.com](http://Shiekh.com) catalog (e.g., [`https://shiekh.com/products/{slug}`](https://shiekh.com/products/{slug})), not from Firestore.

This field is optional and may be null if a public URL is not yet available.

**window:**

`window.startDate`, `window.endDate`

Echo the effective date range used by the backend (either explicit parameters or defaults).

---

### 6.7.4 Inclusion & Filtering Rules

A product is included in the Launch Calendar Feed if:

1. `attributes.launchDate` is set (not null).
2. `attributes.launchDate` falls within the effective window (startDate → endDate).
3. The product is considered active for Launch Calendar purposes (e.g., `productIsActive === true` when such a flag is enforced by the implementation).

This aligns with Section 7.2.1 — Display Rules.

There is no dependency on:

- Export Readiness (`statusFlags.ready_for_export`)
- Image count or media quality beyond selecting the first image if present
- Observations, Smart Suggestions, or any internal-only fields.

Those concepts are reserved for internal AOSS workflows (W1/W2) and must not leak into the public feed.

---

### 6.7.5 Security & Caching

The Launch Calendar Feed is public-safe by design and may be served without authentication (see Section 9.3.3 — Launch Calendar Export Behavior).

- Only the fields listed in 6.7.3 are allowed in the response.
- Any additional fields (status flags, internal notes, AI logs, etc.) must be filtered out at the API layer.

HTTP caching (CDN, reverse proxy) may be applied at the [Shiekh.com](http://Shiekh.com) layer based on traffic and freshness requirements, but that is outside the AOSS scope.

---

### 6.7.6 Cross-References

- **Section 7.2 — Launch Calendar — Main View**
    
    Defines card layout and display logic that consume this feed.
    
- **Section 7.3.4 — Launch Calendar Product Detail View**
    
    Defines which fields are shown in the public detail layout.
    
- **Section 9.3.3 — Launch Calendar Export**
    
    Defines the public-safe nature of this feed and the requirement not to expose internal data.
    

---

---

## 6.7 Webhook contract & verification (imports callback example)

**Workflow Integration:**

**Workflow W1 — Observations Capture & Apply to Product**

[Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)

---

**Workflow Integration:**

**Workflow W2 — Full Product Completion (One-Person Process)**

[🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)

**Endpoint:** `POST /webhooks/imports/callback`

**Headers**

- `X-ROPI-Signature: sha256=<hex>` (HMAC SHA256 over raw request body with webhook secret)
- `X-ROPI-Event: import.completed`

**Body**

```json
{
  "jobId":"import-123",
  "status":"complete",
  "results":{
    "processed":1000,
    "errors":3,
    "errorFile":"gs://imports/errors/import-123.csv"
  },
  "completedAt":"2025-11-25T12:12:00Z"
}

```

**Verification code (Node)**

```jsx
const crypto = require('crypto');
function verifySignature(rawBody, headerSignature, secret) {
  const h = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return `sha256=${h}` === headerSignature;
}

```

**Retry**

- Webhook sender retries 3 times with exponential backoff (1m, 5m, 15m). If still failing, send admin alert.

---

## 6.8 Integration guide — Magento / RO export (brief)

Create `06-api/integration-guides/magento.md`. Key points below.

**CSV contract**

- Single CSV file per export.
- Columns include canonical fields and per-site description fields:
    - `mpn, sku, brand, product_name, category, primary_color, price, website, description_shiekh, meta_title_shiekh, meta_description_shiekh, description_karmaloop, ...`
- `website` column is pipe-separated (e.g., `shiekh|sangremia`).
- Per-site description fields are raw HTML (sanitize server-side) and should be enclosed in double quotes. Example cell:
    
    ```
    "<p>The Nike Air Foamposite ...</p>"
    
    ```
    

**Notes for Magento**

- Ensure Magento importer accepts HTML in description column — if not, provide pre-processor to strip tags or provide `plain_description_shiekh`.
- Provide attribute mapping spec — admin can configure header mapping in Export Profiles.

**Signing & delivery**

- Export job writes CSV to Storage and returns signed URL valid for `signedUrlTtlSeconds` (e.g., 3600s).
- For automated systems, provide webhook `exports.callback` on job complete.

---

**Ops Reference:**

API availability, latency SLOs, structured logging standards, and integration-related alert policies are defined in [**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md).

All API endpoints must emit logs using the schema in Section 11.2 and comply with the SLO and incident response workflows described in Section 11.

---

## 6.9 Rate limiting, quotas & throttles

**Suggested default quotas**

- API (general): 100 requests/min per user
- AI describe (sync): 5 calls/min per user, 30 calls/min per project
- AI describe (async): 500 queued jobs/hour per project (configurable)
- Import/Export: limited by worker capacity; large imports recommended background jobs.

Return `429` with:

```json
{ "code":"API-ERR-4291", "message":"Rate limit exceeded", "retryAfter": 30 }

```

---

## 6.10 API testing & CI guidance

- **OpenAPI lint**: use `spectral` to lint `openapi.yaml`.
- **Contract tests**: use `Dredd`, `Prism`, or a CI job to spawn emulator and validate response types against OpenAPI.
- **Postman/Newman**: include a Postman collection (`06-api/postman_collection.json`) with smoke tests for key endpoints.
- **CI job**:
    1. `npm ci`
    2. `npm run lint:openapi` (spectral)
    3. `npm run test:contracts` (Dredd / Prism)
    4. `npm run test:integration` (emulator tests for import/export/describe)

---

## 6.11 API versioning & deprecation policy (repeat)

- Major breaking changes require `v2` and a migration guide.
- Deprecate fields with `Deprecation` response headers and 3-month minimum deprecation window.

---

## 6.12 Deliverables & next steps

I will prepare and commit:

- `06-api/openapi.yaml` (full spec above saved as file)
- `06-api/error-codes.md` (detailed catalog)
- `06-api/ts-client-example.ts` (client snippets)
- `06-api/integration-guides/magento.md` (integration guide)
- `06-api/postman_collection.json` (optional)
- `06-api/ci/contract-test.yml` (CI job snippet)

---

### Navigation

← Previous: [Section 5 — AI Describe Engine ](Section%205%20%E2%80%94%20AI%20Describe%20Engine%202b845ee1ec5a80ba8666e0f2d722b83f.md)

→ Next: [Section 7 — Frontend & Launch Calendar](Section%207%20%E2%80%94%20Frontend%20&%20Launch%20Calendar%202b845ee1ec5a811d8d47ef14b3d0f46c.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)