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

## Attribute Registry — canonical source of truth

**Location (canonical):** [`packages/sdk/config/attributeRegistry.json`](packages/sdk/config/attributeRegistry.json)

**Firestore target:** `settings/attributes/keys/{attributeId}`

**Purpose:** All imports, validations, UI forms, and export contracts validate attribute keys & types against this registry.

The attribute registry defines 800+ product attributes with their:
- `attribute_id` — Unique identifier (e.g., "sku", "brand", "color")
- `label` — Human-readable name
- `data_type` — Type (text, number, enum, currency, multiSelect, date, boolean, json)
- `required_for_completion` — Must be filled to mark product complete
- `required_for_export` — Must be present to export
- `import_required` — Must be in import CSV
- `allowed_values` — For enum types
- `category` — Attribute grouping (sku_core, identifiers, pricing, etc.)

**Sync requirement:** The deployment/sync job (run by the service account) must ensure the registry JSON is synced into Firestore on deploy. The sync script is located at `packages/api/src/tasks/syncAttributeRegistry.ts`.

**Version:** See [`packages/sdk/config/attributeRegistry.json`](packages/sdk/config/attributeRegistry.json) for current version.

For detailed documentation, see [docs/ATTRIBUTE-REGISTRY.md](docs/ATTRIBUTE-REGISTRY.md).

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

## Google Service Account (CI / CD / Admin)

**Canonical statement:** the project uses a Google Service Account for CI/CD and system administration.
The service account **must** have full programmatic access to Firebase, Cloud Functions, Firestore, Cloud Storage, and related GCP services used by the project.

**Recommended name:** `ropi-deploy-sa@<GCP_PROJECT>.iam.gserviceaccount.com`

**Purpose:**
- Run CI/CD deploys (Cloud Functions, Hosting)
- Sync attribute registry to Firestore
- Read/write Firestore and Cloud Storage during imports and API operations
- Manage infrastructure (deploys, runtime IAM usage by functions)

**How to create & provision:**
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed commands (example below). After creation, store the service account JSON key as a GitHub secret named `GCP_SA_KEY_BASE64` (base64 of the key file). The GitHub Actions workflows expect `GCP_SA_KEY_BASE64`.

**Security note:** granting project-wide Owner is simple but broad. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for a least-privilege role set recommended for production.

## Developer Documentation

| Document | Description |
|----------|-------------|
| [CONTRIBUTING.md](CONTRIBUTING.md) | Onboarding guide & contribution guidelines |
| [docs/DEV-SETUP.md](docs/DEV-SETUP.md) | Detailed developer runbook & troubleshooting |
| [docs/ENV.md](docs/ENV.md) | Environment variables & secrets setup |
| [docs/WORKFLOW.md](docs/WORKFLOW.md) | Branch naming, PR rules & workflow policy |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment procedures |

**New to the project?** Start with [CONTRIBUTING.md](CONTRIBUTING.md) for a step-by-step guide.

