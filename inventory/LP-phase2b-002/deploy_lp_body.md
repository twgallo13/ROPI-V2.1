# LP-phase2b-002 — Deploy Phase 2B UI (Completion + Export Gate) to Production

## Objective
Deploy Phase 2B UI (CompletionCard, ExportGatePanel, GlobalModeCard, Admin read-only) to **production** using the verified implementation merged to `aoss-main`.

## Merge / Build Reference
- Merge commit to deploy: **b6219ea**
- Branch: `aoss-main`
- Release tag: `lp-phase2b-001-v4-verified-b6219ea`

## Pre-deploy Preconditions (must be SATISFIED & evidenced in HES)
1. LP-phase2b-001 remediation: `HES-LP-phase2b-001-REMEDIATION.json` — **VERIFIED_SUCCESS** (Theo/John). ✔️  
2. Implementation HES: `HES-LP-phase2b-001.json` — **VERIFIED_SUCCESS** (Lisa). ✔️  
3. Production Release Manager approval (this PR + HES must be reviewed/approved). ⏳  
4. Production feature flag gating available and testable. ⏳  
5. Monitoring & rollback plan approved. ⏳

## Deployment Plan (canonical)

### 1. Pre-flight
- Confirm production secrets & CI are present.
- Confirm release manager + on-call contact list.
- Ensure feature flag `features.completion.phase2b.enabled` exists in prod but set **false** initially.

### 2. Build & Dry-run
- Trigger CI build for `aoss-main@b6219ea`. Verify artifact digest.
- Deploy artifact to preview/prod-preview and run preview smoke checks.

### 3. Canary
- Deploy to 5% traffic (canary). Observe 10 minutes, run smoke + monitoring checks.
- If PASS → continue; if FAIL → rollback as per rollback plan.

### 4. Gradual rollout
- 5% → 25% → 50% → 100% with 10m observation windows.
- At each increase run the smoke-check list below.

### 5. Feature flag flip
- Flip `features.completion.phase2b.enabled = true` after final rollout or for targeted users if desired.
- Validate real users' surfaces for MPN presence and export gate behavior.

### 6. Post-deploy validation
- Run full smoke (API + UI + Export Gate + Stability) and record artifacts to `inventory/LP-phase2b-002/evidence/`.

## Rollback Plan
1. Flip `features.completion.phase2b.enabled = false`.  
2. Revert to previous stable image digest.  
3. If rollback fails, follow infra failover runbook and contact on-call.

## Smoke Checks (exact commands)

### API smoke
```bash
curl -sS "https://<PROD_API>/api/products/19-test/completion" \
  -H "Authorization: Bearer <PROD_TOKEN>" -H "Accept: application/json" \
  > inventory/LP-phase2b-002/evidence/prod_api_product_19-test.completion.json

jq '{mpn:.productIdentifiers.mpn, pct:.completion_result.completionPct, segments:.completion_result.segments}' \
  inventory/LP-phase2b-002/evidence/prod_api_product_19-test.completion.json
```

### UI smoke (Playwright)
- Navigate to `/products/19-test` and assert:
  - `.mpn` visible and equals API mpn
  - Export button state matches completion status
- Save logs/screenshots: `inventory/LP-phase2b-002/evidence/prod_ui_playwright.log`

### Export Gate smoke
- Run export flow for ready product; validate success. Save `prod_export_gate.log`.

### Stability
- Run the 5 flows 3× and ensure identical outputs. Save `prod_stability_runs.json` and `prod_stability_equality_proof.txt`.

## Acceptance Criteria
- All preconditions SATISFIED in HES
- API responses for sample mpns match evaluator behavior
- UI shows MPN and hides internal product_id
- Export Gate behaves deterministically
- Reactive update < 2s
- Accessibility within tolerance (no critical axe errors)
- Monitoring Green (error/latency thresholds)

## Artifacts to attach to HES
Place under `inventory/LP-phase2b-002/evidence/`:
- `prod_api_product_<mpn>.completion.json` (3 mpns)
- `prod_ui_playwright.log` + screenshots
- `prod_export_gate.log`
- `prod_stability_runs.json` and `prod_stability_equality_proof.txt`
- `deployment_plan.txt`, `rollback_plan.txt`, `monitoring_checklist.txt`
- CI run URLs for build and E2E

## Approvals Required
- Lisa (Design/Policy) — final signoff  
- Theo/John — VVP acceptance (done)  
- Release Manager / Ops — approve deployment plan & rollback

## How to create Deploy LP
```bash
gh issue create --repo twgallo13/ROPI-V2.1 \
  --title "LP-phase2b-002-deploy: Deploy Phase 2B UI to Production" \
  --body-file ./deploy_lp_body.md \
  --label "state:planned" --label "type:deploy" --label "lp:phase2b-002"
```

## Contact
Release Manager: `<release-manager-email>`  
Oncall Ops: `<ops-oncall-email>`
