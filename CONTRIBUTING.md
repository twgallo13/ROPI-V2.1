# Contributing to ROPI AOSS

Welcome to ROPI AOSS! This guide will help you get started contributing to the project.

## Project Overview

ROPI AOSS is a product data management system built with TypeScript. It consists of four main packages:
- **`@ropi-aoss/web`** — Admin UI (Vite + React)
- **`@ropi-aoss/api`** — Firebase Cloud Functions backend
- **`@ropi-aoss/sdk`** — TypeScript types and validators (Zod)
- **`@ropi-aoss/cli`** — CLI tools for data import/export

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Check Command |
|------|---------|---------------|
| Node.js | 20.x LTS | `node --version` |
| pnpm | 8.x | `pnpm --version` |
| Git | 2.x+ | `git --version` |

### Install Node.js (if needed)

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
```

### Install pnpm (if needed)

```bash
npm install -g pnpm@8
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:twgallo13/ROPI-V2.1.git
cd ROPI-V2.1
```

### 2. Bootstrap the Project

```bash
pnpm bootstrap
```

This installs all dependencies for the monorepo.

### 3. Verify Installation

```bash
# Build all packages
pnpm build

# Run tests
pnpm test
```

**How to verify success:**
- No errors during `pnpm bootstrap`
- `pnpm build` completes without errors
- `packages/web/dist/index.html` exists after build

---

## Development Commands

### Running Dev Servers

```bash
# Frontend (opens at http://localhost:5173)
pnpm --filter @ropi-aoss/web dev

# API (Firebase emulator - see Emulator section below)
pnpm --filter @ropi-aoss/api serve
```

### Building Packages

```bash
# Build all packages
pnpm build

# Build specific package
pnpm --filter @ropi-aoss/web build
pnpm --filter @ropi-aoss/sdk build
pnpm --filter @ropi-aoss/api build
pnpm --filter @ropi-aoss/cli build
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @ropi-aoss/sdk test
pnpm --filter @ropi-aoss/api test
pnpm --filter @ropi-aoss/web test

# Watch mode (SDK and API only)
pnpm --filter @ropi-aoss/sdk test:watch
pnpm --filter @ropi-aoss/api test:watch
```

### Linting

```bash
pnpm lint
```

---

## Firebase Emulator

The project uses Firebase emulators for local development.

### Start the Emulator

```bash
pnpm --filter @ropi-aoss/api serve
```

This starts:
- **Functions emulator** at `http://localhost:5001`
- **Firestore emulator** at `http://localhost:8080`
- **Storage emulator** at `http://localhost:9199`
- **Emulator UI** at `http://localhost:4000`

### Seed Data (Optional)

```bash
# Run the seed script (requires environment variables)
pnpm seed
```

> **Note:** See [docs/ENV.md](docs/ENV.md) for required environment variables.

---

## CLI Import Preview

To run the import preview CLI:

```bash
# Build and run the CLI
pnpm --filter @ropi-aoss/cli start

# With arguments (example)
pnpm --filter @ropi-aoss/cli start -- --help
```

> **Note:** Sample data files will be added in a future PR. Check `packages/cli/` for available options.

---

## E2E Tests (Playwright)

```bash
# Run E2E tests (headless)
pnpm --filter @ropi-aoss/web test:e2e

# Run with UI
pnpm --filter @ropi-aoss/web test:e2e:ui

# Run headed (visible browser)
pnpm --filter @ropi-aoss/web test:e2e:headed

# Debug mode
pnpm --filter @ropi-aoss/web test:e2e:debug
```

---

## Branch Naming Convention

All branches **must** follow one of these patterns:

### LP (Launch Prompt) Branches

For structured sprint work tracked by version:

```
lp/<version>-<short-desc>
```

**Examples:**
```
lp/2.0.1-firestore-lockdown     ✅ Firestore rules update
lp/2.0.2-registry-normalize     ✅ Registry sync normalization
lp/2.0.3-provenance             ✅ Attribute provenance
```

### Feature Branches

For general feature development:

```
feature/<slug>
```

