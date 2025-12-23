# Section 10 — CI / CD, Testing, Release & Stability

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

# Section 10 — CI/CD, Testing, Release & Stability

This section provides copy-paste ready CI/CD configurations for ROPI.

---

## 10.1 Environment & Runtime

**Ops Reference:**

CI/CD pipeline health, deployment success rates, and release stability metrics must integrate with [**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md).

This includes build time SLOs, deployment rollback procedures, and release health monitoring.

### 10.1.1 Required Versions

| Tool | Version | File |
| --- | --- | --- |
| Node.js | 20.x | `.nvmrc` |
| npm | 10.x | lockfile |
| Firebase CLI | 13.x | CI install |

### 10.1.2 .nvmrc

```
20
```

### 10.1.3 engines (package.json)

```json
{
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

---

## 10.2 GitHub Actions — CI Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [main, staging]
  push:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies (root)
        run: npm ci

      - name: Install dependencies (functions)
        run: npm ci
        working-directory: functions

      - name: Lint
        run: npm run lint

      - name: Type check (root)
        run: npx tsc --noEmit

      - name: Type check (functions)
        run: npx tsc --noEmit
        working-directory: functions

      - name: Unit tests
        run: npm test

      - name: Unit tests (functions)
        run: npm test
        working-directory: functions

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Security audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Security audit (functions)
        run: npm audit --audit-level=moderate
        working-directory: functions
        continue-on-error: true
```

---

## 10.3 GitHub Actions — Deploy Staging

**File:** `.github/workflows/deploy-staging.yml`

```yaml
name: Deploy to Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          npm ci --prefix functions

      - name: Build
        run: npm run build

      - name: Build functions
        run: npm run build
        working-directory: functions

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy to Firebase (staging)
        run: firebase deploy --only functions,hosting --project ropi-bccee
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

      - name: Notify success
        if: success()
        run: echo "✅ Staging deploy complete"

      - name: Notify failure
        if: failure()
        run: echo "❌ Staging deploy failed"
```

---

## 10.4 GitHub Actions — Deploy Production

**File:** `.github/workflows/deploy-prod.yml`

```yaml
name: Deploy to Production

on:
  workflow_dispatch:
    inputs:
      confirm:
        description: 'Type DEPLOY to confirm production deployment'
        required: true

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    environment: production
    if: github.event.inputs.confirm == 'DEPLOY'
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          npm ci
          npm ci --prefix functions

      - name: Build
        run: npm run build

      - name: Build functions
        run: npm run build
        working-directory: functions

      - name: Install Firebase CLI
        run: npm install -g firebase-tools

      - name: Deploy to Firebase (production)
        run: firebase deploy --only functions,hosting --project ropi-bccee
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}

      - name: Tag release
        run: |
          git tag -a "release-$(date +%Y%m%d-%H%M%S)" -m "Production release"
          git push origin --tags
```

---

## 10.5 Dependabot Configuration

**File:** `.github/dependabot.yml`

```yaml
version: 2
updates:
  # Root package.json
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"

  # Functions package.json
  - package-ecosystem: "npm"
    directory: "/functions"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      firebase:
        patterns:
          - "firebase-*"
          - "@firebase/*"

  # GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

---

## 10.6 Required GitHub Secrets

| Secret | Description | Where to get |
| --- | --- | --- |
| `FIREBASE_TOKEN` | Firebase CI token | Run `firebase login:ci` locally |
| `GEMINI_API_KEY` | Google AI API key | Google AI Studio |
| `SEED_TOKEN` | Seed endpoint auth | Generate UUID, store in Functions config |

### Setting up FIREBASE_TOKEN

```bash
# Run locally (one-time)
firebase login:ci

# Copy the token output
# Add to GitHub: Settings → Secrets → Actions → New secret
```

---

## 10.7 Local Development Commands

### package.json scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "emulator": "firebase emulators:start",
    "deploy:staging": "firebase deploy --project ropi-bccee",
    "typecheck": "tsc --noEmit"
  }
}
```

### functions/package.json scripts

```json
{
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "lint": "eslint src --ext .ts",
    "test": "vitest run",
    "serve": "npm run build && firebase emulators:start --only functions",
    "shell": "npm run build && firebase functions:shell",
    "deploy": "firebase deploy --only functions"
  }
}
```

---

## 10.8 Testing Strategy

### 10.8.1 Test Types

| Type | Tool | Location | Runs On |
| --- | --- | --- | --- |
| Unit (frontend) | Vitest | `src/**/*.test.ts` | Every PR |
| Unit (functions) | Vitest | `functions/src/**/*.test.ts` | Every PR |
| Integration | Vitest + Emulator | `tests/integration/` | Every PR |
| E2E | Playwright | `tests/e2e/` | Nightly / Pre-release |

