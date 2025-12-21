# Section 8 — TypeScript Bindings, SDKs & Developer Tooling

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)

# Section 8 — TypeScript Bindings, SDKs & Developer Tooling

**Owner:** John / Theo

**Version:** AOSS v1.0 — TypeScript Bindings v1.0

**Date:** 2025-11-25

---

---

## 8.0 Summary & how to use this section

**Ops Reference:**

SDK client behavior, API client retry logic, and developer tooling errors must follow the observability standards in [**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md).

This includes structured error logging, timeout handling, and debug trace propagation.

Section 8 makes the code-level contracts explicit and reproducible:

- JSON Schemas (Section 2) are the single source of truth.
- We generate TypeScript types (`types.d.ts`) from those schemas and a typed API client from the OpenAPI file (Section 6).
- We provide a small typed SDK wrapper, React Query hooks, client-side validators (AJV) and CI checks to keep generated artifacts in-sync.
- All tool versions are pinned in the generation scripts for deterministic outputs.

Place the artifacts I describe below under `BUILD_ROPI_AOSS_v1/08-*` in the repo. I also include scripts and CI config to regenerate—and to ensure PRs include regenerated outputs.

---

## 8.1 Folder layout (what I will add)

```
/BUILD_ROPI_AOSS_v1/08-types/
  - types.d.ts                 # generated canonical TS types (from JSON Schema)
  - index.ts                   # re-exports + helpers
  - README.md                  # instructions and mapping notes

/BUILD_ROPI_AOSS_v1/08-sdk/
  /openapi-client/             # generated typed OpenAPI client (committed)
  - fetch-wrapper.ts           # typed fetch wrapper (auth + error mapping)
  - README.md

/BUILD_ROPI_AOSS_v1/08-hooks/
  - useProducts.ts
  - useProduct.ts
  - useSuggestions.ts
  - useAiJob.ts
  - README.md

/BUILD_ROPI_AOSS_v1/08-scripts/
  - generate.sh                # single script to generate everything (pinned versions)
  - package.json               # dev deps used by the script
  - codegen-check.yml          # CI job (example) to ensure codegen output is committed

/BUILD_ROPI_AOSS_v1/08-docs/
  - quickstart.md              # quickstart with examples and regenerating instructions
  - dev-setup.md               # local dev instructions for emulator + UI + codegen

```

---

## 8.2 Tools & pinned versions

Use these exact versions in `generate.sh` (the script below uses them as npx calls or installs locally):

- `node` >= `20` (we already use Node 20 in Functions)
- `json-schema-to-typescript` = **10.1.4** (generate TS types from JSON Schema)
- `openapi-typescript-codegen` = **0.20.1** (generate a typed TypeScript client from OpenAPI)
- `ajv` = **8.12.0** (runtime validation)
- `prettier` / `eslint` pinned to your repo versions (optional)

I chose `json-schema-to-typescript` and `openapi-typescript-codegen` for predictable, pure-TS outputs that are easy to commit into repo and consume. The script below pins these versions and uses `npx` to run them.

---

## 8.3 `generate.sh` — single generation script (copy/paste)

Create `BUILD_ROPI_AOSS_v1/08-scripts/generate.sh`. Make executable (`chmod +x`).