**Examples:**
```
feature/auth-login              ✅ Authentication feature
feature/infra/repo-workflow     ✅ Infrastructure work
feature/frontend/product-editor ✅ Frontend feature
```

### Invalid Branch Names

```
fix-bug                    ❌ Missing prefix
dev/my-changes             ❌ Wrong prefix
Feature/my-branch          ❌ Must be lowercase
LP/2.0.1-test              ❌ LP must be lowercase 'lp'
```

---

## LP (Launch Prompt) PRs

LP PRs follow a stricter process with required staging validation.

### LP PR Title Format

```
LP-X.X.X: Short description
```

**Examples:**
```
LP-2.0.1: Firestore — restrict product writes to admin/server
LP-2.0.2: Sync — normalize data_type tokens & add definition_version
```

### LP PR Requirements

Every LP PR **must** include:

1. **LP Version ID** in title (e.g., `LP-2.0.1`)
2. **Staging validation evidence** (see [STAGING_CHECKLIST.md](.github/STAGING_CHECKLIST.md))
3. **Firestore backup** before deployment
4. **Firebase deploy logs** for staging
5. **Validation test results** (PASS/FAIL)

### LP Merge Strategy

- **Squash merge** for all LP branches
- Branch must be deleted after merge
- CI must pass before merge

---

## Creating a Pull Request

### 1. Create Your Branch

```bash
git checkout -b feature/<your-slug>
```

### 2. Make Your Changes

Commit your work with clear, descriptive messages.

### 3. Push and Open PR

```bash
git push -u origin feature/<your-slug>
```

Then open a PR targeting `aoss-main`.

### 4. Complete the PR Template

Every PR has a mandatory template. Fill in all sections:

- ✅ Summary of changes
- ✅ Files changed table
- ✅ Acceptance criteria checklist
- ✅ Tests added or updated
- ✅ Documentation updated
- ✅ Labels checklist
- ✅ **Summary back to Lisa** (required!)

### 5. Add Required Labels

Every PR must have labels from each category:

| Category | Options |
|----------|---------|
| **Type** | `feature`, `bugfix`, `hotfix`, `chore`, `docs` |
| **Area** | `frontend`, `backend`, `infra`, `api`, `sdk` |
| **Priority** | `p0-critical`, `p1-high`, `p2-medium`, `p3-low` |

### 6. Request Review

Request review from at least one owner and one architect.

### 7. Merge and Delete Branch

After approval and CI passes:
1. Merge the PR
2. **Delete the branch immediately** (required!)

---

## PR Validation Workflow

The `validate-pr.yml` GitHub Action automatically checks:

- ✅ PR title is present (≥10 characters)
- ✅ Branch name matches `feature/<slug>`
- ✅ Target branch is `aoss-main`
- ✅ Required labels are present

If any check fails, CI will block the merge.

### Interpreting CI Logs

1. Go to the **Actions** tab in GitHub
2. Click on the failing workflow run
3. Expand the failing step to see the error message
4. Fix the issue and push again

---

## Summary Back to Lisa

Every PR **must** include a "Summary back to Lisa" section with:

- What was accomplished
- Any deviations from the original task
- Any follow-up items or blockers
- Confirmation of completion

This is enforced by the PR template and code review.

---

## Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `pnpm bootstrap` |
| Build all packages | `pnpm build` |
| Run all tests | `pnpm test` |
| Start frontend dev server | `pnpm --filter @ropi-aoss/web dev` |
| Start emulator | `pnpm --filter @ropi-aoss/api serve` |
| Run SDK tests | `pnpm --filter @ropi-aoss/sdk test` |
| Run E2E tests | `pnpm --filter @ropi-aoss/web test:e2e` |

---

## Additional Resources

- [docs/ENV.md](docs/ENV.md) — Environment variables and secrets
- [docs/DEV-SETUP.md](docs/DEV-SETUP.md) — Detailed developer runbook
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — Full workflow policy
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Deployment documentation

---

## Need Help?

1. Check the documentation in `docs/`
2. Review the PR template for guidance
3. Ask Lisa for clarification
