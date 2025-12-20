# Homer DONE: LP-0.8.1 — Preview Deploy & Staging Verification

Summary
- Objective: Rerun preview deploy for PR #307, verify staging flows (Values CUD, conversion, PDP), capture artifacts, and confirm no 401/403.
- Status: Preview rerun requested; awaiting completion. Artifacts scaffolding prepared.

Checklist
- [ ] Preview rerun run ID: <id> and URL: <url>
- [ ] Preview hosting URL: <preview-url>
- [ ] Values CUD artifacts:
  - docs/lisa/LP-0.8.0/artifacts/values-cud/values-cud.har
  - docs/lisa/LP-0.8.0/artifacts/values-cud/primary_color_*
- [ ] Conversion artifacts:
  - docs/lisa/LP-0.8.0/artifacts/conversion/conversion.har
  - docs/lisa/LP-0.8.0/artifacts/conversion/primary_color_top-values.json
- [ ] PDP artifacts:
  - docs/lisa/LP-0.8.0/artifacts/pdp/pdp.har
  - docs/lisa/LP-0.8.0/artifacts/pdp/14943667_pdp.png
  - docs/lisa/LP-0.8.0/artifacts/pdp/14943667_product_json.json
- [ ] Playwright E2E report (zip): docs/lisa/LP-0.8.0/artifacts/playwright-report.zip
- [ ] Playwright stdout: docs/lisa/LP-0.8.0/artifacts/playwright-run.log
- [ ] Security confirmation: staging passwords/tokens rotated (yes/no), GH secrets set (yes/no)

Artifacts
- Run info: docs/lisa/LP-0.8.0/artifacts/deploy-run-info.txt
- Workflow runs: docs/lisa/LP-0.8.0/artifacts/workflow-runs.json
- Values CUD HAR: docs/lisa/LP-0.8.0/artifacts/values-cud/values-cud.har
- Conversion HAR: docs/lisa/LP-0.8.0/artifacts/conversion/conversion.har
- PDP HAR + screenshot + JSON: docs/lisa/LP-0.8.0/artifacts/pdp/*
- Playwright report + log: docs/lisa/LP-0.8.0/artifacts/playwright-report.zip, playwright-run.log

Notes
- If automation is blocked by SSO/2FA, perform manual HAR + console capture and attach.
- No secrets committed; GH secrets configured via `gh secret set`.
