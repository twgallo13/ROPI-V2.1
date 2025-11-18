# Production Environment Setup Guide

**Status**: PRODUCTION environment not found - needs creation  
**Required by**: Phase B attribute registry seed workflow  
**Priority**: Required before workflow can run

## Quick Setup (5 minutes)

### Step 1: Create PRODUCTION Environment

**URL**: https://github.com/twgallo13/ROPI-V2.1/settings/environments

1. Click **"New environment"** button
2. Enter name: `PRODUCTION` (exact spelling, all caps)
3. Click **"Configure environment"**

### Step 2: (Optional) Configure Protection Rules

If you want manual approval before production seeding:

1. Under **"Environment protection rules"**:
   - Check **"Required reviewers"**
   - Select reviewers from dropdown
   - Click **"Save protection rules"**

If you skip this, the workflow will run immediately upon dispatch (recommended for first run with backup safety).

### Step 3: Add SERVICE_ACCOUNT_JSON Secret

Still on the PRODUCTION environment configuration page:

1. Scroll to **"Environment secrets"** section
2. Click **"Add secret"**
3. Enter:
   - **Name**: `SERVICE_ACCOUNT_JSON` (exact spelling)
   - **Value**: Paste the complete JSON content of the service account
4. Click **"Add secret"**

## Service Account JSON Requirements

The JSON must:

1. **Be for the correct project**: `ropi-bccee`
2. **Have required structure**:
   ```json
   {
     "type": "service_account",
     "project_id": "ropi-bccee",
     "private_key_id": "...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...",
     "client_email": "...@ropi-bccee.iam.gserviceaccount.com",
     ...
   }
   ```
3. **Have Firestore permissions**: Service account must have `Cloud Datastore User` or `Firebase Admin` role

## Verification Checklist

Before dispatching the workflow, verify:

- [ ] Environment named `PRODUCTION` exists
- [ ] `SERVICE_ACCOUNT_JSON` secret added to PRODUCTION environment
- [ ] Secret's `project_id` field equals `ropi-bccee`
- [ ] Service account has Firestore write access
- [ ] (Optional) Required reviewers configured if manual approval desired

## After Setup

Once setup is complete:

1. **Dispatch the workflow**: https://github.com/twgallo13/ROPI-V2.1/actions/workflows/seed-attributes-phaseb.yml
   - Branch: `main`
   - environment: `PRODUCTION`
   - approval: `Approve — seed to PRODUCTION`

2. **Monitor the run**: Check the debug step prints `ropi-bccee`

3. **After completion**: Run artifact collection:
   ```bash
   cd /workspaces/ROPI-V2.1
   RUN_ID=$(gh run list --repo twgallo13/ROPI-V2.1 \
     --workflow=seed-attributes-phaseb.yml \
     --branch main --limit 1 \
     --json databaseId --jq '.[0].databaseId')
   ./operations/collect-phaseb-artifacts.sh $RUN_ID
   ```

## Security Notes

- ✅ Environment secrets are more secure than repo-level secrets
- ✅ Never paste secrets in issues, PRs, or comments
- ✅ Rotate service account keys after use if this is a new key
- ✅ Service account should have least-privilege permissions (Firestore only)

## Troubleshooting

### "Resource not accessible" when dispatching
- Ensure PRODUCTION environment exists (check Settings → Environments)
- Verify workflow file is on `main` branch

### "Secret not found" during workflow run
- Verify secret name is exactly `SERVICE_ACCOUNT_JSON` (case-sensitive)
- Check secret is added to PRODUCTION environment, not repo-level

### "Project ID mismatch" in workflow
- Debug step will print the actual `project_id` from the secret
- Replace secret with correct JSON for `ropi-bccee` project

### Workflow waiting for approval
- If reviewers are required, go to the run and click "Review deployments"
- Approve the PRODUCTION environment deployment

---

**Setup by**: Admin with repository and environment management permissions  
**Estimated time**: 5 minutes  
**One-time setup**: Yes (environment persists for future runs)
