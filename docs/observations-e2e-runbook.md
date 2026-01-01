# E2E Smoke Tests & Monitoring Runbook

**LP-observations-consolidation-1.6.0**

This document covers how to run E2E smoke tests locally, read test artifacts, triage failures, and manage monitoring alerts.

---

## Table of Contents

1. [Running Tests Locally](#running-tests-locally)
2. [Understanding Test Artifacts](#understanding-test-artifacts)
3. [Triage Guide: Common Failures](#triage-guide-common-failures)
4. [API Error Alert Triage](#api-error-alert-triage)
5. [Rollback Instructions](#rollback-instructions)
6. [Monitoring Policy Management](#monitoring-policy-management)

---

## Running Tests Locally

### Prerequisites

```bash
# Ensure you have Node.js 20+
node --version

# Install dependencies
pnpm install

# Install Playwright browsers
cd packages/web
npx playwright install --with-deps chromium
```

### Environment Setup

Create a `.env.e2e` file in `packages/web/`:

```bash
VITE_E2E_ADMIN_EMAIL=your-test-admin@example.com
VITE_E2E_ADMIN_PASSWORD=your-password
VITE_E2E_USER_EMAIL=your-test-user@example.com
VITE_E2E_USER_PASSWORD=your-password
VITE_E2E_UNVERIFIED_EMAIL=unverified@example.com
VITE_E2E_UNVERIFIED_PASSWORD=your-password
```

### Running Smoke Tests

```bash
# Run all @smoke tagged tests against staging
cd packages/web
BASE_URL=https://ropi-aoss-staging.web.app npx playwright test --grep "@smoke"

# Run specific test file
npx playwright test e2e/analyze-and-add.smoke.spec.ts

# Run with UI mode (interactive)
npx playwright test --grep "@smoke" --ui

# Run with trace on (debug)
npx playwright test --grep "@smoke" --trace on

# Run against local dev server
BASE_URL=http://localhost:5173 npx playwright test --grep "@smoke"
```

### Viewing Reports

```bash
# Open HTML report
npx playwright show-report

# Report location
# packages/web/playwright-report/index.html
```

---

## Understanding Test Artifacts

### Artifact Types

| Artifact | Location | Description |
|----------|----------|-------------|
| HTML Report | `playwright-report/` | Interactive test results |
| Screenshots | `test-results/**/screenshot.png` | Failure screenshots |
| Videos | `test-results/**/*.webm` | Test execution videos |
| Traces | `test-results/**/*.zip` | Full trace archives |

### Reading Traces

1. Download trace ZIP from CI artifacts
2. Open Playwright Trace Viewer:
   ```bash
   npx playwright show-trace path/to/trace.zip
   ```
3. Analyze:
   - Timeline of actions
   - Network requests
   - Console logs
   - DOM snapshots

### CI Artifacts

After a CI run:
1. Go to GitHub Actions → Run → Artifacts
2. Download `playwright-smoke-report-{run-id}`
3. Extract and open `playwright-report/index.html`

---

## Triage Guide: Common Failures

### 1. Authentication Failures

**Symptoms:**
- `TimeoutError: waiting for selector '[data-testid="signin-modal"]'`
- Tests stuck on login page

**Causes:**
- E2E test user credentials expired
- Firebase Auth rate limiting
- Test user disabled

**Fix:**
```bash
# Check Firebase Auth console for test users
# Reset password if needed
# Verify user exists in staging project
```

### 2. Element Not Found

**Symptoms:**
- `TimeoutError: waiting for locator`
- `Error: locator.click: Target closed`

**Causes:**
- Component renamed/removed
- Locator strategy outdated
- Page not fully loaded

**Fix:**
1. Check the trace for DOM snapshot
2. Update locator in test file
3. Add proper wait conditions:
   ```typescript
   await page.waitForSelector('.my-element', { state: 'visible' });
   ```

### 3. Network/API Failures

**Symptoms:**
- `net::ERR_CONNECTION_REFUSED`
- `waitForResponse timeout`

**Causes:**
- Staging deployment down
- API endpoint changed
- CORS issues

**Fix:**
1. Verify staging is up: `curl https://ropi-aoss-staging.web.app`
2. Check API health: `curl https://your-api/health`
3. Review recent API deployments

### 4. Flaky Tests

**Symptoms:**
- Test passes locally, fails in CI
- Intermittent failures

**Causes:**
- Race conditions
- Insufficient wait times
- Data dependencies

**Fix:**
1. Add explicit waits for network responses:
   ```typescript
   await page.waitForResponse(r => r.url().includes('/api/') && r.ok());
   ```
2. Increase timeout for CI environment
3. Add retry logic for flaky operations

### 5. Offline Tests Failing

**Symptoms:**
- `Error: Protocol error: Network.emulateNetworkConditions`
- CDP session issues

**Causes:**
- Browser context not supporting CDP
- Service worker not registered

**Fix:**
- These tests are soft-pass by design
- Check if PWA/service worker is enabled in the build

---

## API Error Alert Triage

### When Alert Fires

The `API Error Spike (401/5xx)` alert fires when:
- 401 errors > 2% of requests over 10 minutes
- 5xx errors > 2% of requests over 10 minutes
- OR > 10 errors per minute (absolute)

### Investigation Steps

1. **Check Cloud Logging**
   ```bash
   gcloud logging read 'resource.type="cloud_run_revision" AND httpRequest.status>=400' \
     --project=ropi-bccee \
     --limit=50 \
     --format="table(timestamp,httpRequest.status,httpRequest.requestUrl)"
   ```

2. **Check Firebase Auth Status**
   - Visit [Firebase Console](https://console.firebase.google.com) → Authentication
   - Review recent sign-in attempts
   - Check for rate limiting indicators

3. **Review Recent Deployments**
   ```bash
   gh run list --workflow="Deploy AOSS Staging" --limit=10
   ```

4. **Check Service Account Credentials**
   ```bash
   # Verify SA key hasn't expired
   gcloud iam service-accounts keys list \
     --iam-account=your-sa@ropi-bccee.iam.gserviceaccount.com
   ```

### 401 Specific Causes

| Cause | Fix |
|-------|-----|
| Token expired | Client-side: refresh token flow |
| Invalid credentials | Re-authenticate user |
| CORS blocked | Check Firebase hosting config |
| SA key expired | Rotate GCP_SA_KEY_BASE64 secret |

### 5xx Specific Causes

| Cause | Fix |
|-------|-----|
| Cloud Function cold start | Increase min instances |
| Firestore timeout | Check indexes, optimize queries |
| Memory limit | Increase function memory |
| Unhandled exception | Review Cloud Logging for stack traces |

---

## Rollback Instructions

### Rolling Back Frontend

```bash
# List recent deployments
firebase hosting:channel:list --project ropi-bccee

# Deploy previous version
git checkout <previous-commit>
pnpm --filter @ropi-aoss/web build
firebase deploy --only hosting:staging --project ropi-bccee
```

### Rolling Back API

```bash
# List Cloud Run revisions
gcloud run revisions list --service=ropi-api --project=ropi-bccee

# Route traffic to previous revision
gcloud run services update-traffic ropi-api \
  --to-revisions=REVISION_NAME=100 \
  --project=ropi-bccee
```

### Rolling Back Firestore Rules

```bash
# View rules history in Firebase Console
# Or deploy previous rules file
firebase deploy --only firestore:rules --project ropi-bccee
```

---

## Monitoring Policy Management

### Deploying Alert Policies

```bash
# Deploy from YAML
bash scripts/deploy-monitoring.sh \
  --policy-file monitoring/alerting/alert-401-spike.yaml \
  --project ropi-bccee

# Dry run (validate only)
bash scripts/deploy-monitoring.sh \
  --policy-file monitoring/alerting/alert-401-spike.yaml \
  --dry-run
```

### Listing Policies

```bash
bash scripts/deploy-monitoring.sh --list --project ropi-bccee
```

### Disabling an Alert

```bash
# Via gcloud
gcloud alpha monitoring policies update POLICY_ID \
  --no-enabled \
  --project ropi-bccee

# Or delete
bash scripts/deploy-monitoring.sh --delete POLICY_ID
```

### Setting Up Notification Channels

1. Go to [Cloud Monitoring](https://console.cloud.google.com/monitoring) → Alerting → Notification channels
2. Add Slack/Email channel
3. Copy channel ID
4. Update `alert-401-spike.yaml` with channel ID

---

## Quick Reference

### Test Commands

| Command | Description |
|---------|-------------|
| `npx playwright test --grep "@smoke"` | Run smoke tests |
| `npx playwright show-report` | View HTML report |
| `npx playwright show-trace trace.zip` | View trace file |
| `npx playwright test --ui` | Interactive mode |

### Monitoring Commands

| Command | Description |
|---------|-------------|
| `bash scripts/deploy-monitoring.sh --list` | List policies |
| `bash scripts/deploy-monitoring.sh --policy-file FILE` | Deploy policy |
| `gcloud logging read 'httpRequest.status>=400'` | View error logs |

### Useful Links

- [Playwright Docs](https://playwright.dev/docs/intro)
- [Cloud Monitoring Docs](https://cloud.google.com/monitoring/docs)
- [Firebase Auth Troubleshooting](https://firebase.google.com/docs/auth/web/errors)

---

*Last updated: LP-observations-consolidation-1.6.0*