```bash
#!/usr/bin/env bash
set -euo pipefail

# pinned tool versions
JST2T_VERSION="10.1.4"
OATC_VERSION="0.20.1"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_DIR="${ROOT_DIR}/../02-schema"
OUT_TYPES="${ROOT_DIR}/../08-types/types.d.ts"
OPENAPI_FILE="${ROOT_DIR}/../06-api/openapi.yaml"
OUT_CLIENT_DIR="${ROOT_DIR}/../08-sdk/openapi-client"

echo "==> Generating TypeScript types from JSON Schema (json-schema-to-typescript ${JST2T_VERSION})"
# Generate a combined schema -> types.d.ts by iterating schemas
# We'll create a temporary schema index that includes references to the main product schema and other schemas.
TMP_COMBINED="${ROOT_DIR}/tmp-combined-schema.json"
cat > "${TMP_COMBINED}" <<EOF
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ROPI Types",
  "type": "object",
  "properties": {
    "Product": { "$ref": "${SCHEMA_DIR}/product.schema.json" },
    "Attribute": { "$ref": "${SCHEMA_DIR}/attribute.schema.json" },
    "Observation": { "$ref": "${SCHEMA_DIR}/observation.schema.json" },
    "SmartRule": { "$ref": "${SCHEMA_DIR}/smartrule.schema.json" },
    "AiJob": { "$ref": "${SCHEMA_DIR}/ai.schema.json" }
  }
}
EOF

# Run json-schema-to-typescript
npx -y json-schema-to-typescript@${JST2T_VERSION} "${TMP_COMBINED}" -o "${OUT_TYPES}" --declareExternallyReferenced --no-top-ref
# Prettify
npx -y prettier --write "${OUT_TYPES}"

echo "==> Generating OpenAPI TypeScript client (openapi-typescript-codegen ${OATC_VERSION})"
rm -rf "${OUT_CLIENT_DIR}"
npx -y openapi-typescript-codegen@${OATC_VERSION} --input "${OPENAPI_FILE}" --output "${OUT_CLIENT_DIR}" --client axios --useOptions --useUnionTypes

echo "==> Adding fetch wrapper and helpers"
# Create a small fetch-wrapper.ts if not exists
FETCH_WRAPPER="${ROOT_DIR}/../08-sdk/fetch-wrapper.ts"
cat > "${FETCH_WRAPPER}" <<'TS'
// fetch-wrapper.ts
import axios, { AxiosInstance } from 'axios';

export function createApiClient(baseURL: string, getIdToken: () => Promise<string>): AxiosInstance {
  const instance = axios.create({ baseURL, timeout: 120000 });
  instance.interceptors.request.use(async (config) => {
    const token = await getIdToken();
    config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
    return config;
  });
  // Response interceptor: normalize errors
  instance.interceptors.response.use(
    res => res,
    err => {
      if (err.response && err.response.data) {
        const e = new Error(err.response.data.message || 'API Error');
        (e as any).code = err.response.data.code;
        (e as any).details = err.response.data.details;
        throw e;
      }
      throw err;
    }
  );
  return instance;
}
TS
npx -y prettier --write "${FETCH_WRAPPER}"

echo "==> Generation completed."

```

**Notes:**

- This script creates a combined schema file to produce a single `types.d.ts`. You can also individually generate per-schema files if preferred.
- It produces a typed OpenAPI client under `08-sdk/openapi-client` using `axios` client generation.

---

## 8.4 `codegen-check.yml` — CI job to ensure generated artifacts are committed

Add this to your CI workflows (example GitHub Actions job). Save as `BUILD_ROPI_AOSS_v1/08-scripts/codegen-check.yml`:

```yaml
name: Codegen Check

on:
  pull_request:
    paths:
      - '02-schema/**'
      - '06-api/**'
      - 'BUILD_ROPI_AOSS_v1/08-scripts/**'
      - '.github/**'

jobs:
  codegen-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        working-directory: BUILD_ROPI_AOSS_v1/08-scripts
        run: npm ci
      - name: Run generation script
        working-directory: BUILD_ROPI_AOSS_v1/08-scripts
        run: ./generate.sh
      - name: Check for diff
        run: |
          if [[ -n "$(git status --porcelain)" ]]; then
            echo "Generated code differs from repository. Please run generate.sh and commit generated files.";
            git --no-pager status --porcelain
            exit 1
          else
            echo "Generated artifacts are in sync."
          fi

```

**How it works:** reviewers will get a failing job if the PR changes schemas or OpenAPI but doesn't include regenerated types/clients.

---

## 8.5 `types.d.ts` — example header & usage

The script generates `types.d.ts` for every schema. Below is an **illustrative excerpt** of the generated `Product` type (you will get full file from the generator):