### 10.8.2 Sample Unit Test (SmartRule)

**Workflow References:**

- [Workflow W1 — Observations Capture & Apply to Product](Workflow%20W1%20%E2%80%94%20Observations%20Capture%20&%20Apply%20to%20Prod%202b845ee1ec5a81b5a4a6d3ea439ec277.md)
- [🧩 **Workflow W2 — Full Product Completion (One-Person Process)**](%F0%9F%A7%A9%20Workflow%20W2%20%E2%80%94%20Full%20Product%20Completion%20(One-Perso%202ba45ee1ec5a809cbc1fd8daebc3f147.md)

### 10.8.2 Sample Unit Test (SmartRule)

```tsx
// functions/src/smartEngine.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateCondition } from './smartEngine';

describe('SmartRule Engine', () => {
  it('should match token condition', () => {
    const condition = {
      source: 'source.rics.category_tokens',
      matchType: 'token',
      value: ['Basketball']
    };
    
    const product = {
      source: {
        rics: {
          category_tokens: ['mens', 'footwear', 'basketball']
        }
      }
    };
    
    const result = evaluateCondition(condition, product);
    expect(result.matches).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

### 10.8.3 Sample Integration Test (Describe API)

This integration test exercises the Describe API end-to-end against the local Firebase emulator or a staging environment. It is intended as a **template**, not a strict contract; the exact request/response shape is defined in:

- **Section 5 — AI Describe Engine** (describe behavior, inputs, and outputs)
- **Section 6 — API Contracts & Integration (AOSS v1.0)** (Describe endpoint schema)

The example below assumes:

- You are running the Firebase emulator suite locally (see Section 10.7.1).
- The Describe HTTPS function is exposed as `apiDescribe`.
- The emulator URL is [`http://127.0.0.1:<PORT>/<PROJECT_ID>/us-central1/apiDescribe`](http://127.0.0.1:<PORT>/<PROJECT_ID>/us-central1/apiDescribe).

Update `PROJECT_ID` and the request body to match the actual contract in Section 6.

```tsx
// tests/integration/describe.test.ts
import { describe, it, expect, beforeAll } from 'vitest';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ropi-bccee';
const EMULATOR_HOST = process.env.FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1';
const EMULATOR_PORT = process.env.FUNCTIONS_EMULATOR_PORT ?? '5001';

/**
 * Helper to build the Describe API URL for the local emulator.
 * Adjust if you are testing against staging or production.
 */
function getDescribeUrl() {
  // Firebase Functions emulator URL pattern:
  // [http://HOST:PORT/<PROJECT_ID>/us-central1/<functionName>](http://HOST:PORT/<PROJECT_ID>/us-central1/<functionName>)
  return `[http://${EMULATOR_HOST}:${EMULATOR_PORT}/${PROJECT_ID}/us-central1/apiDescribe`](http://${EMULATOR_HOST}:${EMULATOR_PORT}/${PROJECT_ID}/us-central1/apiDescribe`);
}

describe('Describe API (integration)', () => {
  let describeUrl: string;

  beforeAll(async () => {
    // In a real test, you might also:
    // - seed Firestore with a test product
    // - configure any required settings documents
    // For now, we only resolve the URL.
    describeUrl = getDescribeUrl();
  });

  it('should generate a description for a valid product payload', async () => {
    // NOTE:
    // The exact request shape is defined in Section 6 (Describe API contract).
    // This example uses a minimal placeholder with a productId and site,
    // which you should align with the actual schema.
    const requestBody = {
      // TODO: Replace with the real fields from Section 6, e.g.:
      // productId: 'test-product-123',
      // site: 'shiekh',
      // options: { regenerate: false }
    };

    const response = await fetch(describeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    expect(response.ok).toBe(true);

    const json = await response.json();

    // These assertions should be updated to match the real Describe response
    // contract from Section 5 / Section 6. For example:
    //
    // - json.descriptionShiekh (or site-specific description)
    // - json.metaName / json.metaDescription
    // - json.keywords
    //
    // For now, assert only that the response contains some top-level object.
    expect(typeof json).toBe('object');
  });

  it('should return an error for incomplete or invalid payloads', async () => {
    // Intentionally send an invalid body (e.g., missing required fields).
    const invalidBody = {
      // e.g. missing productId / site / required attributes
    };

    const response = await fetch(describeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidBody),
    });

    // Depending on the Describe API design, this may be 400 or 422.
    // See Section 6 for the exact error model.
    expect(response.status === 400 || response.status === 422).toBe(true);

    const json = await response.json();

    // Expect a structured error (per Section 5 / Section 6),
    // e.g. { errorCode, message, missingFields: [...] }
    expect(typeof json).toBe('object');
  });
});
```

**Important:**

- This example is deliberately conservative: it avoids guessing the exact fields and instead points back to Section 5 and Section 6 as the single source of truth.
- When the Describe API contract is finalized, update:
    - `requestBody`
    - Response assertions
    
    so that they enforce the real schema (description + SEO + any template metadata).
    

---

```

