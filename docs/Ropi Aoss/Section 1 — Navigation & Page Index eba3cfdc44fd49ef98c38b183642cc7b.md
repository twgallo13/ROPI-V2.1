# Section 1 — Navigation & Page Index

## Section 1 — Navigation & Pages (Site Map)

AOSS v1.0 — Section 1Owner: John / TheoDate: 2025-11-25

---

### 1.0 Introduction

Purpose: This section defines every navigation item and page in ROPI. It creates a single source of truth for routes, page purpose, role access, required components, API surfaces, interactions, and acceptance criteria. Every subsequent AOSS section (schema, rules, UI components, Firebase collections, etc.) will reference page names and routes from this document.

How to use this section:

Engineers: implement routes, protected pages, API calls, and UI flows according to the page templates.

Designers: build screens using the Components and layout specs.

AI agents: use nav.json and page templates to scaffold code and tests automatically.

**Ops Reference:**

Navigation flows, page templates, and cross-section dependencies must comply with the observability standards defined in **Section 11 — Observability, Monitoring & Runbooks (Ops)**.

This includes SLO tracking, structured logs, alert policies, and runbook integration for all pages documented in this navigation index.

---

### 1.1 AOSS Application Navigation Index (v1.0)

This index describes the **in-app navigation** for the AOSS web application. It is the authoritative map for pages, routes, and their corresponding specification sections.

| Module | Route (example) | Purpose / Contents | Related Specs |
| --- | --- | --- | --- |
| Home (AOSS Hub) | `/` or `/home` | High-level KPIs and shortcuts: products status, import/export status, observations, quick links to modules. | Ropi AOSS (Overview), Section 11 (SLOs & metrics), Section 10 (CI) |
| Products | `/products` | Product catalog list (search, filters, status chips, bulk actions). | Product Schema (Section 2.1), Workflow W2, Product Completion Workflows, Section 7 (Product Editor) |
| Product Editor | `/products/:productId` | 5-tab editor (Core, Attributes, Descriptions & SEO, Launch & Media, AI Actions) + sidebar (Observations, Smart Suggestions, Export Readiness). | Workflow W2, Section 7 (Frontend & Product Editor), Observations overview |
| Launch Calendar | `/launch-calendar` | Calendar view of launch products by date, brand, category; links into Product Editor for detail editing. | Section 7 — Frontend & Launch Calendar, Section 9 (Launch export behavior) |
| Import | `/import` | Import Manager: upload CSVs, view import history, check normalization results and errors. | Import Engine — Row Schema (Section 3.1), Import Normalization Rules (Section 3.2) |
| Export | `/app/export` | Export Manager: queue of products ready for RetailOps export, CSV generation, export history, mark uploaded. | Section 2.1 (statusFlags), Section 6 (API Contracts), Section 9 (export behavior) |
| Observations | `/observations` | Global list and filters for W1 observations; task-like view for open/resolved/ignored observations. | Observations — Overview, Workflow W1, Section 11 (Ops & runbooks) |
| Attributes | `/attributes` | Attribute Registry UI (human + JSON); manage attribute definitions and domains. | Attribute Registry — Human & JSON, Attribute Domain Rules (Section 2.3) |
| Smart Rules | `/smart-rules` | Smart Rules list, rule editor, and test console; controls suggestions and automated validations. | Section 4 — Smart Rules, Section 10.8 (SmartRule tests) |
| Settings / Admin | `/app/settings` | Card-based admin hub for all system configuration: Attributes, Smart Rules, AI Templates, AI Settings, Export Profiles, Archiver & Retention, and User Management.
All controls inside `/app/settings` require the `admin` role. | Admin UI Build Spec — Settings CRUD, Section 5 — AI Describe Engine, Section 9 (Firebase Security), Section 13 (Admin Console) |

### 1.2 Navigation Conventions

- The **Home** module is informational and navigational; it does not replace module-specific pages (Products, Import, Export, etc.).
- Each module maps to clear, independent routes and code modules (frontend + backend), to support:
    - Role-based access control
    - Testability and observability
    - AI-assisted code generation and automation
