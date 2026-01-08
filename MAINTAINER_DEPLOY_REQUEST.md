# MAINTAINER DEPLOY REQUEST — LP-export-ui-attr-fix-1.0.0

**Request Date:** 2026-01-08  
**Requesting Agent:** Homer (via Lisa orchestration)  
**Target:** Staging deployment for commit `8e0b80c`  
**PR:** #459 (merged)  
**LP:** LP-export-ui-attr-fix-1.0.0

---

## IMMEDIATE ACTION REQUIRED

Please run the "Deploy AOSS Staging" workflow (ID 212118351) for commit `8e0b80c`.

### Option A: Via GitHub UI

1. Navigate to: https://github.com/twgallo13/ROPI-V2.1/actions/workflows/deploy-staging.yml
2. Click **"Run workflow"** (green button, top right)
3. Set `ref` = `8e0b80c`
4. Click **"Run workflow"**

### Option B: Via CLI (requires maintainer token)

```bash
gh workflow run 212118351 --ref 8e0b80c
```

---

## REQUIRED RETURN INFORMATION

After the workflow completes, please provide:

### 1. Deploy Confirmation
- ✅ "Authorization granted — deploy of commit 8e0b80c to staging executed."
- Deploy workflow run ID
- Full Actions run URL (e.g., https://github.com/twgallo13/ROPI-V2.1/actions/runs/XXXXXXXX)

### 2. Deployment Outputs
- Staging hosting URL(s) produced:
  - Stable staging: https://ropi-aoss-staging.web.app
  - PR preview (if created): `<URL>`
- Deploy logs URL (Actions run logs or Cloud Build logs)
- Deploy completion timestamp (UTC)
- Deployed commit SHA confirmation (`8e0b80c`)

### 3. Service Account Confirmation
- Service account email used in deploy (as seen in logs, e.g., `ropi-deploy-sa@ropi-bccee.iam.gserviceaccount.com`)
- Confirmation that `GCP_SA_KEY_BASE64` secret was used
- Confirmation that `FIREBASE_TOKEN` (if applicable) was used

### 4. Attribute Registry Sync
- Confirmation that attribute registry sync occurred, OR
- Sync run ID / evidence that sync will be performed separately

### 5. Feature Flag Access
- Who can toggle `SITE_SCOPED` feature flag?
- Who can toggle `GLOBAL` feature flag?
- Where are these flags configured? (Firestore path or environment variable)

---

## CONTEXT

**Why this deploy is needed:**
- Previous dispatch attempt failed with `403 Resource not accessible by integration`
- The GITHUB_TOKEN in Codespace lacks `workflow` dispatch scope
- PR #459 implements attribute normalization (snake_case/camelCase) for export readiness
- HES C verification (orchestrated by Lisa) depends on this staging deploy

**What happens after deploy:**
- Homer will execute HES C verification plan (6 steps)
- Evidence collection for governance compliance
- Return consolidated package to Lisa

---

## VERIFICATION CHECKLIST (for maintainer)

Before closing this request, confirm:

- [ ] Workflow run completed successfully (green check)
- [ ] Stable staging URL is accessible: https://ropi-aoss-staging.web.app
- [ ] Deploy logs show no errors related to Firebase hosting or Firestore
- [ ] Service account authentication succeeded in logs
- [ ] All required return information (above) has been collected

---

## CONTACT

If you have questions or need clarification, please:
- Comment on PR #459
- Tag @twgallo13 or Lisa in relevant channel
- Reply with any blockers or missing information

**Thank you for your assistance!**
