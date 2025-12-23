# Section 9 — Firebase Implementation & Security

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

# Section 9 — Firebase Implementation & Security

This section defines the complete Firebase architecture for AOSS, based on the real code patterns found in the ROPI v2.1 repository and updated for the new AOSS requirements. It includes Firestore structures, Storage layout, Function triggers, security rules, and environment configuration.

---

## 9.1 Firebase Services Used

### Firestore

AOSS uses Firestore as its primary structured datastore, including:

- `products` – core product records
- `observations` – W1 data extraction results
- `describe_jobs` – AI Describe job queue
- `system_settings` – admin-configurable system values
- `attribute_registry` – attributes + validations + domain rules
- `import_queue` (optional) – import/normalization tasks

### Firebase Storage

Now fully enabled and used for:

- **Public product image assets** (Launch Calendar, website previews, AI inputs)
- **Observation images** from Workflow W1
- **Describe job assets**
- Templates, AI reference materials, and future file-based attributes

### Firebase Functions

All functions are written in TypeScript and migrate to Gen 2 runtimes:

- `describeWorker` – processes AI Describe jobs
- `apiDescribe` / `apiDescribeStart` / `apiDescribeStatus` – describe engine endpoints
- `apiImport` – import + normalization pipeline
- `apiExport` – export readiness & data shaping
- `apiValidate` – required attribute validation
- `apiSmartDetect` – observation-intake helpers

### 9.1.4 Public vs Internal Data Access (Launch Calendar)

