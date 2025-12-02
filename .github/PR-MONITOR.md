# PR Monitor & Auto-Merge System

**Version**: AOSS_PR_MONITOR_v1.0

## Overview

The PR Monitor system automatically monitors, evaluates, and merges pull requests targeting the `aoss-main` branch when they meet all safety and quality criteria. After a successful merge, the system triggers the existing `Deploy AOSS Staging` workflow to deploy changes to the staging environment.

## How It Works

### Monitoring Schedule
- **Every 10 minutes**: Scheduled check of all open PRs
- **On PR events**: Immediate check when PRs are opened, updated, or labeled
- **Manual trigger**: Can be run manually via workflow_dispatch

### Auto-Merge Criteria

A PR will be **automatically merged** only when **ALL** of the following conditions are met:

1. ✅ **Base branch is `aoss-main`**
2. ✅ **PR is not a draft**
3. ✅ **No manual override labels** (`manual-merge` or `no-automerge`)
4. ✅ **Mergeable state is clean** (no conflicts)
5. ✅ **All required status checks pass** (CI/CD workflows)
6. ✅ **Required approvals satisfied** (per branch protection rules)
7. ✅ **No "Changes Requested" reviews**

### After Merge

When a PR is successfully merged:

1. 🔀 **Merge commit created** using `merge` strategy (not squash or rebase)
2. 💬 **Comment posted** to the PR with merge SHA and deployment info
3. 🚀 **Deploy workflow triggered** automatically (push to `aoss-main` triggers `.github/workflows/deploy-staging.yml`)
4. 📝 **Notion updated** with merge details in the AOSS Build Progress Log

## How to Opt Out of Auto-Merge

If you want to **prevent** auto-merge for a specific PR:

### Option 1: Mark as Draft
Convert your PR to draft status. Auto-merge will skip all draft PRs.

```
1. Go to your PR page
2. Click "Convert to draft" in the right sidebar
```

### Option 2: Add Label
Add the `manual-merge` or `no-automerge` label to your PR.

```
1. Go to your PR page
2. Click "Labels" in the right sidebar
3. Add "manual-merge" or "no-automerge"
```

## Common Scenarios

### Merge Conflicts
If your PR has merge conflicts:
- Auto-merge will be **blocked**
- You'll receive a comment asking you to update your branch
- Resolve conflicts by rebasing or merging `aoss-main` into your branch

### Failed CI Checks
If any required checks fail:
- Auto-merge will **wait** until all checks pass
- Fix the issues and push new commits
- The monitor will re-evaluate on the next run

### Missing Approvals
If branch protection requires approvals:
- Auto-merge will **wait** for the required number of approvals
- Request reviews from team members
- Once approved, auto-merge will proceed on the next check

### Changes Requested
If a reviewer requests changes:
- Auto-merge will be **blocked** until the review is dismissed or updated
- Address the feedback and request a new review
- Once approved (or review dismissed), auto-merge can proceed

## Monitoring & Debugging

### View Workflow Runs
Check the auto-merge workflow status:
- Go to: https://github.com/twgallo13/ROPI-V2.1/actions/workflows/pr-monitor-auto-merge.yml
- Each run shows which PRs were evaluated and why they were merged or skipped

### View Deployment Status
After a PR is merged, monitor the staging deployment:
- Go to: https://github.com/twgallo13/ROPI-V2.1/actions/workflows/deploy-staging.yml
- Check for the latest run triggered by the merge commit
- Staging URL: https://ropi-aoss-staging.web.app

### Notion Build Log
All auto-merge events are logged in the AOSS Build Progress Log:
- View at: https://www.notion.so/2bd45ee1ec5a800da672f7dac3000966
- Includes PR number, title, merge SHA, and deployment URL

## Troubleshooting

### Auto-merge isn't running
**Check**:
- Is the PR targeting `aoss-main`? (not `main`)
- Is the workflow enabled in Actions settings?
- Are workflow permissions set correctly?

### PR meets criteria but isn't merging
**Check**:
- View the latest workflow run logs
- Look for specific failure reasons in the console output
- Verify GitHub token has `contents: write` and `pull-requests: write` permissions

### Merge succeeded but deployment failed
**Check**:
- The Deploy AOSS Staging workflow for errors
- Required secrets: `GCP_SA_KEY_BASE64` must be set in `staging` environment
- Firebase project permissions for the service account

## Required Secrets

The PR Monitor requires these secrets:

### For Auto-Merge (Required)
- **`GITHUB_TOKEN`**: Automatically provided by GitHub Actions

### For Notion Updates (Optional)
- **`NOTION_TOKEN`**: Integration token for updating the Build Progress Log
  - If not set, auto-merge will still work but Notion won't be updated

### For Staging Deployment (Required by deploy-staging.yml)
- **`GCP_SA_KEY_BASE64`**: Service account key for Firebase deployment
  - Must be set in the `staging` environment
  - Service account needs `Firebase Hosting Admin` role

## Setup & Configuration

### Enable/Disable Auto-Merge System

To **disable** the entire auto-merge system:
```
1. Go to Actions → pr-monitor-auto-merge.yml
2. Click "..." → "Disable workflow"
```

To **re-enable**:
```
1. Go to Actions → pr-monitor-auto-merge.yml
2. Click "..." → "Enable workflow"
```

### Adjust Check Frequency

Edit `.github/workflows/pr-monitor-auto-merge.yml`:
```yaml
on:
  schedule:
    - cron: '*/10 * * * *'  # Change to '*/5 * * * *' for every 5 minutes
```

### Branch Protection Rules

Recommended `aoss-main` branch protection settings:
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
- ✅ Require branches to be up to date before merging
- ⚠️ **Do NOT** enable "Require signed commits" if using auto-merge

## Safety Features

The PR Monitor includes multiple safety mechanisms:

1. **Read-only by default**: Only evaluates PRs unless all criteria are met
2. **Conservative merging**: Uses merge commits (not squash) to preserve full history
3. **Comprehensive logging**: All decisions logged to workflow output and Notion
4. **Error handling**: Failed merges post comments and log errors without blocking future runs
5. **Manual override**: Multiple ways to opt out (draft, labels)

## Version History

### AOSS_PR_MONITOR_v1.0 (Current)
- Initial implementation
- Auto-merge for PRs targeting `aoss-main`
- Integration with existing Deploy AOSS Staging workflow
- Notion Build Progress Log updates
- Comprehensive safety checks and opt-out mechanisms

---

**Questions or issues?** Contact Lisa or check the workflow run logs for detailed diagnostic information.
