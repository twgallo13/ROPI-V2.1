# Homer DONE: LP-0.8.1 — Preview Deploy & Staging Verification

Summary
- Objective: Rerun preview deploy for PR #307, verify staging flows (Values CUD, conversion, PDP), capture artifacts, and confirm no 401/403.
- Status: Preview run failed at web build (TypeScript). Deployment did not publish a preview URL. Failure logs captured.

Checklist
- [x] Preview run ID: 20389970423 and URL: https://github.com/twgallo13/ROPI-V2.1/actions/runs/20389970423
- [x] Run status: FAILURE (Updated at: 2025-12-20T05:46:38Z)
- [x] Preview hosting URL: N/A (build failed)
- [x] Failure logs captured: deploy-20389970423.log, deploy-failure-build-web-app.log, deploy-failure-build-web-app.error.txt
- [ ] Values CUD artifacts (skipped due to failed deploy)
  - docs/lisa/LP-0.8.0/artifacts/values-cud/values-cud.har
  - docs/lisa/LP-0.8.0/artifacts/values-cud/primary_color_*
- [ ] Conversion artifacts (skipped due to failed deploy)
  - docs/lisa/LP-0.8.0/artifacts/conversion/conversion.har
  - docs/lisa/LP-0.8.0/artifacts/conversion/primary_color_top-values.json
- [ ] PDP artifacts (skipped due to failed deploy)
  - docs/lisa/LP-0.8.0/artifacts/pdp/pdp.har
  - docs/lisa/LP-0.8.0/artifacts/pdp/14943667_pdp.png
  - docs/lisa/LP-0.8.0/artifacts/pdp/14943667_product_json.json
- [ ] Playwright E2E report (skipped due to failed deploy): docs/lisa/LP-0.8.0/artifacts/playwright-report.zip
- [ ] Playwright stdout (skipped due to failed deploy): docs/lisa/LP-0.8.0/artifacts/playwright-run.log
- [x] Security confirmation: GH secrets set (Yes); staging password rotation (No — to be rotated prior to next run); temporary tokens revoked (Yes)

Artifacts
- Run info: docs/lisa/LP-0.8.0/artifacts/deploy-run-info.txt
- Workflow runs: docs/lisa/LP-0.8.0/artifacts/workflow-runs.json
- Failure logs (raw + snippet + segment):
  - docs/lisa/LP-0.8.0/artifacts/deploy-20389970423.log
  - docs/lisa/LP-0.8.0/artifacts/deploy-failure-build-web-app.error.txt
  - docs/lisa/LP-0.8.0/artifacts/deploy-failure-build-web-app.log
- Values CUD HAR: docs/lisa/LP-0.8.0/artifacts/values-cud/values-cud.har
- Conversion HAR: docs/lisa/LP-0.8.0/artifacts/conversion/conversion.har
- PDP HAR + screenshot + JSON: docs/lisa/LP-0.8.0/artifacts/pdp/*
- Playwright report + log: docs/lisa/LP-0.8.0/artifacts/playwright-report.zip, playwright-run.log

Notes
- Build failure cause: TypeScript error in `packages/web/src/components/observations/__tests__/MobileMPNScanner.test.tsx` — TS6133 `'Mock' is declared but its value is never read.` This surfaced during `tsc && vite build`, causing exit code 2.
- Next step to unblock deploy: fix or exclude test files from production TypeScript build (e.g., adjust `tsconfig` `exclude`, move tests under a path excluded from build, or fix the unused import `Mock`). After fix, re-run preview via Actions UI.
- No secrets committed; GH secrets configured via `gh secret set` and confirmed. Password rotation will be performed before next run.