```

---

## 10.9 Rollback Procedure

### 10.9.1 Rollback Cloud Functions

```bash
# List recent deployments
firebase functions:log --only api

# Rollback to previous version via Console:
# 1. Go to Firebase Console → Functions
# 2. Click function → Version history
# 3. Select previous version → "Rollback to this version"

# Or redeploy from previous commit:
git checkout <previous-commit>
npm run build --prefix functions
firebase deploy --only functions
```

### 10.9.2 Rollback Hosting

```bash
# List releases
firebase hosting:channel:list

# Rollback via Console:
# Firebase Console → Hosting → Release history → "Rollback"
```

### 10.9.3 Emergency Rollback Checklist

1. ☐ Identify the issue (check logs: `firebase functions:log`)
2. ☐ Notify team in Slack/Teams
3. ☐ Rollback functions OR hosting (whichever is affected)
4. ☐ Verify rollback successful (test key endpoints)
5. ☐ Create incident ticket
6. ☐ Schedule postmortem within 48 hours

---

## 10.10 Release Checklist

### Pre-Release

- [ ]  All CI checks passing on `main`
- [ ]  No critical security vulnerabilities (`npm audit`)
- [ ]  Staging tested and approved
- [ ]  Database migrations run (if any)
- [ ]  Changelog updated

### Release

- [ ]  Trigger `deploy-prod.yml` workflow
- [ ]  Monitor deployment logs
- [ ]  Verify key endpoints working
- [ ]  Check error rates in Firebase Console

### Post-Release

- [ ]  Tag release in git
- [ ]  Update release notes
- [ ]  Notify stakeholders
- [ ]  Monitor for 24 hours

---

## 10.11 Branch Protection Rules

### main branch

| Setting | Value |
| --- | --- |
| Require PR before merging | ✅ |
| Require status checks | `lint-and-test`, `security` |
| Require branches up to date | ✅ |
| Require approvals | 1 |
| Dismiss stale approvals | ✅ |
| Restrict who can push | Admins only |

---

## 10.12 Commit Message Convention

```
<type>(<scope>): <subject>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation
- style: Formatting
- refactor: Code restructure
- test: Adding tests
- chore: Maintenance

Scopes:
- schema: Section 2 changes
- rules: Smart Rules (Section 4)
- ai: AI Describe (Section 5)
- api: API changes (Section 6)
- ui: Frontend (Section 7)
- firebase: Infrastructure (Section 9)
- ci: CI/CD (Section 10)

Examples:
- feat(schema): add customMessage field to Product
- fix(ai): handle timeout in describe worker
- docs(rules): update SmartRule examples
```

---

## 10.13 Monitoring & Alerts (Basic)

### Firebase Console Checks

| Check | Location | Frequency |
| --- | --- | --- |
| Function errors | Functions → Logs | Daily |
| Function latency | Functions → Health | Weekly |
| Hosting traffic | Hosting → Usage | Weekly |
| Firestore usage | Firestore → Usage | Weekly |

### Recommended Alerts (Google Cloud)

```yaml
# Set up in Google Cloud Monitoring
alerts:
  - name: "High Function Error Rate"
    condition: error_rate > 1%
    window: 5 minutes
    notification: email

  - name: "Function Timeout"
    condition: execution_time > 60s
    notification: email

  - name: "Daily AI Token Budget"
    condition: ai_tokens_used > daily_budget * 0.8
    notification: email
```

---

## 10.14 File Structure

```
.github/
├── workflows/
│   ├── ci.yml
│   ├── deploy-staging.yml
│   └── deploy-prod.yml
├── dependabot.yml
└── CODEOWNERS

tests/
├── unit/
├── integration/
└── e2e/
```

### CODEOWNERS

```
# Default owners
* @theo-shiekh

# Functions require backend review
/functions/ @theo-shiekh

# Schema changes require careful review
/02-schema/ @theo-shiekh
```

---

---

### Navigation

← Previous: [**Section 9 — Firebase Implementation & Security**](Section%209%20%E2%80%94%20Firebase%20Implementation%20&%20Security%202b845ee1ec5a80ea8f5ecd0c08d31847.md)

→ Next: [**Section 11 — Observability, Monitoring & Runbooks (Ops)**](Section%2011%20%E2%80%94%20Observability,%20Monitoring%20&%20Runbooks%20%202b845ee1ec5a80d482edcd9af5565e45.md)

[← Back to ROPI AOSS Hub]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})