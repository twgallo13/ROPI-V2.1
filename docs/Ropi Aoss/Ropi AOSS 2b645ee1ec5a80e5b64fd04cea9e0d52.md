# Ropi AOSS

---

# ROPI AOSS v1.0 — Master Documentation

**Owner:** John / Theo

**Version:** AOSS v1.0

**Last Updated:** 2025-11-27

This is the canonical documentation hub for ROPI (Retail Operations Product Intelligence). All sections are linked below with consistent navigation.

---

## Quick Navigation

## AOSS Application Information Architecture (v1.0)

The AOSS application UI follows a **Hub + Segmented Workflow** model (Option C):

- A single **Home (AOSS Hub)** overview page
- Clear, dedicated modules for:
    - Products
    - Launch Calendar
    - Import
    - Export
    - Observations
    - Attributes
    - Smart Rules
    - Settings / Admin

This structure is designed to:

- Keep each workflow (editing products, importing data, exporting to RetailOps, managing rules) isolated and understandable.
- Align with enterprise SaaS and admin consoles (inventory systems, ERPs, e-commerce dashboards).
- Make it easy for developers and AI tooling to map each module to its own routes, components, and services.

### Top-Level Navigation (AOSS App)

The primary navigation for the AOSS web app is:

1. **Home (AOSS Hub)**
    - Dashboard of key KPIs and shortcuts:
        - Products "In Progress", "Ready for Export", "Uploaded to RetailOps"
        - Recent imports and failures
        - Observations requiring attention
    - Quick links to:
        - "Work Next Product"
        - "Upload CSV" (Import)
        - "Open Export Queue" (Export)
2. **Products**
    - Product catalog list (search, filters, bulk actions)
    - Search, filters, and default sort in the product catalog list are centrally controlled from `/app/settings/search` (Search & Filter Settings). Admins can adjust which fields are searchable and which filters appear without changing code.
    - Product Editor (Workflow W2):
        - 5 tabs: Core, Attributes, Descriptions & SEO, Launch & Media, AI Actions
        - Right sidebar: Observations, Smart Suggestions, Export Readiness
    - This is where users *work on product records*.
3. **Launch Calendar**
    - Calendar-centric view of launch products.
    - Uses the same product data but optimized for planning and marketing.
    - Allows filtering by brand, category, launch date windows, website, etc.
    - Does not replace the Product Editor; it links into it.
4. **Import (Import Manager)**
    - Upload CSV files according to the Import Engine — Row Schema (Section 3.1).
    - View import history and normalization results (Section 3.2).
    - Inspect and resolve row-level errors.
    - Owned by operations/data teams.
5. **Export (Export Manager)**
    - View products that are **ready for export** based on status flags and validation.
    - Select products and generate **RetailOps-ready CSV** batches.
    - Mark products as "uploaded to RetailOps" after CSV upload is completed.
    - Export history (what was exported, when, and by whom).
6. **Observations**
    - Global view of observations captured in Workflow W1.
    - Filter by product, assignee, status (open/resolved/ignored).
    - Use as a task queue for data cleanup and product enhancement work.
    - Observations also surface inside the Product Editor sidebar for inline resolution.
7. **Attributes**
    - Human + JSON view of the Attribute Registry.
    - Manage attribute definitions, domain values, and notes.
    - Source of truth for attribute domains used by Products, Import normalization, and validation.
8. **Smart Rules**
    - List of Smart Rules that apply across imports, products, and workflows.
    - Rule editor and test console to evaluate rules against sample products.
    - Controls automated suggestions, warnings, and certain validation behaviors.
9. **Settings / Admin**
    - System-level configuration and administrative tools:
        - User roles and permissions
        - System settings documents (e.g., `system_settings/*`)
        - Import/Export templates and mappings
        - API keys, environment flags
        - Audit logs and advanced configuration

This IA is the authoritative map for how the AOSS UI is structured.

Section 1 ("Navigation & Page Index") and Section 7 ("Frontend & Launch Calendar") provide more detailed indexing and frontend behavior for each module.