- Detailed behavior of specific pages lives in:
    - **Section 7** for frontend views (Product Editor, Launch Calendar)
    - **Section 3** for Import flows
    - **Section 2 / Attribute Registry / Smart Rules** for configuration-driven behavior

---

### 1.3 Navigation Principles

1. Human-first labels: UI text must use approved friendly names (e.g., "Import Products", "Ready to Publish"). Do not surface internal names such as "Intake" or "Outtake."
2. Predictable structure: Public pages live at root (/, /help). Authenticated workspace roots live under /app/*.
3. Role visibility: Left navigation is generated per-user based on Firebase custom claims (admin, merch, photographer, buyer, viewer). Items not permitted are hidden.
4. Accessibility: All interactive elements must have ARIA labels. Keyboard support for primary flows is required (tab order, Esc to close modal, Enter to activate primary buttons).
5. Localization: All visible labels must come from i18n keys; do not hardcode English strings in components. Use a centralized label file for overrides (src/i18n/en/ropi-ui.json).
6. Persistent search & quick actions: Global search sits in top bar; quick actions (Import, Create Launch Card) are persistent.
7. Consistent CTAs: Primary action on pages uses label semantics (Save Draft, Generate Description, Download Export).

---

---

### 1.2 Global Structure & Top-level Routes

**Public (no sign-in):**

/ → Launch Calendar (public homepage) — product cards & modals (public product info)

/help → Help & Docs (public FAQ and Glossary)

/about → Optional marketing info

**Authenticated workspace (/app/*):**

/app/dashboard — Dashboard (metrics & quick queues)

/app/launch-calendar — Internal Launch Calendar (editable)

/app/products — Products list (grid/search/filters)

/app/product/:productId — Product Editor (Product Details)

/app/import — Import Products (CSV / PO)

/app/export — Export / Download CSV

### `/app/settings` — Settings Hub (Admin Only)

The Settings hub uses a card-based layout. Each card links to a dedicated admin screen:

- `/app/settings/attributes` — Attribute Manager
- `/app/settings/smart-rules` — Smart Rules Manager
- `/app/settings/ai-templates` — AI Template Builder (Audience Templates)
- `/app/settings/ai` — Global AI Settings
- `/app/settings/export-profiles` — Export Profiles Manager
- `/app/settings/archiver` — Archiver & Retention Settings
- `/app/settings/users` — User Management

All screens under `/app/settings` enforce `admin`-only access.

/app/observations — Product Notes & Photos hub

/app/archive — Archived Products (admin)

/app/help — Authenticated help content (internal docs)

**Route naming rules:**

Use hyphenated lower-case slugs for routes (e.g., /app/launch-calendar).

Product detail route uses :productId param; productId must be canonical productId (mpn/uid).

---

### 1.3 Roles & Nav Visibility

**Roles:**

admin — full access

merch — product editing, import/export, launch calendar

photographer — upload observations only (restricted editor)

buyer — view + limited edit (pricing/launch)

viewer — read-only internal access (store managers)

**Left nav visibility mapping (machine-readable in 1.12):**

dashboard — admin, merch, buyer, photographer, viewer

launch-calendar — admin, merch, buyer, photographer, viewer

products — admin, merch, buyer, photographer

import — admin, merch

export — admin, merch

attributes — admin

ai-templates — admin

observations — admin, merch, photographer

users — admin

settings — admin

archive — admin

help — all

Implementation note: Role-based nav generation uses custom claims in request.auth.token (or users/{uid}.role fallback). Use both for speed & auditability.

---

### Describe Integration (Navigation Reference)

- `/app/product/<id>` → Uses Describe Engine during completion.
- `/app/settings/ai-templates` → Controls audience rules.
- `/app/settings/ai` → Controls tone, defaults, and rate limits.
- `/app/settings/smart-rules` → Pre-transform fields used in template matching.

---

### 1.4 Navigation Patterns & Layout

**Desktop (primary):**

Left rail — primary navigation (collapsible).

Top bar — brand logo (left), global search (center), user menu (right), quick actions (Import, Create Launch Card).

Main content — page content, centered or full-width as appropriate.

Right context panel — optional for Smart Suggestions or quick preview.

**Mobile:**

Hamburger opens slide-in nav.

FAB at bottom-right: + Create Launch Card / Scan / Add Note.

Product Editor becomes full-screen with stacked tabs.

Breadcrumbs: show Products / [Brand] [MPN] / Product Details. On modals (Launch Calendar modal), breadcrumbs remain but modal does not change URL.

Persistence: Users' last open saved view / column state persists in users/{uid}/settings.

---

### 1.5 Quick Actions & Keyboard Shortcuts

**Global hotkeys:**

/ → focus search

g then p → Go to Products

g then l → Go to Launch Calendar

n → Create Launch Card (when not focused in input)

Shift + / → Show Keyboard Shortcuts

**Quick actions:** Import Products, Create Launch Card, Bulk Actions (Accept Suggestions), Scan (mobile).

Accessibility: All hotkeys listed in a "Keyboard Shortcuts" modal (/app/help#shortcuts).

---

### 1.6 Page Inventory — Brief Purpose List

Each page below will be fully documented using the page template (1.x.y.x), starting with priority pages. After your review, I'll expand each into the full page template. For now, short summary per page:

/ (Launch Calendar) — public listing of upcoming launches grouped by date. Cards open a product modal with detail. Anyone can view; authenticated users can add Launch Messages.

/app/dashboard — KPI tiles, quick queues (Needs Attention, Ready to Publish), recent activity.

/app/launch-calendar — internal calendar for launch planning (create/edit cards, filters).

/app/products — product list with robust search/filter/sort, column options, saved views, bulk actions.

/app/product/:productId — product editor: tabs for Basic, Descriptive, Images & Notes, SEO & Site Content, Smart Suggestions, Activity Log. Includes AI generation controls, per-site SEO view, and SmartSuggestions UI.

/app/import — upload CSV or PO import flow, mapping UI, validation preview, import history.

/app/export — export selected products as single CSV with HTML descriptions and |-separated website list.

/app/attributes — attribute manager (create/edit/deprecate attribute definitions). Admin only.

/app/ai-templates — AI template editor & versioning. Admin only.

/app/observations — CRUD for observations: images, notes, AI insights. Photographer/merch roles.

/app/users — user invite & role assignment (admin).

/app/settings — system settings: SEO rules, SmartRules editor, RICS preferences, archiver knobs.

/app/archive — archived products with restore & export.

/app/help — documentation, glossary, keyboard shortcuts.

---

### 1.7 Page Detail Template

All pages must be documented using this template (copy/paste-ready). I will use it to produce full docs for priority pages.

**Template Header**

1.x.y Title: [Page Title]Route: /app/...Version: AOSS 1.0Owner: <person/team>

**Workflow Reference:**

**Workflow W2 — Full Product Completion (One-Person Process)**

**Workflow Reference:**

**Workflow W1 — Observations Capture & Apply to Product**

[Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)

**Workflow W2 — Full Product Completion (One-Person Process)**

[🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)

[🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)

**1.x.y.1 Purpose & user story**

Who: [role]

Why: [business reason]

Outcome: [what success looks like]

**1.x.y.2 Roles & access**

View: [roles]

Edit: [roles]

Admin-only actions: [list]

**1.x.y.3 Components & layout**

Primary components: [data grid / tabs / modal]

Secondary components: [toasts, drawers]

Visual reference: image link(s) if available

**1.x.y.4 Data & API surface**

Minimum shallow product object needed (fields)

API endpoints needed (GET /api/products, POST /api/describe, etc.)

Required Firestore indexes

**1.x.y.5 Key interactions & state changes**

Primary user flows: Generate Description → AI job, Save → validation

Side effects: Smart suggestions update, statusFlags changes

**1.x.y.6 Acceptance criteria**

Functional tests

Edge cases

**1.x.y.7 Accessibility**

ARIA roles, keyboard flows, contrast

**1.x.y.8 Tests**

Unit tests, integration tests, e2e scenario

**1.x.y.9 Implementation notes**

Caching decisions

Lazy loading

Server-side paging

**1.x.y.10 Microcopy**

Buttons, tooltips, badges — exact strings

---

### 1.8 Priority Pages — Full Templates

Below are complete page templates for the highest-priority pages. These are ready to paste into Notion and to hand to engineers. After you review/approve these, I will produce the rest of the pages with the same fidelity.

---

### 1.8.1 GET / — Launch Calendar (Public Homepage)

**Header**

1.8.1 Title: Launch Calendar (Public Homepage)Route: /Owner: Product / Marketing

**1. Purpose & user story**

Who: Shiekh customers and public audience

Why: Promote upcoming drops with clear imagery, date and quick CTA

Outcome: Visitors can browse upcoming launches by date, view product modal, and sign up for notifications

**2. Roles & access**

Public: all

Internal users (signed-in): add Launch Messages via modal

**3. Components & layout**

Date group headers (e.g., "NOVEMBER 28")

Product cards under each date (grid)

Product image (square)

Price

Brand (line 1)

Product name (line 2, bold)

Colorway (line 3)

Target line (Gender + Age Group + Class)

CTA NOTIFY ME (public)

Click a card: open modal (see 1.8.1.5)

Filters at top: month selector, brand, Hype toggle (optional)

**4. Data & API**

Data source: launchCards collection; each card links to productId

API endpoint: GET /api/launch-cards?dateRange=...&brand=...

Required fields per card:

productId, brand, productName, descriptiveColor, price, imageUrl, gender, ageGroup, launchDate, hype, core_product

**5. Interactions & modal behavior**

Modal shows:

Large image, brand, product name, colorway

Price

Gender + AgeGroup + Category

Launch Date and time (optional)

HYPE badge and Core Product badge

Notify Me CTA (public)

For signed-in internal user: Launch Messages panel to add notes (chronological)

Modal must be accessible and closable with Esc and a Close button.

**6. Acceptance criteria**

Public page loads within 1.5s for first 12 items

Card click opens modal without full-page reload

Noticeable Hype and Core Product badges appear correctly

Notify Me triggers sign-up modal or collects email (if opted in)

**7. Accessibility**

Cards have role="button" and aria-label="Open launch for {productName}"

Modal traps focus and has aria-modal="true"

**8. Tests**

E2E: Visit /, select date, open first card, verify CTA Notify Me visible

Accessibility: Axe scan of calendar and modal

**9. Implementation notes**

Use public read of launchCards (no sensitive data)

Rate-limit public API responses

Images served from CDN (Storage signed for internal but public for launch images)

**10. Microcopy**

Date header format: NOVEMBER 28 (all-caps month)

Card CTA: NOTIFY ME

Modal note for internal: Launch Messages (internal only)

**Design reference**

Use uploaded screenshot for exact layout: /mnt/data/10ce7b8b-916d-4378-bdaf-77e13bf53019.png

---

### 1.8.2 GET /app/products — Product Page (List & Grid)

**Header**

1.8.2 Title: ProductsRoute: /app/productsOwner: Merch / Product

**1. Purpose & user story**

Who: Merch, admin, buyer

Why: Find, filter, and take bulk actions on products; preview product quality and status

Outcome: Users can find products, review Smart Suggestions, and perform bulk updates/export

**2. Roles & access**

View & edit: admin, merch, buyer (photographer has limited)

Photographers: read-only for grid; can open Observations tab in product editor

**3. Components & layout**

Header: Title ("Products"), global search, Quick Actions (Import, Create Launch Card, Bulk Actions)

Left: Filters pane (collapsible)

Main: Data grid with checkboxes

Right: Optional quick-preview drawer

Footer: Pagination / load more

Column config modal (show/hide/reorder/save view)

**4. Data & API surface**

Endpoint: GET /api/products?filters=...&sort=...&pageToken=...

Shallow product doc fields (grid): productId, thumbnail, ropiScore, brand, productName (or MPN), primaryColor, category, gender, price, launchDate, statusFlags, aiOverall, websiteArray

Server supports fields param to request only required fields for performance

**5. Key interactions**

Search: q typed -> query backend; debounce 300ms

Filters: update -> re-request results

Column actions: change columns -> persist per-user

Bulk actions: select rows -> choose action -> confirm modal

Row click -> open drawer (quick preview) or open full product editor

**6. Acceptance criteria**

Grid renders 25 rows under 1s with server-side paging

Complex filter combos return results under 2s

Bulk accept suggestions works for selected set and for "all matching" (server side)

Column config persists per-user and saved views work

**7. Accessibility**

Table roles, aria-sort, keyboard selection, header labels

**8. Tests**

Integration test for GET /api/products with combined filters

E2E for bulk accept and export flows

**9. Implementation notes**

Use products_search denormalized collection for text search (Firestore-first strategy). Sync on product writes via function.

Provide Firestore composite indexes for common queries.

**10. Microcopy**

Buttons: Create Launch Card, Import Products, Bulk Actions

Filter clear: Clear All Filters

---

### 1.8.3 GET /app/product/:productId — Product Editor

**Header**

1.8.3 Title: Product DetailsRoute: /app/product/:productIdOwner: Merch

**1. Purpose & user story**

Who: Merch, buyer, admin, photographer (observations)

Why: Finalize product information for publishing; add observations and generate AI descriptions

Outcome: Product passes validation, has per-site SEO, and is ready for export

**2. Roles & access**

Full edit: admin, merch; photographer can add observations only

**3. Components & layout**

Page header with product name, brand, MPN, ROPI Score, badges

Tabs:

Basic Info

Descriptive

Images & Notes (Observations)

SEO & Site Content (site tabs)

Smart Suggestions

Activity Log

Right panel: AI Quick Actions (Generate, Improve to 10), Smart Suggestions summary

Save Draft / Preview (per-site) / Publish buttons

**4. Data & API**

GET /api/product/:productId -> full product doc

POST /api/product/:productId/ai/describe?site=shiekh -> generate per-site description

POST /api/product/:productId/smart-apply -> apply suggestion(s)

PUT /api/product/:productId -> save edits

**5. Key interactions & state changes**

Generate Description -> create job -> update ai.scores[site], write descriptive.siteDescriptions[site]

Accept Suggestion -> update field and recalc ROPI Score

Adding observation -> pushes photo to Storage and triggers image analysis job -> suggestions added to Smart Suggestions

**6. Acceptance criteria**

Generating description writes site HTML and AI scores

Save flow updates last_edited_at and shows success toast

Approval process logs author in Activity Log

**7. Accessibility**

Tab roles, form field labels, per-site description aria labels, modal focus trap

**8. Tests**

Unit: smart suggestions apply -> result changes field value

Integration: generate description -> description saved -> SEO visible

**9. Implementation notes**

For large content, use WYSIWYG with HTML sanitization and limited tag whitelist (p, ul, li, strong, em, br)

**10. Microcopy**

Save: Save Draft

Generate: Generate Description

Improve 10: Improve to 10

Preview button: Preview (Shiekh Preview)

---

### 1.8.4 GET /app/import — Import Products

**Header**

1.8.4 Title: Import ProductsRoute: /app/importOwner: Merch

**1. Purpose & user story**

Import CSV or provide PO to seed the product dataset; run preliminary mapping & validation

**2. Roles**

admin, merch

**3. Layout & components**

Upload area (drag & drop)

Mapping UI (CSV header → attribute registry)

Validation preview table with flagged rows

Import settings: minimal/full mode, auto-run smart rules

Import history list

**4. API**

POST /api/import (uploads file path)

GET /api/import/{jobId}/status

POST /api/import/mapping for saved mappings

**5. Data flows**

Upload -> parse -> adaptRowToCanonicalPaths -> uuid detection -> write product draft documents -> Smart Rules -> validate -> mark imported

**6. Acceptance criteria**

Upload -> parse -> adaptRowToCanonicalPaths -> uuid detection -> write product draft documents -> Smart Rules -> validate -> mark imported

**Section 9 Cross-References:**

- **9.10 — IAM Roles & Auth Mapping**
    
    Backend role enforcement and Firebase Authentication custom-claim model.
    
    Links: Section 7.8 (UI Roles), Section 9.6 (Firestore Rules)
    

**6. Acceptance criteria**

Reject rows without MPN/SKU and present errors

Skip UUID placeholders for product names

Save mapping presets for repeat imports

**7. Microcopy**

Upload CTA: Drop CSV here or choose file

Notice: MPN or SKU required. UUID-style placeholders will be ignored.

---

### 1.8.5 GET /app/settings — Settings (Admin)

**Header**

1.8.5 Title: SettingsRoute: /app/settingsOwner: Admin

**1. Purpose**

System config: SEO, AI templates, Smart Rules, archive knobs, RICS preferences

**2. Roles**

admin

**3. Layout & Sub-pages**

`/app/settings` uses a card-based layout. Each card links to a dedicated admin sub-page:

- Attributes → `/app/settings/attributes`
- Smart Rules → `/app/settings/smart-rules`
- AI Templates → `/app/settings/ai-templates`
- Users → `/app/settings/users`
- Export Profiles → `/app/settings/export-profiles`
- Archiver & Retention → `/app/settings/archiver`
- (Future) AI Settings → `/app/settings/ai` (global AI controls such as default template selection, tone presets, and safety/rate-limiting knobs)

This card-based hub replaces the older "tabbed Settings" mental model. Individual sub-pages may still use local tabs where needed (for example, AI Templates vs AI defaults), but `/app/settings` itself is treated as a navigational hub, not one giant form.

**4. Acceptance**

Saving settings updates /settings/* documents and triggers validation

**5. Microcopy**

SEO title length: Recommended ≤ 60 characters

Archive knobs: explanatory notes

---

### 1.9 Page Templates: Acceptance Criteria & Tests

For each page we will include the tests listed in the Page Template. For the priority pages above, the automated tests must include:

**Product Page tests:**

Filter combinations and sorting return correct results (integration)

Column config persists per user (unit/integration)

Bulk actions apply changes to all selected products including "apply to all matching results" (server side)

Security tests: photographer cannot edit non-observation fields (emulator)

**Product Editor tests:**

Generate description flow persists HTML and AI scores

Activity Log records author & action

Observations upload triggers image-analysis job and suggestions appear

**Import tests:**

Import rejects rows without MPN or SKU

UUID-style names are ignored (unit test for looksLikeTrackingUuid)

---

### 1.10 Mobile Behavior & Progressive Disclosure

Filters collapsed into a single "Filter" button that opens a full-screen panel.

Data grid shows compact cards: thumbnail, brand, productName/MPN, ROPI Score, badges.

Product Editor becomes full-screen stacked tab interface with Save at top right.

Camera & upload: stylists/photographers can Scan product (opens camera), attach images, and submit observations; image upload triggers background AI job; show progress spinner.

---

### 1.11 Accessibility & i18n

All actionable elements include ARIA labels and keyboard instructions in app/help.

Color contrast meets WCAG AA.

All UI strings sourced from i18n JSON and editable in Admin label overrides.

Left nav should be readable with screen readers; menu items should have aria-current on active.

---

### 1.12 Machine-readable nav manifest (nav.json)

Copy/paste-ready manifest used by app to generate nav:

```json
[
  {
    "id": "home",
    "label": "Home",
    "path": "/app/home",
    "icon": "home"
  },
  {
    "id": "products",
    "label": "Products",
    "path": "/app/products",
    "icon": "box"
  },
  {
    "id": "launch-calendar",
    "label": "Launch Calendar",
    "path": "/app/launch-calendar",
    "icon": "calendar"
  },
  {
    "id": "import",
    "label": "Import",
    "path": "/app/import",
    "icon": "upload"
  },
  {
    "id": "export",
    "label": "Export",
    "path": "/app/export",
    "icon": "download"
  },
  {
    "id": "observations",
    "label": "Observations",
    "path": "/app/observations",
    "icon": "flag"
  },
  {
    "id": "attributes",
    "label": "Attributes",
    "path": "/app/attributes",
    "icon": "list"
  },
  {
    "id": "smart-rules",
    "label": "Smart Rules",
    "path": "/app/smart-rules",
    "icon": "sparkles"
  },
  {
    "id": "settings",
    "label": "Settings",
    "path": "/app/settings",
    "icon": "settings"
  }
]
```

---

### Navigation

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

→ Next: [Product Schema — JSON (Section 2.1)](Product%20Schema%20%E2%80%94%20JSON%20(Section%202%201)%202b845ee1ec5a811bb355ee431515f0c4.md)