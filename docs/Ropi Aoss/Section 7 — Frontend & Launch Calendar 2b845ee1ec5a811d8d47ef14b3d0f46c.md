# Section 7 — Frontend & Launch Calendar

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

# Section 7 — Frontend & Launch Calendar

This section defines the **internal ROPI frontend** for managing product data, with the **Launch Calendar** as the primary interface. The design mirrors the customer-facing [Shiekh.com](http://Shiekh.com) [Launch Calendar](https://www.shiekh.com/launch-calendar.html) but includes editing capabilities for internal users.

---

## 7.1 Overview & Design Philosophy

## 7.0 AOSS Frontend Navigation (Modules & Routes)

The AOSS frontend implements the global Information Architecture described on the [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md) hub and in [Section 1 — Navigation & Page Index](Section%201%20%E2%80%94%20Navigation%20&%20Page%20Index%20eba3cfdc44fd49ef98c38b183642cc7b.md). The key modules surfaced in the UI are:

- **Home (AOSS Hub)** — high-level KPIs and shortcuts into all other modules.
- **Products** — catalog view and entry point into the Product Editor (W2).
- **Launch Calendar** — calendar-based view of launch products.
- **Import (Import Manager)** — CSV uploads, import history, normalization errors.
- **Export (Export Manager)** — queue of products ready for RetailOps CSV export and export history.
- **Observations** — global list of observations (W1) with filters and detail views.
- **Attributes** — Attribute Registry UI (human + JSON) for managing domains.
- **Smart Rules** — rule list and editor, plus test console.
- **Settings / Admin** — system-level configuration and admin tools.

Section 7 focuses primarily on the **frontend behavior** for:

1. **Products module**
    - Product list / catalog views.
    - Navigation into the Product Editor.
    - State indicators for completion, validation, and export readiness.
2. **Product Editor (Workflow W2)**
    - 5-tab layout:
        - Core Information
        - Product Attributes
        - Descriptions & SEO
        - Launch & Media
        - AI Actions
    - Right sidebar:
        - Observations pane
        - Smart Suggestions
        - Export Readiness summary
3. **Launch Calendar module**
    - Internal Launch Calendar view (`/launch-calendar`).
    - Product tiles that link back to the Product Editor.
    - Integration with Launch-related attributes in the Product schema and Export behavior.

Other modules (Import, Export, Observations, Attributes, Smart Rules, Settings/Admin) are defined in their respective sections (Section 3, Section 4, Attribute Registry page, Section 9, Section 13), but must align with this navigation model and route structure.

Implementers should treat this navigation model as the **canonical frontend IA** for AOSS v1.0. Changes to modules, routes, or their relationships must be reflected in:

- [Ropi AOSS ](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md) (overview)
- [Section 1 — Navigation & Page Index](Section%201%20%E2%80%94%20Navigation%20&%20Page%20Index%20eba3cfdc44fd49ef98c38b183642cc7b.md)
- Section 7 — Frontend & Launch Calendar (this section)

---

## 7.1 Overview & Design Philosophy

### Primary Interface: Launch Calendar

The Launch Calendar is the **hero view** of ROPI — the first thing users see when they log in. It displays products that have a `launchDate` set, organized chronologically.

**Design Reference:** [https://www.shiekh.com/launch-calendar.html](https://www.shiekh.com/launch-calendar.html)

**Key Principles:**

- Calendar-first navigation (not a boring admin table)
- Visual product cards with images
- Click-to-edit workflow
- Matches customer experience so merch team understands what shoppers see

### 7.1.2 Public Homepage vs Internal View

The Launch Calendar UI serves two closely-related roles:

1. **Public Homepage View ([Shiekh.com](http://Shiekh.com) Launch Calendar)**
    - Acts as the shopper-facing homepage experience, showing upcoming releases in a calendar-first layout.
    - Uses the same visual design and core product card structure as the internal Launch Calendar.
    - Only renders public-safe product fields (see Sections 7.2.2 and 7.3.4).
2. **Internal ROPI View (Editor Overlay)**
    - Uses the same core Launch Calendar UI as the public view, but layered with internal-only controls and metadata for authenticated users.
    - Adds capabilities like:
        - Internal notes (`customMessage`)
        - Edit links to the full Product Editor
        - Optional hover stats and context menus (per role)
    - Honors the role-based permissions defined in Section 7.8.

The same underlying component tree is reused in both contexts, but the field visibility and controls depend on whether the user is authenticated and which role they have.

### 7.1.1 Sign-on & Landing Behavior

- After a user successfully authenticates into the internal ROPI app, the default landing route is the Launch Calendar.
- There is no separate dashboard before the Launch Calendar; navigation for authenticated users always starts from the calendar-first view.
- The internal Launch Calendar is distinct from the public [Shiekh.com](http://Shiekh.com) Launch Calendar:
    - The internal view adds editing and workflow controls.
    - The public [Shiekh.com](http://Shiekh.com) Launch Calendar remains a shopper-facing experience and does not expose internal-only fields or controls.

---

## 7.2 Launch Calendar — Main View

### 7.2.1 Display Rules

A product appears on the Launch Calendar when:

- `attributes.launchDate` is set (not null)
- `attributes.launchDate` ≥ today OR within the display window (configurable, default: past 30 days)

### 7.2.2 Product Card Display

Each product card shows:

| Element | Source Attribute | Notes |
| --- | --- | --- |
| **Product Image** | First image from `media[]` | Fallback: placeholder image |
| **Product Name** | [`attributes.name`](http://attributes.name) | Truncate at 60 chars with ellipsis |
| **Gender** | `attributes.gender` | Badge style (Men's / Women's / etc.) |
| **Release Date** | `attributes.launchDate` | Formatted: "Nov 27, 2025" |
| **Descriptive Color** | `attributes.descriptiveColor` | Below name |
| **Brand** | `attributes.brand` | Small text or logo |

### 7.2.3 Card Interactions

On the Launch Calendar, product cards behave as follows:

| Action | Behavior |
| --- | --- |
| **Click card** | Opens the **Launch Calendar Product Detail** view (read-focused, public-safe layout) for that product. From this view, authorized users can click "Edit Product" to open the full internal Product Editor. |
| **Hover** | Shows quick stats (inventory, status, HYPE badge) for authenticated internal users. Hover behavior may be disabled or simplified for public/unauthenticated views. |
| **Right-click** | Context menu (internal-only): Edit in Product Editor, Copy MPN, View on [Shiekh.com](http://Shiekh.com).
Public/unauthenticated users only see "View on [Shiekh.com](http://Shiekh.com)". |

### 7.2.4 Calendar Layout Options

```
┌─────────────────────────────────────────────────────────────┐
│  ◀ November 2025 ▶                    [Week] [Month] [List] │
├─────────────────────────────────────────────────────────────┤
│  Sun    Mon    Tue    Wed    Thu    Fri    Sat              │
├───────┬───────┬───────┬───────┬───────┬───────┬───────┬─────┤
│       │       │       │       │  27   │  28   │  29   │     │
│       │       │       │       │ ┌───┐ │ ┌───┐ │       │     │
│       │       │       │       │ │ 🔥│ │ │   │ │       │     │
│       │       │       │       │ │J1 │ │ │AM │ │       │     │
│       │       │       │       │ └───┘ │ └───┘ │       │     │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┴─────┘
```

**View Modes:**

- **Month View** (default): Full calendar grid
- **Week View**: Larger cards, more detail
- **List View**: Table format for bulk operations

**View Modes:**

- **Month View** (default): Full calendar grid
- **Week View**: Larger cards, more detail
- **List View**: Table format for bulk operations

---

### 7.2.x Launch Calendar — Drawing Mode Indicator (Internal Only)

The internal Launch Calendar (ROPI users) renders the `attributes.drawing` value as a small badge or text label on:

- Launch Calendar cards (grid/list)
- Launch Calendar product detail view

Suggested mappings:

- `fcfs` → "FCFS"
- `store_only` → "Store drawing"
- `web_only` → "Web drawing"
- `store_web` → "Store/Web drawing"
- `token_set` → "Token set (Magento)"

Notes:

- This indicator is **internal-only**. It is not required to appear in shopper-facing Launch Calendar UIs or in the public Launch Calendar feed API (Section 6.7).
- The field is meant as a reminder and coordination tool for staff when planning and executing launches, especially for high-demand products that may require drawing behavior.

---

## 7.3 Product Editor (Full Internal View)

The Product Editor is the full internal editing surface for a product. It is separate from the Launch Calendar Product Detail view:

## 7.2.5 Export Manager (RetailOps CSV Workflow)

The **Export Manager** is the dedicated module for batching and exporting completed AOSS products into **RetailOps** using CSV files. RetailOps does not support API ingestion; therefore, CSV generation and manual upload are required.

This module lives at:

**`/app/export`** → Export Manager

> **See also:**
> 

> For a full end-to-end view of the RetailOps CSV export lifecycle and operational guidelines, refer to the dedicated page [Export Manager — RetailOps CSV Workflow](Export%20Manager%20%E2%80%94%20RetailOps%20CSV%20Workflow%2073e34ec744234dc3a9ad043c36bdbdc6.md).
> 

### 7.2.5.1 Export Philosophy

AOSS uses a **state-based export model**, not a "push" model.

Products become exportable *when they are complete*, not when a user presses an "Export" button.

A product enters the Export Queue automatically when:

- `statusFlags.validation_status === "valid"`
- `statusFlags.ready_for_export === true`
- `statusFlags.uploaded_to_ro !== true`

This aligns with **Workflow W2** and the **Product Editor Export Readiness** sidebar.

**Important:**

- **Images are NOT required for export.**
    - Images are only required (or recommended) for Launch Calendar visual quality.
    - Missing or low image count does *not* affect RetailOps CSV eligibility.

### 7.2.5.2 Export Manager — Primary Screens

The Export Manager contains four subpages:

1. **Export Queue**
2. **Generate CSV (Batch Export)**
3. **Mark as Uploaded to RO**
4. **Export History**

Each is detailed below.

### 7.2.5.3 Export Queue

**Route:** `/app/export/queue`

This page lists all products that are eligible for RetailOps export.

**Eligibility Conditions:**

- `ready_for_export = true`
- `validation_status = "valid"`
- `uploaded_to_ro = false` (or not set)
- No dependency on image count
- No dependency on Launch Calendar fields

**List Columns:**

- SKU / Style ID / Name
- Brand
- Category / Department
- Websites selected
- Assigned user (optional)
- Completion status
- Export readiness state
- Checkbox (multi-select)

**Actions:**

- Select multiple products
- Button: **"Generate CSV for RetailOps"**
- Optional:
    - "Open in Product Editor"
    - "View Observations"
    - "Filter by ready_for_export / brand / website / launchDate"

### 7.2.5.4 Generate RetailOps CSV

When the user selects products and clicks **Generate CSV**, AOSS will:

1. Gather all fields required for RetailOps ingestion.
2. Map them into **RetailOps CSV columns**.
3. Apply normalization rules consistent with **Import Engine 3.1 / 3.2** (reverse-transform where needed).
4. Produce a downloadable CSV file.

CSV is downloaded directly by the user.

**File naming convention:**

`aoss_export_<YYYY-MM-DD>_<batchId>.csv`

No product changes occur at this point.

### 7.2.5.5 Uploading to RetailOps (External Step)

Users manually upload the generated CSV file into RetailOps.

AOSS does not automate this step because RetailOps has no ingestion API.

### 7.2.5.6 Mark as Uploaded to RO

After the CSV is successfully uploaded into RetailOps, the user returns to AOSS to confirm upload completion.

**Routes:**

- `/app/export/mark-uploaded`
- or triggered via modal after CSV export

**Actions:**

- The user selects products that were included in the batch.
- Clicks: **"Mark as Uploaded to RO"**

AOSS then applies:

```
statusFlags.uploaded_to_ro = true
statusFlags.ready_for_export = false
roUploadDate = <timestamp>
roUploadBatchId = <uuid>
```

This removes the product from the Export Queue.

This removes the product from the Export Queue.

### 7.3.x Launch Tab — Drawing Mode

The Launch tab includes a **Drawing mode** field bound to `attributes.drawing`.

- **Field type:** Select (enum)
- **Options:**
    - FCFS (`fcfs`)
    - Store-only (`store_only`)
    - Web-only (`web_only`)
    - Store & Web (`store_web`)
    - Token set (`token_set`)

Behavior:

- Optional field; default is empty (no drawing mode specified).
- Used as a visual indicator on the internal Launch Calendar (Section 7.2) so staff can quickly see how the launch is being handled (drawing vs first come, store vs web).
- Does **not** participate in Import Engine mappings (Section 3.1 / 3.2).
- Does **not** affect RetailOps CSV export (Section 7.2.5 / Section 9.3.4).

### 7.2.5.7 Export History

**Route:** `/app/export/history`

Shows past RetailOps exports.

Columns:

- Batch ID
- Date/time of CSV generation
- User
- Number of products
- "Download CSV" link
- "View products in batch"

Batch metadata is stored in:

`export_batches/{batchId}`

Product documents store:

```
roUploadBatchId
roUploadDate
uploaded_to_ro
```

### 7.2.5.8 Updated Export Readiness Rules (Aligned with W2)

Export readiness no longer depends on images.

A product becomes "Ready for Export" only when:

- Core Information is complete
- Product Attributes are complete
- Tax Class is set
- SEO fields are complete
- Website-specific descriptions exist
- Validation status is "valid"
- All blocking Observations are resolved
- Smart Suggestions that are marked blocking have been addressed
- No dependency on:
    - Image count
    - Launch Calendar fields
    - Shipping overrides
    - Optional internal messages

This replaces earlier language that treated image count as a mandatory export requirement.

### 7.2.5.9 Integration With W2

Workflow W2 (Product Editor) now aligns with this export model:

- Completing all required fields sets `ready_for_export=true`.
- Sidebar Export Readiness reflects RetailOps CSV readiness.
- "Images (>=4)" is moved out of export checks and into "Launch & Media Quality".

### 7.2.5.10 Integration With Section 2.1 Product Schema

This module uses the following fields defined in the Product Schema:

- `statusFlags.ready_for_export`
- `statusFlags.validation_status`
- `statusFlags.completion_status`
- NEW (to be added in schema updates):
    - `statusFlags.uploaded_to_ro`
    - `roUploadBatchId`
    - `roUploadDate`

These fields drive all Export Manager behavior.

This section defines the **authoritative AOSS export workflow** and replaces any older assumption that export operates through a live API feed.

> **See also:**
> 

> The full operational workflow and CSV rules are documented in
> 

> [Export Manager — RetailOps CSV Workflow](Export%20Manager%20%E2%80%94%20RetailOps%20CSV%20Workflow%2073e34ec744234dc3a9ad043c36bdbdc6.md).
> 

---

---

## 7.3 Product Editor (Full Internal View)

The Product Editor is the full internal editing surface for a product. It is separate from the Launch Calendar Product Detail view:

- The Launch Calendar Product Detail view is a read-focused, public-safe layout used when a user clicks a card on the Launch Calendar.
- The Product Editor is an internal-only view that exposes the complete product model (per Section 2.1 Product Schema and related schemas) and all editing controls.

When an authenticated user with edit permissions clicks "Edit Product" from the Launch Calendar Product Detail view, the Product Editor opens as a slide-out panel or full-page modal.

### 7.3.1 Editor Layout

The Product Editor is a tabbed, full-width editing surface with a persistent header and a right-hand sidebar for Observations, Smart Suggestions, and Export Readiness.

```
┌──────────────────────────────────────────────────────────────┐
│  ✕  Nike Air Max 90 GS                              [Save]  │
│  MPN: CD6860-001 | SKU: NKM90-001-GS | Brand: Nike | Draft  │
├──────────────────────────────────────────────────────────────┤
│  [Core Information] [Descriptions & SEO] [Product Attributes]│
│  [Launch & Media] [AI Actions]                               │
├──────────────────────────────────────────────────────────────┤
│  LEFT: Tab content (form fields, sections)                   │
│                                                              │
│  RIGHT: Sidebar                                              │
│    - Observations (W1/W2 inline)                             │
│    - Smart Suggestions (Smart Rules output)                  │
│    - Export Readiness checklist                              │
└──────────────────────────────────────────────────────────────┘
```

Key points:

- The **top header** always shows name, identifiers (MPN, SKU, Brand), status, and the `Save` / `Validate` / `Export Preview` actions.
- The **main area** is controlled by the editor tabs documented in Section 7.3.2.
- The **right sidebar** is reserved for:
    - Observations capture and history (Workflow W1).
    - Smart Suggestions cards (Section 4 — Smart Rules).
    - Export Readiness progress (Section 7.5.4).
- The editor can appear as a full-page view (`/app/product/:productId`) or as a slide-out panel launched from the Launch Calendar Product Detail view.

### 7.3.2 Editor Tabs

### 7.3.2 Editor Tabs

The Product Editor uses a small number of logical tabs. Each tab groups fields that are edited together in day-to-day workflows.

| Tab | Purpose | Fields (examples) |
| --- | --- | --- |
| **Core Information** | Core identifiers, classification, lifecycle metadata, and dimensions.
This tab answers "What is this product?" at a basic level. | <ul>
<li>**SKU & Product Core**: brand, name, mpn, sku, slug, department, class, category, website (multi-select), productIsActive, status</li>
<li>**Lifecycle (Meta)**: launchDate (display-only here), klPostDate, familySizing, hype, firstReceived, lastReceived</li>
<li>**Dimensions**: height, length, width, weight</li>
</ul> |
| **Descriptions & SEO** | Site-specific product copy and SEO metadata used for export to each website.
Panels are driven by the selected `website` values. | <ul>
<li>**Site Descriptions** (per selected website): descriptionShiekh, descriptionKarmaloop, descriptionMltd, descriptionSangremia</li>
<li>**SEO**: metaName, metaDescription, keywords</li>
<li>**RICS Reference (read-only)**: ricsLongDesc, ricsShortDescription — source text for AI and humans, not exported and not required for readiness.</li>
</ul> |
| **Product Attributes** | Detailed attributes used by Smart Rules, AI Describe, and export logic.
This tab answers "How do we describe this product?" in detail. | <ul>
<li>**Identity & Demographic**: gender, ageGroup</li>
<li>**Color**: primaryColor, descriptiveColor</li>
<li>**Materials & Construction**: material, outsoleMaterial, closureType, cutType, fit, heelHeight, platformHeight, heelType, shoeHeightMap, madeIn</li>
<li>**Sport & League**: league, sportsTeam</li>
<li>**Product Flags & Tax**: collectionName, fastFashion, taxClass</li>
</ul> |
| **Launch & Media** | All fields needed when a product is used as a *launch product* on the Launch Calendar or homepage: media, launch controls, pricing, and shipping overrides. | <ul>
<li>**Product Images**: media[] (image tiles and upload), mediaStatus, hideImageDate (for image visibility control).</li>
<li>**Launch**: launchDate, klPostDate, hype (🔥), familySizing (toggle when relevant).</li>
<li>**Core Pricing (Launch)**: map, scomRegularPrice, scomSalePrice, promo.</li>
<li>**Shipping Overrides**: standardShippingOverride, expeditedOverrideShipping.</li>
<li>**Internal Launch Message**: customMessage (internal only, shown in internal Launch Calendar views).</li>
</ul> |
| **AI Actions** | Central hub for AI-powered operations on a single product (Section 5 — AI Describe Engine).
Mirrors the AI controls that appear contextually on the Descriptions tab. | <ul>
<li>Generate Description (per website)</li>
<li>Generate All (for all selected websites)</li>
<li>Validate Name</li>
<li>Suggest Keywords</li>
<li>Re-run RICS-based suggestions (optional "Auto-Fill from RICS" utility)</li>
<li>Recent AI Actions log for this product</li>
</ul> |

Additional behavior:

- The **website** field is a required multi-select. The options come from [`domains.website`](http://domains.website) (Section 2.3). The selected websites control:
    - Which site description panels are visible on the Descriptions & SEO tab.
    - Which sites receive generated descriptions when AI actions are executed.
- RICS Long/Short descriptions are stored and displayed as reference-only text:
    - They inform AI Describe and Smart Rules.
    - They are never exported and are not counted as required fields for export readiness.

### 7.3.3 Custom Message Field

Each product can have a **Custom Message** — an internal note visible only in ROPI (not exported to RetailOps or customer-facing sites).

**Use Cases:**

- Launch coordination notes
- Marketing instructions
- Buyer notes
- Special handling instructions

**Schema Addition:**

```json
{
  "customMessage": {
    "type": "string",
    "maxLength": 1000,
    "description": "Internal note for this product (not exported)"
  }
}
```

### 7.3.4 Launch Calendar Product Detail View

The Launch Calendar Product Detail view is the read-focused, calendar-specific product page that opens when a user clicks a product card.

### Purpose

- Provide a shopper-style, visual view of the product that matches the Launch Calendar context.
- Keep core launch attributes front-and-center (image, gender, color, launch date, Shiekh description).
- Avoid exposing internal-only fields and controls to public or unauthenticated users.

### Layout

The Launch Calendar Product Detail view shows:

- Hero product image (first image from `media[]`, with placeholder fallback).
- Product name ([`attributes.name`](http://attributes.name)).
- Gender (`attributes.gender`, badge form).
- Color information:
    - `attributes.primaryColor`
    - `attributes.descriptiveColor`
- Launch date (`attributes.launchDate`, formatted as "Nov 27, 2025").
- Shiekh description:
    - `descriptionShiekh` is the default description used in this view.
- Branding:
    - `attributes.brand` as logo or text.
- Link to public product page on [Shiekh.com](http://Shiekh.com) (when available).

### Public vs Internal Visibility

The Launch Calendar Product Detail view must support both public homepage and internal editor-overlay contexts.

**Public Homepage (Unauthenticated)**

On the public Launch Calendar or homepage, the detail view only renders:

- Hero image (`media[0]` with fallback)
- Product name ([`attributes.name`](http://attributes.name))
- Gender (`attributes.gender`)
- Color information:
    - `attributes.primaryColor`
    - `attributes.descriptiveColor`
- Launch date (`attributes.launchDate`, formatted as "Nov 27, 2025")
- Brand (`attributes.brand`)
- Shiekh description (`descriptionShiekh`)
- Link to the public product page on [Shiekh.com](http://Shiekh.com) (when available)

The following are **never shown** in public mode:

- `customMessage`
- Internal validation status
- Export readiness indicators
- AI Actions
- Edit links to the full Product Editor

**Internal View (Authenticated ROPI users)**

When an authenticated user with an edit-capable role (e.g. Admin, Merch, Buyer) views the Launch Calendar Product Detail:

- All public fields above are shown.
- Additional internal-only elements are rendered:
    - `customMessage`:
        - Internal note for this product (see Section 7.3.3).
        - Rendered as a separate "Internal Message" block.
    - "Edit Product" button:
        - Opens the full Product Editor (Section 7.3) for that product.
    - Optional internal stats (inventory, status, export readiness) as needed.

Users with view-only roles (e.g. Viewer, Photographer) may see some internal metadata but must not see edit controls or AI Actions.

```jsx
### 7.3.5 Editor Header Actions

The Product Editor header always shows three primary actions:

- **Save**
- **Validate**
- **Export Preview**

These actions control how user edits are persisted, validated, and reviewed before export. They must behave consistently with:

- Workflow W2 — Export Readiness (see <mention-page url="[https://www.notion.so/2ba45ee1ec5a809cbc1fd8daebc3f147">🧩](https://www.notion.so/2ba45ee1ec5a809cbc1fd8daebc3f147">🧩) Workflow W2 — Full Product Completion (One-Person Process)</mention-page>)
- Export Readiness Indicator (Section 7.5.4)
- Validation UX (Section 7.5)
- API Contracts (Section 6) for server-side validation and export behavior

#### Save

- Writes the current form state to Firestore for the active product.
- Does **not** require the product to be export-ready.
- Can be used at any time while the user is still working through W2.
- After a successful save:
	- Local form state is marked "clean".
	- The Export Readiness Indicator (Section 7.5.4) updates to reflect the new saved state once background validation completes.

Save is primarily a persistence action. It does not, by itself, change `statusFlags.ready_for_export`; that flag is controlled by the validation/export readiness logic described in W2 and Section 7.5.4.

#### Validate

- Triggers a validation pass over the product, using:
	- Schema validation (Section 2.1, 2.2)
	- Domain rules (Section 2.3)
	- Smart Rules (Section 4 — Smart Rules)
- The Validate action is the explicit "check my work" step for the user.
- Validation results are surfaced via:
	- Inline field-level errors and warnings (Section 7.5.1–7.5.3)
	- The Export Readiness Indicator (Section 7.5.4) in the sidebar

When validation completes, the system updates:

- `statusFlags.validation_status` to one of:
	- `"valid"`
	- `"has_errors"`
	- `"has_warnings"`
- The Export Readiness Indicator recalculates completion percentage and blocking items.

Validate does **not** force the product into a "ready for export" state; it only updates validation status and exposes issues. `statusFlags.ready_for_export` is set only when all blocking items are resolved and the product is saved in that state (see W2 and Section 7.5.4.3).

#### Export Preview

- Opens a read-focused preview of how the product will appear in:
	- RetailOps CSV export (field-level summary)
	- Site-specific contexts (Descriptions & SEO per website)

Export Preview is a **read-only** view. It:

- Uses the current saved product state.
- Highlights any remaining blocking items that prevent `ready_for_export` from being set.
- Mirrors the same criteria used by:
	- Workflow W2 Export Readiness
	- Export Manager eligibility rules (Section 7.2.5.8)
	- `statusFlags` logic (Product Schema Section 2.1)

Export Preview does **not** change product data or status flags by itself. It is a safety check for the user before they finalize W2 and allow the product to enter the Export Queue (Section 7.2.5.3).

```

---

## 7.4 Form Field Mappings

### 7.4.1 Select Fields (Dropdowns)

All Select/Multi-Select fields are populated from **Section 2.3 Domain Rules**.

| Field | Domain Source | UI Component |
| --- | --- | --- |
| gender | `domains.gender` | Single-select dropdown |
| ageGroup | `domains.ageGroup` | Single-select dropdown |
| primaryColor | `domains.primaryColor` | Single-select with color preview |
| material | `domains.material` | Multi-select chips |
| closureType | `domains.closureType` | Single-select dropdown |
| fit | [`domains.fit`](http://domains.fit) | Single-select dropdown |
| heelType | `domains.heelType` | Single-select dropdown |
| shoeHeightMap | `domains.shoeHeightMap` | Single-select dropdown |
| outsoleMaterial | `domains.outsoleMaterial` | Single-select dropdown |
| platformHeight | `domains.platformHeight` | Single-select dropdown |
| heelHeight | `domains.heelHeight` | Single-select dropdown |
| league | `domains.league` | Single-select dropdown |
| sportsTeam | `domains.sportsTeam` | Searchable single-select (grouped by league) |
| collectionName | `domains.collectionName` | Searchable single-select (grouped by brand) |
| website | [`domains.website`](http://domains.website) | Multi-select chips |
| promo | [`domains.promo`](http://domains.promo) | Single-select dropdown |
| taxClass | `domains.taxClass` | Single-select dropdown |

### 7.4.2 Text Fields

| Field | Validation | Max Length |
| --- | --- | --- |
| name | Required, non-empty | 200 |
| brand | Required, non-empty | 100 |
| mpn | Required, unique | 50 |
| descriptiveColor | Optional | 100 |
| slug | Auto-generated, URL-safe | 200 |
| metaName | Optional | 70 |
| metaDescription | Optional | 160 |
| customMessage | Optional | 1000 |

### 7.4.3 Long Text Fields (Descriptions)

| Field | Max Length | AI Generated |
| --- | --- | --- |
| descriptionShiekh | 5000 | ✅ Yes |
| descriptionKarmaloop | 5000 | ✅ Yes |
| descriptionMltd | 5000 | ✅ Yes |
| descriptionSangremia | 5000 | ✅ Yes |

### 7.4.4 Date Fields

| Field | Format | UI Component |
| --- | --- | --- |
| launchDate | YYYY-MM-DD | Date picker |
| klPostDate | YYYY-MM-DD | Date picker |
| hideImageDate | YYYY-MM-DD | Date picker |

### 7.4.5 Boolean Fields

| Field | UI Component | Default |
| --- | --- | --- |
| productIsActive | Toggle switch | false |
| hype | Toggle switch with 🔥 icon | false |
| fastFashion | Toggle switch | false |
| coreProduct | Toggle switch | false |
| familySizing | Toggle switch | false |

### 7.4.6 Money Fields

| Field | Format | Validation |
| --- | --- | --- |
| map | USD currency | ≥ 0, 2 decimal places |
| scomRegularPrice | USD currency | ≥ 0, 2 decimal places |
| scomSalePrice | USD currency | ≥ 0, ≤ regularPrice |

### 7.4.6 Money Fields

| Field | Format | Validation |
| --- | --- | --- |
| map | USD currency | ≥ 0, 2 decimal places |
| scomRegularPrice | USD currency | ≥ 0, 2 decimal places |
| scomSalePrice | USD currency | ≥ 0, ≤ regularPrice |

### 7.4.7 Launch Drawing Mode

| Field | UI Component | Options |
| --- | --- | --- |
| drawing | Select dropdown | FCFS, Store-only, Web-only, Store & Web, Token set |

---

## 7.5 Validation UX

### 7.5.1 Inline Validation

Errors display immediately as user interacts:

```
Primary Color:   [Select color...  ▼]  ⚠️ Required for export
```

### 7.5.2 Validation States

| State | Visual | Behavior |
| --- | --- | --- |
| **Valid** | Green checkmark | Field passes all rules |
| **Warning** | Yellow triangle | Field valid but recommended to fill |
| **Error** | Red border + message | Field fails validation, blocks save |
| **Pristine** | No indicator | Field not yet touched |

### 7.5.3 Domain Validation

When a user selects a value not in the domain:

- **Strict mode**: Reject and show error
- **Suggest mode**: Allow but flag for review

### 7.5.4 Export Readiness Indicator

The Export Readiness Indicator is a compact UI element in the Product Editor sidebar that shows whether the product is ready to be included in **RetailOps CSV exports**.

It is rendered as a progress bar + short summary:

```
┌─────────────────────────────────────────┐
│  Export Ready: 85%  ███████████░░       │
│  Missing: Tax Class, Karmaloop Description │
└─────────────────────────────────────────┘
```

### 7.5.4.1 What It Measures

The indicator is based on the same criteria described in Workflow W2's Export Readiness section:

- **Core Information**
    - brand, name, mpn, sku
    - department, class, category
    - at least one website selected
- **Product Attributes**
    - gender
    - ageGroup
    - primaryColor
    - taxClass
- **Descriptions & SEO (per website)**
    - For each selected website:
        - site-specific description (e.g. `descriptionShiekh`)
        - basic SEO fields (`metaName`, `metaDescription`)
- **Validation & Rules**
    - `statusFlags.validation_status === "valid"`
    - No blocking Smart Rules violations
    - No blocking Observations outstanding

**Images, Launch Calendar fields, shipping overrides, and internal messages are explicitly excluded from this calculation.**

They may be surfaced elsewhere (e.g. Launch & Media tab, calendar quality indicators), but they do not affect Export Readiness.

### 7.5.4.2 Blocking vs Warning Items

The indicator distinguishes between:

- **Blocking items (Errors)**
    - Missing required fields (e.g. no taxClass, no description for a selected website).
    - Invalid or out-of-domain values that cannot be exported safely.
    - Blocking Smart Rules (e.g. prohibited combinations of attributes).
- **Non-blocking items (Warnings)**
    - Recommended but optional completeness (e.g. missing metaDescription for a lower-priority website).
    - Soft suggestions surfaced by Smart Rules or AI (e.g. name/SEO optimization).

The UI shows:

- A list of **blocking items** that must be resolved.
- Optionally, a secondary list or count of warnings.

### 7.5.4.3 Status Flags Mapping

The indicator is tightly coupled with the product's `statusFlags` defined in the Product Schema (Section 2.1):

- `statusFlags.validation_status`
    - `"valid"` → no blocking issues
    - `"has_errors"` → at least one blocking item
    - `"has_warnings"` → only non-blocking issues remain
- `statusFlags.ready_for_export`
    - `true` when all blocking items are resolved **and** the user has saved the product in this ready state.
    - `false` otherwise.

The frontend should:

- Show **100% / "Ready for Export"** only when:
    - All blocking items are resolved, and
    - `statusFlags.validation_status === "valid"`, and
    - `statusFlags.ready_for_export === true`.
- Show a partial percentage and list missing fields otherwise.

### 7.5.4.4 Integration with Export Manager

The **Export Manager** (Section 7.2.5) uses `statusFlags` to determine export eligibility:

- Products appear in the Export Queue when:
    - `ready_for_export = true`
    - `validation_status = "valid"`
    - `uploaded_to_ro = false`

The Export Readiness Indicator is the **per-product, UI-facing view** of this state.

The Export Manager is the **batch-oriented, workflow-facing view** for RetailOps CSV generation.

No image count, media status, or Launch Calendar presentation fields should influence or be shown in the Export Readiness Indicator.

---

## 7.6 AI Integration

### 7.6.1 AI Describe Button

On the **Descriptions & SEO** tab, AOSS exposes a primary **AI Describe** entry point. This button is the user's main way to trigger the AI Describe Engine (Section 5) for the active product and selected website(s).

At minimum, the UI includes:

- A per-site **"Generate Description"** button (for the currently focused website panel).
- An optional **"Generate All"** button that generates descriptions for all selected websites in one step (see Section 7.6.2).

Example (conceptual UI layout):

```jsx
┌─────────────────────────────────────────────────────────────┐
│ Descriptions & SEO                                          │
├─────────────────────────────────────────────────────────────┤
│ Website: [ Shiekh ▾ ]                                       │
│                                                             │
│ [ Generate Description ]    [ Generate All for Selected ]   │
│                                                             │
│ Description (Shiekh)                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  ... text area bound to descriptionShiekh ...           │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**

**The Generate Description button:**

- Triggers a single-site AI Describe call for the currently active website.
- Writes the returned description + SEO fields into the product document on acceptance, as described in:
    - Section 5 — AI Describe Engine
    - Workflow W2 — AI Actions (Tab 5, W2 Section 6)

**The Generate All button:**

- Runs the same per-site generation for each website currently selected in the website multi-select field.
- Is a convenience wrapper around multiple per-site Describe calls (Section 7.6.2).

**All AI Describe actions:**

- Respect Attribute Domain Rules (Section 2.3).
- Use the templates and behavior defined in Section 5 (AI Describe Engine).
- Are available only to roles that have AI permissions per Section 7.8 (User Roles & Permissions).

```

```

### 7.6.2 AI Actions Available

AI Actions can be triggered from the dedicated **AI Actions** tab or inline on the Descriptions & SEO tab. All actions respect the current product state and the websites selected in the `website` field.

| Action | Description |
| --- | --- |
| **Generate Description** | Create or refresh the product description for a single selected website using the AI Describe Engine (Section 5).
Writes into that website's description and SEO fields (e.g. descriptionShiekh + metaName/metaDescription for [Shiekh.com](http://Shiekh.com)). |
| **Generate All** | Generate or refresh descriptions for *all websites currently selected* in the `website` field in one step.
This is a convenience wrapper that sequentially runs per-site generation for each selected website. |
| **Validate Name** | Check product name for compliance with brand and site naming conventions (length, key tokens, domain rules).
Flags issues in the Product Editor and may suggest alternative names (Section 5.9). |
| **Suggest Keywords** | Generate SEO keyword suggestions based on product attributes, RICS reference text, and existing descriptions.
Writes suggestions to the `keywords` field for the selected website or product-level SEO context. |
| **Re-run RICS Auto-Fill** | Utility action to re-apply RICS-derived suggestions.
RICS Long/Short descriptions are imported and stored during the import pipeline (Section 3.1 / 3.2). This action allows a user to re-run those hints if the product has changed, without re-importing the row. |

Notes:

- All AI actions use the fields and constraints defined in Section 5 (AI Describe Engine) and Section 2.3 (Attribute Domain Rules).
- Website coverage is always driven by the product's `website` multi-select field. If no websites are selected, AI Describe cannot generate site-specific descriptions.

### 7.6.3 AI Constraints

Per Section 5 (AI Describe Engine):

- AI must use values from defined domains (Section 2.3)
- AI cannot invent new attribute values
- AI must respect brand tone guidelines by website

---

## 7.7 Page Routes

| Route | Component | Description |
| --- | --- | --- |
| `/app/launch-calendar` | LaunchCalendar | Main calendar view |
| `/app/launch-calendar?date=2025-11-27` | LaunchCalendar | Jump to specific date |
| `/app/products` | ProductList | Grid/table view of all products |
| `/app/product/:productId` | ProductEditor | Full-page editor (alternative to panel) |
| `/app/product/:productId/edit` | ProductEditor | Edit mode |

Additional routes related to public vs internal views:

| Route | Component | Description |
| --- | --- | --- |
| `/launch-calendar` (public) | LaunchCalendarPublic | Public-facing Launch Calendar homepage, shows only public-safe fields and no internal controls. Backed by exported launch data from AOSS (see Section 6 and Section 9 for integration details). |
| `/app/launch-calendar` (internal) | LaunchCalendar | Internal Launch Calendar view inside the ROPI app. Reuses the same base UI as the public view, but adds internal-only controls and role-based behavior. |
| `/login` | AuthPage | Sign-on page. On successful authentication, redirects to `/app/launch-calendar` as the default landing screen for internal users. |

---

## 7.8 User Roles & Permissions

| Role | Launch Calendar | Product Editor | AI Actions |
| --- | --- | --- | --- |
| **Admin** | Full access | Full edit | All |
| **Merch** | Full access | Full edit | All |
| **Photographer** | View only | Edit media only | None |
| **Buyer** | Full access | Edit launch fields only | View |
| **Viewer** | View only | View only | None |

<tr>

<td>**Viewer**</td>

<td>View only</td>

<td>View only</td>

<td>None</td>

</tr>

</table>

### 7.8.1 Security Mapping (Cross-Reference)

For backend enforcement of these UI roles, see [**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md), which defines how:

- AOSS roles (`admin`, `merch`, `buyer`, `photographer`, `viewer`) are stored in Firebase Authentication custom claims, and
- are applied to Firestore and Storage rules alongside `request.auth`.

Frontend permissions (this section) and backend IAM/security (Section 9.10) must always remain consistent.

---

---

## 7.9 Technical Implementation Notes

### 7.9.1 Data Flow

```
Firestore (products collection)
        ↓
    React Query (useProducts, useProduct hooks)
        ↓
    Launch Calendar Component
        ↓
    Product Card → Product Editor Panel
        ↓
    Form State (React Hook Form)
        ↓
    Validation (AJV + Domain Rules)
        ↓
    Save → Firestore
```

### 7.9.2 Key Dependencies

- **React** (UI framework)
- **React Query** (data fetching, from Section 8)
- **React Hook Form** (form state management)
- **AJV** (JSON Schema validation, from Section 8)
- **date-fns** (date formatting)
- **TailwindCSS** (styling)

### 7.9.3 Real-time Updates

Use Firestore `onSnapshot` for:

- Launch Calendar updates (new products added)
- Product status changes
- Collaborative editing indicators

---

---

### Navigation

← Previous: [Section 6 — API Contracts & Integration (AOSS v1.0)](Section%206%20%E2%80%94%20API%20Contracts%20&%20Integration%20(AOSS%20v1%200%202b845ee1ec5a80c3baf0d2a9e415e0b5.md)

→ Next: [Section 8 — TypeScript Bindings, SDKs & Developer Tooling](Section%208%20%E2%80%94%20TypeScript%20Bindings,%20SDKs%20&%20Developer%20%202b845ee1ec5a800d9b47fbf27d531cd4.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

<!-- CHATGPT_VERIFY:

{

"path": "/Notion/link_69265bd0a644819182985a79b1bea511/fetch",

"args": "{"id":"section-7-frontend"}"

}

-->