---

## Quick Navigation

### 📍 Section 1 — Navigation & Index

[Section 1 — Navigation & Page Index](Section%201%20%E2%80%94%20Navigation%20&%20Page%20Index%20eba3cfdc44fd49ef98c38b183642cc7b.md)

---

### 📐 Section 2 — Schema & Data Model

[Product Schema — JSON (Section 2.1)](Product%20Schema%20%E2%80%94%20JSON%20(Section%202%201)%202b845ee1ec5a811bb355ee431515f0c4.md)

[Attribute Validation Schema — JSON (Section 2.2)](Attribute%20Validation%20Schema%20%E2%80%94%20JSON%20(Section%202%202)%202b845ee1ec5a805fba0ef665dfb17396.md)

[Attribute Domain Rules — JSON (Section 2.3)](Attribute%20Domain%20Rules%20%E2%80%94%20JSON%20(Section%202%203)%202b845ee1ec5a8056bc5cc7b29fce11df.md)

[Attribute Registry — Human & JSON](Attribute%20Registry%20%E2%80%94%20Human%20&%20JSON%202b845ee1ec5a81228b07ca97964cd033.md)

---

### 🔄 Section 3 — Import & Export

[Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)

[Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)

---

### ⚡ Section 4 — Smart Rules & Automation

[Section 4 Smart Rules](Section%204%20Smart%20Rules%202b845ee1ec5a80e98270ea192ae29f97.md)

---

### 🤖 Section 5 — AI Describe Engine

[Section 5 — AI Describe Engine ](Section%205%20%E2%80%94%20AI%20Describe%20Engine%202b845ee1ec5a80ba8666e0f2d722b83f.md)

---

### 🔌 Section 6 — API Contracts