AOSS treats all core product data in Firestore as **private and authenticated-only**. The public Launch Calendar homepage on [Shiekh.com](http://Shiekh.com) does not read directly from Firestore.

Instead:

- Internal ROPI views (e.g., `/app/launch-calendar`) read `products` directly from Firestore, subject to Firestore security rules.
- Public Launch Calendar views (e.g., `/launch-calendar` on [Shiekh.com](http://Shiekh.com) or related frontends) use a **derived, restricted data feed** produced by AOSS:
    - Implemented via a Cloud Function or export pipeline (see Section 9.9).
    - Only exposes public-safe fields as defined in Section 7.3.4 and Section 7.2.2.
    - Never exposes internal-only fields such as `customMessage`, validation status, or export readiness indicators.

---

## 9.2 Firestore Structure (Aligned to Repo)

### Collection: `products`

Stores all structured product data:

- SKU, MPN, brand
- Website-required attributes
- Observations-derived fields
- AI Describe outputs per website
- Validation status
- Export readiness indicators

### Collection: `observations`

Used by Workflow W1:

- Raw text
- Extracted fields
- Uploaded observation images
- AI-derived metadata (dimensions, features, materials, insights)

### Collection: `describe_jobs`

Used by `describeWorker`:

- Input settings
- Target product ID
- Target website list
- Job status (`queued`, `processing`, `done`, `error`)
- AI output payloads

### Collection: `system_settings`

Admin-editable configuration:

- Attribute registry
- Validation schema
- Smart rule sets
- Import normalization rules

---

## 9.3 Cloud Functions Architecture

### describeWorker (Firestore event-driven)

- Watches `describe_jobs/{id}`
- Loads product + observation attributes
- Runs description template for each website
- Streams output back into `products/{id}/descriptions/{website}`
- Updates job status
- Handles retries, timeouts, and error states

### API callable / HTTP functions

Matching real repo entrypoints:

- `/api` – full function router
- `/apiDescribe` – AI Describe
- `/apiImport` – import row parsing
- `/apiValidate` – validation
- `/apiSmartDetect` – observation helpers

### 9.3.3 Launch Calendar Export API (Public-Safe Feed)

To support the public Launch Calendar homepage, AOSS provides a dedicated export endpoint that returns a restricted, public-safe product feed.

**Characteristics:**

- Implemented as a Cloud Function (HTTP or callable) behind controlled infrastructure (e.g., [Shiekh.com](http://Shiekh.com) backend, edge worker, or build pipeline).
- Reads from `products` in Firestore using server-side credentials (bypassing client security rules).
- Applies filters:
    - Only products with `attributes.launchDate` within the calendar window (see Section 7.2.1).
    - Only products flagged as active for public display.
- Emits a **restricted shape** of each product, including only:
    - `id`
    - `media[0]` (public image path or URL)
    - [`attributes.name`](http://attributes.name)
    - `attributes.brand`
    - `attributes.gender`
    - `attributes.primaryColor`
    - `attributes.descriptiveColor`
    - `attributes.launchDate`
    - `descriptionShiekh`
    - Optional: public product URL slug

**The export API must never include:**

- `customMessage`
- Validation status or export readiness scores
- Internal workflow flags
- Observation or describe job internals
- Any fields explicitly marked internal-only in Section 2.x or Section 7

### General notes

- All functions must migrate to **Gen 2 (Cloud Run-backed)**
- Runtime: **Node 20**
- Must include explicit bucket configuration:
    
    `admin.initializeApp({ storageBucket })`
    

### 9.3.4 RetailOps Export Backend Behavior

The Export Manager relies on Firestore to store:

- Product readiness state
- Export batch metadata
- Upload confirmation status

**Product Document Fields**

The following fields must exist in `products/{productId}`:

```json
statusFlags.ready_for_export: boolean
statusFlags.validation_status: "valid" | "has_errors" | "has_warnings"
statusFlags.uploaded_to_ro: boolean
roUploadBatchId: string | null
roUploadDate: timestamp | null
```

**Export Batch Collection**

```
export_batches/{batchId}
    batchId
    createdAt
    createdBy
    productIds[]
    csvDownloadUrl
```

**Export Eligibility Logic**

A product is included in the Export Queue when:

```
ready_for_export = true
uploaded_to_ro = false
validation_status = "valid"
```

**After RetailOps Upload**

When the user confirms upload:

```
uploaded_to_ro = true
ready_for_export = false
roUploadBatchId = batchId
roUploadDate = serverTimestamp()
```

This ensures products do not reappear in future export batches.

### General notes

- All functions must migrate to **Gen 2 (Cloud Run-backed)**
- Runtime: **Node 20**
- Must include explicit bucket configuration:
    
    `admin.initializeApp(\{ storageBucket \})`
    

---

---

## 9.4 Firebase Storage Structure

AOSS uses the default bucket:

```
{projectId}.[appspot.com](http://appspot.com)
```

### Storage Paths (Repo-Aligned)

```
/public/products/{productId}/{filename}
/public/observations/{observationId}/{filename}
/describe/{jobId}/assets/{filename}
```

Public images are used for:

- Launch Calendar previews
- Retailer website previews
- AI Describe reference inputs

Observation and AI job assets are authentication-protected.

---

## 9.5 Storage Security Rules (Option A — Public Product Images)

These rules implement the storage behavior described in Sections **9.1.4** and **9.4**:

- **Public product images** are readable by anyone and are used by:
    - Internal Launch Calendar previews
    - Public Launch Calendar on [Shiekh.com](http://Shiekh.com)
    - Retailer website previews
- **Observation images** and **Describe job assets** are **never public** and always require authentication.
- All other buckets/paths are denied by default.

AOSS uses the default Storage bucket configured via `FIREBASE_STORAGE_BUCKET`.

```jsx
rules_version = '2';

service [firebase.storage](http://firebase.storage) {
  match /b/{bucket}/o {

    // ────────────────────────────────────────────────
    //  Public Product Images
    //  Path: /public/products/{productId}/{filename}
    //  - Readable by anyone (public)
    //  - Writable only by authenticated users
    // ────────────────────────────────────────────────
    match /public/products/{productId}/{fileName} {
      // Allow anyone (including unauthenticated clients) to read product images.
      allow read: if true;

      // Only authenticated users can upload or modify product images.
      allow write: if request.auth != null;
    }

    // ────────────────────────────────────────────────
    //  Observation Images (Workflow W1)
    //  Path: /public/observations/{observationId}/{filename}
    //  - Used by Workflow W1 for internal-only review
    //  - Always require authentication
    // ────────────────────────────────────────────────
    match /public/observations/{observationId}/{fileName} {
      // Observation images are internal-only.
      allow read, write: if request.auth != null;
    }

    // ────────────────────────────────────────────────
    //  Describe Job Assets
    //  Path: /describe/{jobId}/assets/{filename}
    //  - Used by Describe Engine for AI reference
    //  - Always require authentication
    // ────────────────────────────────────────────────
    match /describe/{jobId}/assets/{fileName} {
      allow read, write: if request.auth != null;
    }

    // ────────────────────────────────────────────────
    //  Default Deny for All Other Paths
    // ────────────────────────────────────────────────
    match /{path=**} {
      allow read, write: if false;
    }
  }
}
```

**Notes:**

- These rules implement **Option A — Public Product Images**, where only the `/public/products/...` path is world-readable.
- Core product data remains in **Firestore** and is never directly exposed via Storage (see Sections 9.1.4 and 9.6).
- Observation and Describe assets are always behind `request.auth != null` to protect internal workflows (W1/W2) and AI operations.

---

## 9.6 Firestore Security Rules (Aligned With Repo)

AOSS keeps Firestore product data fully private. Public Launch Calendar views must never read directly from the `products` collection.

```jsx
// Products: authenticated only
match /products/{id} {
  allow read, write: if request.auth != null;
}

// Observations: authenticated only
match /observations/{id} {
  allow read, write: if request.auth != null;
}

// Describe jobs: user-create, worker-owned update
match /describe_jobs/{id} {
  allow create: if request.auth != null;
  allow read: if false;
  allow update: if false; // Worker updates via server-side privileges
}

// System settings: admin console only
match /system_settings/{id} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

Public Launch Calendar and homepage features get their data from:

- A restricted export API / Cloud Function that:
    - Validates the caller (e.g., [Shiekh.com](http://Shiekh.com) frontend, edge worker, or static build process).
    - Emits a **read-only subset** of product fields appropriate for public display (see Section 7.3.4).
- Optional static or cached JSON feeds derived from the same export process.

No unauthenticated client should ever query `products` directly.

---

## 9.7 Environment Configuration

AOSS requires the following environment variables via Firebase:

- `FIREBASE_STORAGE_BUCKET`
- `OPENAI_API_KEY`
- `AOSS_TEMPLATE_MODE`
- `AOSS_EXPORT_TARGETS`
- `AOSS_VALIDATION_CONFIG`

All secrets must be stored using Firebase environment config, never in Firestore.

---

## 9.8 Deployment Notes

- All functions deployed to **us-central1**
- Use `firebase deploy --only functions,firestore,storage`
- Storage must be deployed after adding `storage.rules` to `firebase.json`
- Gen 2 migration required for all AI & import functions
- AOSS uses Cloud Logging + Monitoring (Section 11 handles runbooks)

## 9.9 Launch Calendar Export Operations

- The Launch Calendar export API must be deployed and monitored like other critical AOSS functions (see Section 11 for observability and runbooks).
- Whenever product data relevant to launches changes (e.g., launchDate, brand, name, hero image, descriptionShiekh), the export endpoint must reflect it within the expected freshness window for [Shiekh.com](http://Shiekh.com).
- Any additional public consumers of launch data (e.g., mobile app, microsites) must integrate with this same export feed or its cached derivatives, not with Firestore directly.
- Changes to the set of public-safe fields must be coordinated with:
    - Section 7 (Frontend & Launch Calendar) for UI behavior
    - Section 2.x (Product Schema and Attribute Registry) for data definitions
- Changes to the set of public-safe fields must be coordinated with:
    - Section 7 (Frontend & Launch Calendar) for UI behavior
    - Section 2.x (Product Schema and Attribute Registry) for data definitions

---

## 9.10 IAM Roles & Auth Mapping

This subsection defines how **AOSS user roles** (as described in Section 7.8 — User Roles & Permissions) map onto Firebase Authentication and Google Cloud IAM. The goal is to:

- Keep **frontend roles**, **Firestore rules**, and **Storage rules** consistent.
- Ensure that only the right users can edit products, run AI actions, or change system settings.
- Keep public endpoints (e.g., Launch Calendar export) separate from internal-only access.

### 9.10.1 AOSS Application Roles (Frontend)

Per **Section 7.8 — User Roles & Permissions**, AOSS defines the following application-level roles:

- `admin`
- `merch`
- `buyer`
- `photographer`
- `viewer`

These roles drive **frontend behavior** (which tabs can be edited, which AI actions are available, etc.) and must also be available to security rules.

AOSS stores the app role in a Firebase Authentication **custom claim**:

```json
{
  "appRole": "admin | merch | buyer | photographer | viewer"
}
```

Frontend code and security rules treat `request.auth.token.appRole` as the canonical source of a user's AOSS role.

### 9.10.2 Mapping App Roles to Capabilities

The following table summarizes the expected capabilities per app role (aligning with Section 7.8):

| appRole | Launch Calendar (internal) | Product Editor | AI Actions | Admin / Settings |
| --- | --- | --- | --- | --- |
| `admin` | Full access | Full edit | All | Full (system settings, etc.) |
| `merch` | Full access | Full edit | All | Limited or none |
| `buyer` | Full access | Edit launch fields only | View AI output, limited triggers | None |
| `photographer` | View only | Edit media only | None | None |
| `viewer` | View only | View only | None | None |

**Frontend behavior** (Section 7.8) enforces these capabilities in the UI.

**Backend enforcement** is handled by Firestore and Storage rules in combination with these claims.

### 9.10.3 Firebase Authentication Requirements

All internal AOSS users must:

- Sign in via Firebase Authentication (email/password, SSO, or other configured provider).
- Receive an `appRole` custom claim assigned out-of-band by an admin script or console tool.

If `request.auth == null` or `request.auth.token.appRole` is missing or unrecognized, the user is treated as **unauthenticated** for the purposes of Firestore and Storage rules.

### 9.10.4 Firestore & Storage Rules Interaction

Sections **9.5** (Storage) and **9.6** (Firestore) define the core security rules for AOSS. These rules rely primarily on:

- `request.auth != null` for internal-only collections and assets.
- A strict separation between **public product images** and **private** observation/AI assets.

Optionally, future rule refinements may use `request.auth.token.appRole` to further restrict writes. For example:

- Only `admin` and `merch` should be allowed to update product core fields.
- `photographer` may be allowed to write only to media-related fields or Storage paths.
- `viewer` should never have write access.

These refinements should be applied carefully and tested via emulators before deployment (see Section 10 — CI/CD, Testing, Release & Stability and Section 11 — Observability, Monitoring & Runbooks).

### 9.10.5 Google Cloud IAM (Service Accounts)

In addition to application-level roles, AOSS uses **Google Cloud IAM** for service accounts and CI/CD:

- **Cloud Functions service account**
    - Used to read/write Firestore and Storage on the server side (e.g., Describe worker, Import, Export, Launch Calendar export feed).
    - Must have only the minimum permissions required (Firestore access to AOSS collections, Storage access to relevant buckets/paths, Cloud Logging).
- **CI/CD (GitHub Actions) service credentials**
    - Used to run `firebase deploy` as defined in **Section 10 — CI/CD, Testing, Release & Stability**.
    - Must be scoped to deploy only the relevant Firebase resources for AOSS (functions, hosting, Firestore/Storage rules).

These IAM roles are separate from `appRole` and are not visible to end users. They control **infrastructure-level** access (deployments, function execution) rather than in-app capabilities.

### 9.10.6 Public vs Internal Callers

To preserve the guarantees from **Section 9.1.4** and **Section 7.1.2**:

- Public Launch Calendar and shopper-facing UIs **never** authenticate as internal users and never receive an `appRole`.
- Public callers access:
    - Static assets (public product images) allowed by Storage rules (Section 9.5).
    - Public-safe Launch Calendar feeds exposed via Cloud Functions / backend (Section 9.3.3 and Section 7.2.2).
- Internal ROPI users always:
    - Authenticate via Firebase Auth.
    - Carry an `appRole` custom claim that drives both frontend and backend authorization.

This ensures that:

- Core product data in Firestore remains private.
- Observation and AI assets require authentication.
- Only allowed users can edit or run AI actions consistent with the UI rules in Section 7.8.

---

---

---

### Navigation

← Previous: [Section 8 — TypeScript Bindings, SDKs & Developer Tooling](Section%208%20%E2%80%94%20TypeScript%20Bindings,%20SDKs%20&%20Developer%20%202b845ee1ec5a800d9b47fbf27d531cd4.md)

→ Next: [Section 10 — CI / CD, Testing, Release & Stability](Section%2010%20%E2%80%94%20CI%20CD,%20Testing,%20Release%20&%20Stability%202b845ee1ec5a80ccaf70e49777a2b677.md)

[← Back to ROPI AOSS Hub](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)})