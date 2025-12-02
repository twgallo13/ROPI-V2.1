# ROPI AOSS — Clean AOSS scaffold
This repository is the canonical implementation for Ropi AOSS.
Single source of truth lives in Notion: Section 1..14 (ROPI AOSS).

## Repo layout (AOSS v0.1.0 scaffold)

- `packages/cli` — CLI tools (e.g. Notion import/export) — implementation will follow Import Engine specs in Section 3.x of AOSS.
- `packages/sdk` — TypeScript models and validators — will follow AOSS schema specs in Section 2.x + Attribute Registry.
- `packages/api` — Backend/API surface (e.g. Firebase Functions) — will follow API Contracts (Section 6) and Security (Section 9).
- `packages/web` — Admin/front-end UI — will follow Admin UI Build Spec and Frontend sections (Section 7, Section 13).
- `scripts/seed.js` — temporary seed entry point that will later call into `@ropi-aoss/cli`.

### CLI (`packages/cli`)
Notion API importer for AOSS. Imports raw data from Notion databases as specified in Section 3.1.

**Usage:**
```bash
# Build the CLI
pnpm --filter @ropi-aoss/cli build

# Run the importer
NOTION_TOKEN=your_token NOTION_PAGE_IDS=page1,page2 pnpm --filter @ropi-aoss/cli start

# Or use the root seed script
NOTION_TOKEN=your_token NOTION_PAGE_IDS=page1,page2 pnpm seed
```
Raw exports are saved to `data/notion_export/` with timestamps.

### SDK (`packages/sdk`)
TypeScript types and zod validators for AOSS product schemas (Section 2.x + Attribute Registry).

**Usage:**
```bash
# Build
pnpm --filter @ropi-aoss/sdk build

# Run tests
pnpm --filter @ropi-aoss/sdk test

# Watch mode
pnpm --filter @ropi-aoss/sdk test:watch
```

Import in TypeScript:
```typescript
import { ProductSchema, validateProduct } from '@ropi-aoss/sdk';

const result = validateProduct(productData);
```

**Note:** The behavior and data shapes are NOT defined in this repository but in the Ropi AOSS Notion space (Sections 1–14). This repository only implements what the Notion spec describes.

## Staging Environment

**Stable Staging URL**: https://ropi-aoss-staging.web.app

This site is automatically updated from the `aoss-main` branch. Every push to `aoss-main` triggers a deployment to the stable staging site.

### Deployment Behavior
- **Stable staging site**: Updated on every `aoss-main` push via the `deploy-staging` workflow
- **Preview channels**: Each PR creates a separate preview channel (e.g., `pr-123`) for isolated testing
- **Environment**: Deployments use the `staging` environment and require `FIREBASE_TOKEN` secret

### Manual Deployment
You can manually trigger the staging deployment:
```bash
# Via GitHub Actions UI (workflow_dispatch)
# Or via CLI:
gh workflow run deploy-staging.yml --repo twgallo13/ROPI-V2.1
```