```tsx
/* AUTO-GENERATED — do not edit manually. Generated from 02-schema/product.schema.json */
export type SiteSlug = 'shiekh'|'karmaloop'|'mltd'|'sangremia';

export interface SiteDescription {
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: (string)[] | null;
}

export interface Product {
  sku_core: {
    mpn: string;
    sku?: string | null;
    brand?: string | null;
    name?: string | null;
    department?: string | null;
    class?: string | null;
    category?: string | null;
    styleId?: string | null;
    productIsActive?: boolean;
  };
  descriptive?: {
    ageGroup?: string | null;
    gender?: string | null;
    fit?: string | null;
    material?: string[];
    primaryColor?: string | null;
    descriptiveColor?: string | null;
    pattern?: string | null;
    familySizing?: boolean;
    siteDescriptions?: Partial<Record<SiteSlug, SiteDescription>>;
  };
  pricing?: { retail_price?: number };
  technical?: { launchDate?: string | null; hype?: boolean; fastFashion?: boolean; mediaStatus?: string | null; status?: 'intake'|'in_progress'|'validated'|'archived' };
  ai?: { description_generated?: boolean; scores?: Partial<Record<SiteSlug, { overall:number; factual:number; tone:number; seo:number; clarity:number }>>; insights?: string[] };
  source?: { rics?: Record<string, any> };
  observations?: { notes?: string; images?: string[]; ai_insights?: string[] };
  statusFlags: {
    completion_status: 'not_started'|'in_progress'|'complete';
    validation_status: 'not_validated'|'has_errors'|'has_warnings'|'valid';
    imported?: boolean;
    edited?: boolean;
    ready_for_export?: boolean;
    exported?: boolean;
  };
  timestamps: { imported_at?: string; first_edited_at?: string; last_edited_at?: string; ready_for_export_at?: string; exported_at?: string; };
}

```

**index.ts helpers (example):**

```tsx
export * from './types';
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };

export function isReadyForExport(p: Product): boolean {
  return !!(p && p.statusFlags && p.statusFlags.completion_status === 'complete' && p.statusFlags.validation_status === 'valid' && p.statusFlags.ready_for_export);
}

```

---

## 8.6 `fetch-wrapper.ts` (detailed)

Place under `BUILD_ROPI_AOSS_v1/08-sdk/fetch-wrapper.ts`. This file was generated by `generate.sh` but here's the full content for copy/paste and improvement.

```tsx
import axios, { AxiosInstance } from 'axios';

export interface CreateApiClientOptions {
  baseUrl: string;
  getIdToken: () => Promise<string>;
  timeoutMs?: number;
}

export function createApiClient(opts: CreateApiClientOptions): AxiosInstance {
  const instance = axios.create({ baseURL: opts.baseUrl, timeout: opts.timeoutMs || 120000 });

  instance.interceptors.request.use(async (cfg) => {
    const token = await opts.getIdToken();
    cfg.headers = {
      ...(cfg.headers || {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    return cfg;
  });

  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err.response && err.response.data) {
        const e = new Error(err.response.data.message || 'API Error');
        (e as any).code = err.response.data.code;
        (e as any).details = err.response.data.details;
        throw e;
      }
      throw err;
    }
  );

  return instance;
}

```

- **Best practice:** Use this `createApiClient` to instantiate the generated OpenAPI client with a `fetch` adapter or pass axios instance to client generator if supported.

---

## 8.7 React Query hooks (examples)

Create `BUILD_ROPI_AOSS_v1/08-hooks/useProducts.ts`:

```tsx
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../08-sdk/openapi-client'; // path depends on generator
import { ProductShallow } from '../08-types/types';

const client = new ApiClient({ baseUrl: process.env.API_BASE || '' });

export function useProducts(params: { q?: string; filters?: any; pageSize?: number; pageToken?: string }, options?: any) {
  const key = ['products', params];
  return useQuery(key, async () => {
    const res = await client.productsApi.getProducts({
      q: params.q,
      filters: params.filters ? JSON.stringify(params.filters) : undefined,
      pageSize: params.pageSize,
      pageToken: params.pageToken
    });
    return res;
  }, {
    staleTime: 30000,
    keepPreviousData: true,
    ...options
  });
}

```

**`useProduct.ts`**

```tsx
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '../08-sdk/openapi-client';
const client = new ApiClient({ baseUrl: process.env.API_BASE || '' });

export function useProduct(productId: string, options = {}) {
  return useQuery(['product', productId], async () => {
    const res = await client.productsApi.getProduct(productId);
    return res;
  }, {
    staleTime: 5000,
    ...options
  });
}

```

**Notes:**

- Wrap generated client in a context to inject `Authorization` header via `fetch-wrapper` or axios instance.
- These hooks assume the generated client exposes `productsApi.getProducts` and `productsApi.getProduct` — adjust per generator output.

---

## 8.8 Client-side validation (AJV) example

**Install AJV** in the frontend dev deps (already pinned): `ajv@8.12.0`.

