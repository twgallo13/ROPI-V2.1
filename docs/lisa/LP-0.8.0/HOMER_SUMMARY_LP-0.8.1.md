# HOMER_SUMMARY_LP-0.8.1

Objective: Produce interactive verification artifacts for Attributes Console features on staging:
- Values CUD (Create, Edit, Delete, Synonyms)
- Conversion flow (text → enumerated allowed_values)
- PDP verification
- Playwright E2E rerun artifacts and summary

## Artifacts Plan
- values-cud: HAR + screenshots per attribute
- conversion-flow: HAR + before/after screenshots
- pdp-verification: HAR + product screenshot + product JSON (if available)
- playwright-e2e: HTML report, traces, logs

## Credentials
Set the following environment variables before running scripts:
- STAGING_URL=https://ropi-aoss-staging.web.app
- STAGING_ADMIN_EMAIL=<admin-email>
- STAGING_ADMIN_PASSWORD=<admin-password>
- ATTRIBUTE_IDS="primary_color,age_group" (optional; defaults provided)
- TARGET_ATTRIBUTE="primary_color" (optional)
- PRODUCT_ID="example-product-id" (optional)

## Commands

Run Values CUD verification:
```
export STAGING_URL=https://ropi-aoss-staging.web.app
export STAGING_ADMIN_EMAIL=theo@shiekh.com
export STAGING_ADMIN_PASSWORD=<retrieved-from-secrets>
node scripts/verify-values-cud-playwright.js
```

Run Conversion Flow verification:
```
export STAGING_URL=https://ropi-aoss-staging.web.app
export STAGING_ADMIN_EMAIL=theo@shiekh.com
export STAGING_ADMIN_PASSWORD=<retrieved-from-secrets>
export TARGET_ATTRIBUTE=primary_color
node scripts/verify-conversion-playwright.js
```

Run PDP verification:
```
export STAGING_URL=https://ropi-aoss-staging.web.app
export STAGING_ADMIN_EMAIL=theo@shiekh.com
export STAGING_ADMIN_PASSWORD=<retrieved-from-secrets>
export PRODUCT_ID=<product-id>
node scripts/verify-pdp-playwright.js
```

## Expected Output
Artifacts will be saved under `artifacts/LP-0.8.1/` (gitignored):
- `values-cud/values-cud.har` + per-attribute screenshots
- `conversion-flow/conversion.har` + before/after screenshots
- `pdp-verification/pdp.har` + `<product-id>.json` (if available)

## Playwright E2E Rerun (optional)
Use Playwright test runner with BASE_URL and single worker:
```
export BASE_URL=https://ropi-aoss-staging.web.app
npx playwright test --workers=1 --reporter=html
```
Artifacts: `playwright-report/`, `playwright-report/index.html`, and traces if configured in `playwright.config.ts`.

## Notes
- Scripts target `data-testid` hooks in `ValuesManager` and `AttributeTabs`.
- Login flow assumes email/password form; adjust selectors if SSO/2FA intervenes.
- HAR files embed request/response content for payload auditing; output goes to a gitignored folder to avoid committing sensitive tokens.
