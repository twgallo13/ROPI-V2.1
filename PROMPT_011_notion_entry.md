## PROMPT_011: Fix Staging Deployment

**Date**: December 2, 2025
**Status**: ✅ COMPLETE

### What Changed
- **Merged PR #154**: AOSS Frontend Navigation (prerequisite for real app)
- **Created & Merged PR #157**: Fixed firebase.json public path + simplified deploy workflow
- **Configuration Fix**: Updated `firebase.json` hosting.public from `"public"` to `"packages/web/dist"`
- **Workflow Simplification**: Removed 87 lines of placeholder logic, added simple build validation

### Why
Staging site was showing placeholder message instead of real AOSS app because:
1. firebase.json pointed to wrong directory ("public" instead of "packages/web/dist")
2. Deploy workflow had fallback logic that created placeholders on build failure
3. PR #154 (real web app source) wasn't merged yet

### Proof
✅ **Deployment Success**: Run 19859371000
✅ **Staging URL**: https://ropi-aoss-staging.web.app
✅ **Smoke Checks**: HTTP 200 on /, /home, /products
✅ **Real App Deployed**: React bundle (182.93 kB), CSS (10.19 kB), no placeholder text

### Links
- PR #154: https://github.com/twgallo13/ROPI-V2.1/pull/154 (merged)
- PR #157: https://github.com/twgallo13/ROPI-V2.1/pull/157 (merged)
- Deploy Run: https://github.com/twgallo13/ROPI-V2.1/actions/runs/19859371000
- Audit: HOMER_PROMPT_011_DEPLOY_FIX.txt