Create `BUILD_ROPI_AOSS_v1/08-types/validators.ts`:

```tsx
import Ajv from 'ajv';
import productSchema from '../../02-schema/product.schema.json';
const ajv = new Ajv({ allErrors: true, strict: false });

export const validateProduct = ajv.compile(productSchema);

export function validateProductForSave(product: any) {
  const valid = validateProduct(product);
  return { valid, errors: validateProduct.errors || [] };
}

```

Use `validateProductForSave` in the Product Editor before submitting to server — provides instant feedback to user.

---

## 8.9 Local developer workflow & emulator integration

**Local env checklist:**

1. Run Firebase emulator for Auth, Firestore, Functions, Storage.
    - `firebase emulators:start --only auth,firestore,functions,storage`
2. Start frontend dev server (`npm run dev`) — configure `.env` with `REACT_APP_API_BASE=http://localhost:5001/api/v1`.
3. Seed dev data: `npm run seed:dev` (script uses `firebase-admin` to write `settings/*`, sample products)
4. Generate types & client: `BUILD_ROPI_AOSS_v1/08-scripts/generate.sh` (this writes `08-types` and `08-sdk/openapi-client`)
5. Run the UI; it will call local emulator endpoints.

**Notes**

- For token generation in local dev, use emulator auth accounts and fetch an idToken with the Firebase client SDK to use in `createApiClient`.

---

## 8.10 CI & codegen check (recap)

- Include `codegen-check.yml` in your GitHub Actions workflows.
- Add `npm run generate` as an explicit manual step for maintainers; when schema or openapi changes, re-run and commit outputs.

`package.json` (in `08-scripts`) should include:

```json
{
  "name": "ropi-codegen",
  "version": "1.0.0",
  "scripts": {
    "generate": "./generate.sh"
  },
  "devDependencies": {
    "json-schema-to-typescript": "10.1.4",
    "openapi-typescript-codegen": "0.20.1",
    "prettier": "2.8.8"
  }
}

```

---

## 8.11 Regeneration policy & governance

- **Authoring schemas**: modify JSON schemas only in `02-schema/`. Any change must be accompanied by typegen & OpenAPI adjustments.
- **Regeneration**: run `generate.sh` locally; ensure generated artifacts are committed.
- **CI gate**: `codegen-check` ensures no drift. Failing job is a clear signal that either schemas changed or generated artifacts are stale.
- **Version pin**: Lock `json-schema-to-typescript` and `openapi-typescript-codegen` versions; update cautiously with regression tests.

---

## 8.12 Acceptance checklist for Section 8

- `BUILD_ROPI_AOSS_v1/08-types/types.d.ts` compiles with `tsc --noEmit`.
- `BUILD_ROPI_AOSS_v1/08-sdk/openapi-client` contains generated client that compiles and is usable (example call).
- `generate.sh` reproduces the committed types & client on a clean checkout (CI verifies this).
- `codegen-check.yml` exists and triggers failures for drift.
- `08-hooks` contains working examples for `useProducts` and `useProduct`.
- Local dev recipe produces working example UI connecting to emulator.

---

## 8.13 Deliverables & next steps I will produce now

If you want, I will:

1. Create the files described above and paste them here, so you can copy them into your repo.
2. Or, open a PR (if you give me permission) that adds the `BUILD_ROPI_AOSS_v1/08-*` folders with the scripts and example files (I can prepare the patch).

Which do you prefer? If you want the files pasted here, say **“Paste Section 8 files”** and I will provide the content for each file (generate.sh, fetch-wrapper, useProducts, etc.). If you want a PR, say **“Prepare PR”** and I’ll prepare the content ready for commit.

---

---

### Navigation

← Previous: [Section 7 — Frontend & Launch Calendar](Section%207%20%E2%80%94%20Frontend%20&%20Launch%20Calendar%202b845ee1ec5a811d8d47ef14b3d0f46c.md)

→ Next: [**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

Which do you prefer? If you want the files pasted here, say **"Paste Section 8 files"** and I will provide the content for each file ([generate.sh](http://generate.sh), fetch-wrapper, useProducts, etc.). If you want a PR, say **"Prepare PR"** and I'll prepare the content ready for commit.

[← Back to ROPI AOSS (Main Page)](Ropi%20AOSS%202b645ee1ec5a80e5b64fd04cea9e0d52.md)