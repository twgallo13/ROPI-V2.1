# ROPI AOSS — Clean AOSS scaffold
This repository is the canonical implementation for Ropi AOSS.
Single source of truth lives in Notion: Section 1..14 (ROPI AOSS).

## Repo layout (AOSS v0.1.0 scaffold)

- `packages/cli` — CLI tools (e.g. Notion import/export) — implementation will follow Import Engine specs in Section 3.x of AOSS.
- `packages/sdk` — TypeScript models and validators — will follow AOSS schema specs in Section 2.x + Attribute Registry.
- `packages/api` — Backend/API surface (e.g. Firebase Functions) — will follow API Contracts (Section 6) and Security (Section 9).
- `packages/web` — Admin/front-end UI — will follow Admin UI Build Spec and Frontend sections (Section 7, Section 13).
- `scripts/seed.js` — temporary seed entry point that will later call into `@ropi-aoss/cli`.

**Note:** The behavior and data shapes are NOT defined in this repository but in the Ropi AOSS Notion space (Sections 1–14). This repository only implements what the Notion spec describes.
