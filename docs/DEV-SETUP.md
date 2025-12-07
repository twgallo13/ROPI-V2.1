# Developer Setup Runbook

This is a step-by-step guide for setting up your local development environment for ROPI AOSS. Follow each step exactly as written.

---

## Table of Contents

1. [Fresh Clone Verification](#fresh-clone-verification)
2. [Running the Frontend](#running-the-frontend)
3. [Running the Emulator](#running-the-emulator)
4. [Running Tests](#running-tests)
5. [CLI Import Preview](#cli-import-preview)
6. [Useful Scripts](#useful-scripts)
7. [Troubleshooting](#troubleshooting)
8. [GitHub Actions Validation](#github-actions-validation)

---

## Fresh Clone Verification

Follow these steps on a clean machine to verify the project works.

### Step 1: Verify Prerequisites

```bash
# Check Node.js version (must be 20.x)
node --version
# Expected: v20.x.x

# Check pnpm version (must be 8.x)
pnpm --version
# Expected: 8.x.x

# Check Git
git --version
# Expected: git version 2.x.x
```

If Node.js is missing or wrong version:
```bash
nvm install 20
nvm use 20
```

If pnpm is missing:
```bash
npm install -g pnpm@8
```

### Step 2: Clone the Repository

```bash
git clone git@github.com:twgallo13/ROPI-V2.1.git
cd ROPI-V2.1
```

**How to verify:** You should see the project files when you run `ls`.

### Step 3: Bootstrap Dependencies

```bash
pnpm bootstrap
```

**How to verify:**
- No errors in the output
- `node_modules` folder exists in root and each package

```bash
# Verify node_modules exist
ls node_modules
ls packages/web/node_modules
ls packages/sdk/node_modules
```

### Step 4: Build All Packages

```bash
pnpm build
```

**How to verify:**
- Command completes without errors
- Build artifacts exist:

```bash
# Check SDK build
ls packages/sdk/dist/
# Expected: index.js, index.mjs, index.d.ts

# Check web build
ls packages/web/dist/
# Expected: index.html, assets/

# Check API build
ls packages/api/dist/
# Expected: index.js
```

### Step 5: Run Tests

```bash
pnpm test
```

**How to verify:** Tests pass or show "No tests yet" (acceptable for packages without tests).

---

## Running the Frontend

### Start the Dev Server

```bash
pnpm --filter @ropi-aoss/web dev
```

**How to verify:**
1. Open http://localhost:5173 in your browser
2. You should see the ROPI AOSS application
3. No console errors in the browser DevTools

### Build for Production

```bash
pnpm --filter @ropi-aoss/web build
```

**How to verify:**
```bash
ls packages/web/dist/index.html
# File should exist
```

### Preview Production Build

```bash
pnpm --filter @ropi-aoss/web preview
```

Opens the production build at http://localhost:4173

---

## Running the Emulator

The Firebase emulator provides local versions of Firestore, Functions, and Storage.

### Start the Emulator

```bash
pnpm --filter @ropi-aoss/api serve
```

**How to verify:**

| Service | URL | What to Check |
|---------|-----|---------------|
| Emulator UI | http://localhost:4000 | Dashboard loads |
| Firestore | http://localhost:8080 | Listed in UI |
| Functions | http://localhost:5001 | Listed in UI |
| Storage | http://localhost:9199 | Listed in UI |

### Emulator Ports

| Service | Port |
|---------|------|
| Emulator UI | 4000 |
| Functions | 5001 |
| Firestore | 8080 |
| Storage | 9199 |

### Seed Demo Data (Optional)

```bash
# Requires environment variables (see docs/ENV.md)
pnpm seed
```

> **Note:** The seed script is a placeholder. Full seeding will be implemented with the CLI.

---

## Running Tests

### All Tests

```bash
pnpm test
```

### SDK Tests

```bash
# Run once
pnpm --filter @ropi-aoss/sdk test

# Watch mode (re-runs on file changes)
pnpm --filter @ropi-aoss/sdk test:watch
```

**How to verify:** All tests pass (green checkmarks).

### API Tests

```bash
# Run once
pnpm --filter @ropi-aoss/api test

# Watch mode
pnpm --filter @ropi-aoss/api test:watch
```

### Web Tests (Unit)

```bash
pnpm --filter @ropi-aoss/web test
```

### E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests (headless)
pnpm --filter @ropi-aoss/web test:e2e

# Run with visible browser
pnpm --filter @ropi-aoss/web test:e2e:headed

# Run with Playwright UI
pnpm --filter @ropi-aoss/web test:e2e:ui

# Debug mode
pnpm --filter @ropi-aoss/web test:e2e:debug
```

**How to verify:** Tests complete with passing results.

---

## CLI Import Preview

The CLI tool handles data import/export from Notion.

### Build the CLI

```bash
pnpm --filter @ropi-aoss/cli build
```

### Run the CLI

```bash
pnpm --filter @ropi-aoss/cli start
```

### With Notion Import (requires environment variables)

```bash
# Set up environment
export NOTION_TOKEN="your_notion_token"
export NOTION_PAGE_IDS="page_id_1,page_id_2"

# Run import
pnpm --filter @ropi-aoss/cli start
```

> **Note:** Sample data and CSV import preview will be added in a future PR. The current CLI imports from Notion databases.

---

## Useful Scripts

### Root `package.json` Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `bootstrap` | `pnpm bootstrap` | Install all dependencies |
| `build` | `pnpm build` | Build all packages |
| `test` | `pnpm test` | Run all tests |
| `lint` | `pnpm lint` | Lint all packages |
| `seed` | `pnpm seed` | Run seed script |

### Package-Specific Scripts

#### `@ropi-aoss/web`

| Script | Description |
|--------|-------------|
| `dev` | Start Vite dev server |
| `build` | Production build |
| `preview` | Preview production build |
| `test` | Run Vitest unit tests |
| `test:e2e` | Run Playwright E2E tests |
| `lint` | Lint TypeScript/React code |

#### `@ropi-aoss/sdk`

| Script | Description |
|--------|-------------|
| `build` | Build with tsup |
| `test` | Run Vitest tests |
| `test:watch` | Run tests in watch mode |
| `clean` | Remove dist folder |

#### `@ropi-aoss/api`

| Script | Description |
|--------|-------------|
| `build` | Compile TypeScript |
| `test` | Run Vitest tests |
| `serve` | Start Firebase emulator |
| `deploy` | Deploy to Firebase |
| `clean` | Remove dist folder |

#### `@ropi-aoss/cli`

| Script | Description |
|--------|-------------|
| `build` | Compile TypeScript |
| `start` | Build and run CLI |

---

## Troubleshooting

### Common Error: Node Version Mismatch

**Symptom:**
```
error @ropi-aoss/api@0.0.0: The engine "node" is incompatible with this module.
```

**Fix:**
```bash
nvm install 20
nvm use 20
node --version  # Verify: v20.x.x
```

### Common Error: pnpm Not Found

**Symptom:**
```
bash: pnpm: command not found
```

**Fix:**
```bash
npm install -g pnpm@8
pnpm --version  # Verify: 8.x.x
```

### Common Error: Missing Environment Variables

**Symptom:**
```
Warning: Missing environment variables: GOOGLE_APPLICATION_CREDENTIALS
```

**Fix:**
1. Download your service account key JSON
2. Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

See [docs/ENV.md](ENV.md) for full setup.

### Common Error: Port Already in Use

**Symptom:**
```
Error: listen EADDRINUSE: address already in use :::5173
```

**Fix:**
```bash
# Find the process using the port
lsof -i :5173

# Kill it
kill -9 <PID>

# Or use a different port
pnpm --filter @ropi-aoss/web dev -- --port 3000
```

### Common Error: Build Fails - SDK Not Built

**Symptom:**
```
Cannot find module '@ropi-aoss/sdk'
```

**Fix:**
```bash
# Build SDK first, then other packages
pnpm --filter @ropi-aoss/sdk build
pnpm build
```

### Common Error: Firebase Emulator Crashes

**Symptom:**
```
Error: Could not start Firestore Emulator
```

**Fix:**
```bash
# Check if Java is installed (required for Firestore emulator)
java --version

# If missing, install Java
# macOS:
brew install openjdk@11

# Ubuntu:
sudo apt install openjdk-11-jre-headless
```

### Common Error: Playwright Browsers Not Installed

**Symptom:**
```
browserType.launch: Executable doesn't exist
```

**Fix:**
```bash
npx playwright install
```

---

## GitHub Actions Validation

### Understanding CI Checks

When you open a PR, these checks run automatically:

| Workflow | What it Checks |
|----------|---------------|
| `validate-pr.yml` | Branch name, labels, target branch |
| `deploy-precheck.yml` | Basic build verification |
| `deploy-preview.yml` | Builds and deploys preview |

### Interpreting Validation Errors

1. Go to the **Actions** tab in GitHub
2. Click on the failing workflow run
3. Expand the failing step
4. Read the error message

Common validation failures:

| Error | Fix |
|-------|-----|
| "Branch name must start with 'feature/'" | Rename your branch |
| "Missing required labels" | Add type, area, and priority labels |
| "PRs must target 'aoss-main'" | Change target branch |

### Running Validation Locally

You can simulate some validation locally:

```bash
# Check branch name
git branch --show-current
# Should match: feature/<slug>

# Verify build works
pnpm build

# Run tests
pnpm test
```

---

## Quick Start Checklist

### First Time Setup

- [ ] Install Node.js 20.x (`nvm install 20`)
- [ ] Install pnpm 8.x (`npm install -g pnpm@8`)
- [ ] Clone repo (`git clone git@github.com:twgallo13/ROPI-V2.1.git`)
- [ ] Bootstrap (`pnpm bootstrap`)
- [ ] Build (`pnpm build`)
- [ ] Run tests (`pnpm test`)
- [ ] Start dev server (`pnpm --filter @ropi-aoss/web dev`)
- [ ] Open http://localhost:5173

### Daily Development

- [ ] Pull latest (`git pull origin aoss-main`)
- [ ] Create feature branch (`git checkout -b feature/<slug>`)
- [ ] Make changes
- [ ] Build and test (`pnpm build && pnpm test`)
- [ ] Push and open PR
- [ ] Add labels
- [ ] Complete PR template
- [ ] Delete branch after merge

---

## Need Help?

1. Check [CONTRIBUTING.md](../CONTRIBUTING.md)
2. Review [docs/ENV.md](ENV.md) for environment setup
3. Check [docs/WORKFLOW.md](WORKFLOW.md) for PR rules
4. Ask Lisa for clarification