[Section 6 — API Contracts & Integration (AOSS v1.0)](Section%206%20%E2%80%94%20API%20Contracts%20&%20Integration%20(AOSS%20v1%200%202b845ee1ec5a80c3baf0d2a9e415e0b5.md)

---

### 🖥️ Section 7 — Frontend & UI

[Section 7 — Frontend & Launch Calendar](Section%207%20%E2%80%94%20Frontend%20&%20Launch%20Calendar%202b845ee1ec5a811d8d47ef14b3d0f46c.md)

[Admin UI Build Spec — Settings CRUD](Admin%20UI%20Build%20Spec%20%E2%80%94%20Settings%20CRUD%202b845ee1ec5a81e58df8f9633b2e0e2b.md)

---

### 🛠️ Section 8 — Developer Tooling

[Section 8 — TypeScript Bindings, SDKs & Developer Tooling](Section%208%20%E2%80%94%20TypeScript%20Bindings,%20SDKs%20&%20Developer%20%202b845ee1ec5a800d9b47fbf27d531cd4.md)

---

### 🔥 Section 9 — Firebase & Infrastructure

[**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)

[**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)

- **Section 9.10 — IAM Roles & Auth Mapping**
    
    Mapping of AOSS user roles (Section 7.8) to Firebase Auth custom claims and backend access rules.
    

---

---

### 🚀 Section 10 — CI/CD & Release

[Section 10 — CI / CD, Testing, Release & Stability](Section%2010%20%E2%80%94%20CI%20CD,%20Testing,%20Release%20&%20Stability%202b845ee1ec5a80ccaf70e49777a2b677.md)

---

### 📊 Section 11 — Observability & Ops

[**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md)

---

### 🔀 Section 12 — Migration

[Section 12 — Migration, Staging & Cutover Plan](Section%2012%20%E2%80%94%20Migration,%20Staging%20&%20Cutover%20Plan%202b845ee1ec5a80658739f5ce9d768e11.md)

---

### 👥 Section 13 — Admin & Training

[**Section 13 — Admin Console, Help & Training**](Section%2013%20%E2%80%94%20Admin%20Console,%20Help%20&%20Training%202b845ee1ec5a80fd845cd4180814f782.md)

---

### 📎 Section 14 — Appendix & Changelog

[Section 14 — Appendix, Change Log & Final Deliverables](Section%2014%20%E2%80%94%20Appendix,%20Change%20Log%20&%20Final%20Delivera%202b845ee1ec5a801ea453cd4578501b39.md)

---

## Workflows & Observations

[Observations — Overview, purpose, workflow, and logic](Observations%20%E2%80%94%20Overview,%20purpose,%20workflow,%20and%20lo%202b845ee1ec5a81e1aeeae43318b38039.md)

[Export Manager — RetailOps CSV Workflow](Export%20Manager%20%E2%80%94%20RetailOps%20CSV%20Workflow%2073e34ec744234dc3a9ad043c36bdbdc6.md)

- Route: `/app/export`
- Spec for RetailOps CSV export, including Export Queue, batch CSV generation, upload confirmation, and export history.

[RetailOps CSV Field Mapping](RetailOps%20CSV%20Field%20Mapping%20348d1e671b7b407d984ec243a02981d1.md)

- Complete mapping of all RetailOps CSV columns to AOSS Product fields.

[Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)

- **Workflow W1 — Observations Capture & Apply to Product**
    
    [Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)
    
- **Workflow W2 — Full Product Completion (One-Person Process)**
    
    [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)
    

---

## Section Overview

| **Section** | **Purpose** |
| --- | --- |
| Section 1 | Navigation structure, page templates, role access matrix |
| Section 2 | Canonical JSON schemas for all data types (Product, Attribute, SmartRule, etc.) |
| Section 3 | Import/Export workflows, row mapping, normalization rules |
| Section 4 | Smart Rules system: Part 1 (user & workflow behavior for Import, W1, W2) and Part 2 (technical schema, condition/action syntax, conflict handling). |
| Section 5 | AI description generation, prompt templates, scoring system |
| Section 6 | REST API contracts, OpenAPI spec, authentication |
| Section 7 | Frontend UI specs, Launch Calendar, Product Editor |
| Section 8 | TypeScript bindings, code generation, developer SDK |
| Section 9 | Firebase collections, security rules, storage layout, IAM roles & auth mapping |
| Section 10 | GitHub Actions, testing strategy, release process |
| Section 11 | Logging, monitoring, alerts, runbooks |
| Section 12 | Migration scripts, staging plan, cutover checklist |
| Section 13 | Admin UI specs, help articles, training materials |
| Section 14 | Changelog, artifact manifest, handoff checklist |

### **System files don't delete!!!!!!!**

************DO NOT DELETE ANYTHING PASSED THIS********

[Observations — Overview, purpose, workflow, and logic](Observations%20%E2%80%94%20Overview,%20purpose,%20workflow,%20and%20lo%202b845ee1ec5a81e1aeeae43318b38039.md)

[Admin UI Build Spec — Settings CRUD](Admin%20UI%20Build%20Spec%20%E2%80%94%20Settings%20CRUD%202b845ee1ec5a81e58df8f9633b2e0e2b.md)

[Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)

[Section 1 — Navigation & Page Index](Section%201%20%E2%80%94%20Navigation%20&%20Page%20Index%20eba3cfdc44fd49ef98c38b183642cc7b.md)

[Product Schema — JSON (Section 2.1)](Product%20Schema%20%E2%80%94%20JSON%20(Section%202%201)%202b845ee1ec5a811bb355ee431515f0c4.md)

[Attribute Validation Schema — JSON (Section 2.2)](Attribute%20Validation%20Schema%20%E2%80%94%20JSON%20(Section%202%202)%202b845ee1ec5a805fba0ef665dfb17396.md)

[Attribute Domain Rules — JSON (Section 2.3)](Attribute%20Domain%20Rules%20%E2%80%94%20JSON%20(Section%202%203)%202b845ee1ec5a8056bc5cc7b29fce11df.md)

[Import Engine — Row Schema (Section 3.1)](Import%20Engine%20%E2%80%94%20Row%20Schema%20(Section%203%201)%202b845ee1ec5a81b4afa9d1375e153900.md)

[Import Normalization Rules (Section 3.2)](Import%20Normalization%20Rules%20(Section%203%202)%202b845ee1ec5a8113b7bbe413c23e9b47.md)

[Attribute Registry — Human & JSON](Attribute%20Registry%20%E2%80%94%20Human%20&%20JSON%202b845ee1ec5a81228b07ca97964cd033.md)

[Section 4 Smart Rules](Section%204%20Smart%20Rules%202b845ee1ec5a80e98270ea192ae29f97.md)

[Section 5 — AI Describe Engine ](Section%205%20%E2%80%94%20AI%20Describe%20Engine%202b845ee1ec5a80ba8666e0f2d722b83f.md)

[Section 6 — API Contracts & Integration (AOSS v1.0)](Section%206%20%E2%80%94%20API%20Contracts%20&%20Integration%20(AOSS%20v1%200%202b845ee1ec5a80c3baf0d2a9e415e0b5.md)

[Section 7 — Frontend & Launch Calendar](Section%207%20%E2%80%94%20Frontend%20&%20Launch%20Calendar%202b845ee1ec5a811d8d47ef14b3d0f46c.md)

[Section 8 — TypeScript Bindings, SDKs & Developer Tooling](Section%208%20%E2%80%94%20TypeScript%20Bindings,%20SDKs%20&%20Developer%20%202b845ee1ec5a800d9b47fbf27d531cd4.md)

[**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)

[Section 10 — CI / CD, Testing, Release & Stability](Section%2010%20%E2%80%94%20CI%20CD,%20Testing,%20Release%20&%20Stability%202b845ee1ec5a80ccaf70e49777a2b677.md)

[**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md)

[Section 12 — Migration, Staging & Cutover Plan](Section%2012%20%E2%80%94%20Migration,%20Staging%20&%20Cutover%20Plan%202b845ee1ec5a80658739f5ce9d768e11.md)

[**Section 13 — Admin Console, Help & Training**](Section%2013%20%E2%80%94%20Admin%20Console,%20Help%20&%20Training%202b845ee1ec5a80fd845cd4180814f782.md)

[Section 14 — Appendix, Change Log & Final Deliverables](Section%2014%20%E2%80%94%20Appendix,%20Change%20Log%20&%20Final%20Delivera%202b845ee1ec5a801ea453cd4578501b39.md)

Files

[smartEngine.test.ts](smartEngine.test.ts)

[smartEngine.ts](smartEngine.ts)

[smartRulesFunctions.ts](smartRulesFunctions.ts)

[tsconfig.json](tsconfig.json)

[types.ts](types.ts)

[canonicalRules.ts](canonicalRules.ts)

[index.ts](index.ts)

[package.json](package.json)

[README.md](README.md)

[Product Completion Workflows](Product%20Completion%20Workflows%202ba45ee1ec5a80698690f9492961ed8b.md)

[🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)

[Export Manager — RetailOps CSV Workflow](Export%20Manager%20%E2%80%94%20RetailOps%20CSV%20Workflow%2073e34ec744234dc3a9ad043c36bdbdc6.md)

[RetailOps CSV Field Mapping](RetailOps%20CSV%20Field%20Mapping%20348d1e671b7b407d984ec243a02981d1.md)

[🚀 Ropi AOSS — Build Progress Log & Workflow State](%F0%9F%9A%80%20Ropi%20AOSS%20%E2%80%94%20Build%20Progress%20Log%20&%20Workflow%20State%202bd45ee1ec5a800da672f7dac3000966.md)

[Repo Governance — Lisa (Repo Ops AI) / PR & Branch Rules](Repo%20Governance%20%E2%80%94%20Lisa%20(Repo%20Ops%20AI)%20PR%20&%20Branch%20R%202c245ee1ec5a807e9308ddaceebc7cc7.md)