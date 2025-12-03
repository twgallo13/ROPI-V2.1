# ROPI AOSS Deployment Runbook

**Version:** 1.0  
**Last Updated:** December 3, 2025  
**Owner:** Lisa (Approval Required for Production)

**Source-of-Truth:**
- Section 10 — CI/CD, Testing, Release & Stability  
  Notion Page ID: 2b845ee1-ec5a-80cc-af70-e49777a2b677
- Section 11 — Observability, Monitoring & Runbooks  
  Notion Page ID: 2b845ee1-ec5a-80d4-82ed-cd9af5565e45

---

## Table of Contents

1. [Overview](#overview)
2. [Environments](#environments)
3. [Deployment Workflow](#deployment-workflow)
4. [Production Rollout Plan](#production-rollout-plan)
5. [Rollback Procedures](#rollback-procedures)
6. [Feature Flags & Toggles](#feature-flags--toggles)
7. [Monitoring & Alerts](#monitoring--alerts)
8. [Emergency Contacts](#emergency-contacts)

---

## Overview

This runbook documents the deployment process, rollout strategy, and rollback procedures for the ROPI AOSS (Admin Order & Staging System) web application.

**Key Principles:**
- **Staging First:** All changes must be deployed to staging and validated before production
- **Incremental Rollout:** Production deployments follow staged rollout (internal → limited → full)
- **Fast Rollback:** Ability to revert to last known-good version within 5 minutes
- **Zero Downtime:** Firebase Hosting supports atomic deployments with instant rollback

---

## Environments

### Staging
- **URL:** https://ropi-aoss-staging.web.app
- **Firebase Project:** ropi-bccee
- **Hosting Target:** aoss-staging
- **Purpose:** Pre-production testing, E2E validation, internal demos
- **Data:** Uses staging Firestore database (isolated from production)
- **Branch:** Deploys from `aoss-main` branch

### Production
- **URL:** https://ropi-aoss.web.app
- **Firebase Project:** ropi-bccee
- **Hosting Target:** aoss-production
- **Purpose:** Live application for internal users
- **Data:** Uses production Firestore database
- **Branch:** Deploys from tagged releases (e.g., `v1.0.0`)

### Preview Channels
- **URL Pattern:** `https://ropi-bccee--pr-{PR_NUMBER}-aoss-staging.web.app`
- **Purpose:** Per-PR preview deployments for code review
- **Lifetime:** 7 days (auto-cleanup)
- **Data:** Uses staging Firestore database

---

## Deployment Workflow

### 1. Development → PR

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push -u origin feature/my-feature
gh pr create --base aoss-main --title "Add my feature"
```

**CI Checks:**
- ✅ Lint and TypeScript compilation
- ✅ Unit tests (Vitest)
- ✅ Build verification
- ✅ Preview deployment to Firebase Hosting preview channel
- ✅ E2E tests against preview URL

**Required Status Checks:**
- `deploy-precheck`
- `e2e` (E2E tests)
- All checks must pass before merge

### 2. Merge to `aoss-main` → Staging Deploy

```bash
# After PR approval, merge to aoss-main
gh pr merge {PR_NUMBER} --squash

# Staging deploy workflow runs automatically
# See .github/workflows/deploy-staging.yml
```

**Staging Deploy Steps:**
1. Build web app (`pnpm --filter @ropi-aoss/web build`)
2. Deploy to Firebase Hosting `aoss-staging` target
3. Run smoke tests (optional)
4. Post deployment URL to Slack/notifications

**Manual Staging Deploy:**
```bash
# Build
cd packages/web
pnpm build

# Deploy
firebase deploy --only hosting:aoss-staging --project ropi-bccee
```

### 3. Staging Validation

**Checklist:**
- [ ] Staging URL loads without errors
- [ ] Auth flows work (Email/Google sign-in)
- [ ] Launch Calendar signups function correctly
- [ ] Observations can be created and resolved
- [ ] Email verification banner appears for unverified users
- [ ] Admin users have correct permissions
- [ ] No console errors or warnings
- [ ] Sentry error monitoring active
- [ ] E2E tests passing

**Validation Period:** Minimum 24 hours on staging before production deploy

### 4. Production Deploy

**⚠️ REQUIRES LISA'S APPROVAL**

**Pre-Deploy Checklist:**
- [ ] Staging validation complete (24+ hours)
- [ ] All E2E tests passing
- [ ] No critical bugs in Sentry
- [ ] Lisa has approved production deployment
- [ ] Release notes prepared
- [ ] Rollback plan reviewed

**Production Deploy Commands:**

```bash
# 1. Checkout aoss-main and ensure clean state
git checkout aoss-main
git pull origin aoss-main

# 2. Create release tag
git tag -a v1.0.0 -m "Release v1.0.0: IAM, email verification, launch signups"
git push origin v1.0.0

# 3. Build production assets
cd packages/web
pnpm build

# 4. Deploy to production
firebase deploy --only hosting:aoss-production --project ropi-bccee

# 5. Verify deployment
curl -I https://ropi-aoss.web.app
```

**Post-Deploy Verification:**
- [ ] Production URL loads
- [ ] Sign in with test admin account
- [ ] Check Sentry for errors
- [ ] Monitor Firebase Analytics
- [ ] Watch Slack alerts channel

---

## Production Rollout Plan

**Staged Rollout Strategy** (aligns with Section 10 & 11):

### Phase 1: Internal Testing (Day 1)
- **Audience:** 2-3 admin test accounts (Theo, Lisa, test users)
- **Duration:** 24 hours
- **Goals:**
  - Verify auth flows in production
  - Test admin custom claims
  - Validate email verification policy
  - Confirm launch signups work with real data

**Go/No-Go Criteria:**
- No critical errors in Sentry
- All test accounts can sign in and perform key actions
- Firestore rules enforce permissions correctly

### Phase 2: Limited Internal Users (Day 2-3)
- **Audience:** 10-15 internal users (merchandising, buyers, photographers)
- **Duration:** 48 hours
- **Goals:**
  - Validate real workflows (observations, launch signups)
  - Monitor performance under light load
  - Gather user feedback

**Go/No-Go Criteria:**
- No data loss or corruption
- Acceptable performance (page load < 3s)
- User feedback is positive

### Phase 3: Full Internal Rollout (Day 4+)
- **Audience:** All internal users (~50-100 users)
- **Duration:** Ongoing
- **Goals:**
  - Full production usage
  - Continuous monitoring
  - Iterative improvements

**Success Metrics:**
- 95%+ uptime
- < 5% error rate in Sentry
- User satisfaction score > 4/5

---

## Rollback Procedures

### Scenario 1: Critical Bug Discovered

**Symptoms:**
- Auth failures preventing sign-in
- Firestore permission errors blocking writes
- Data corruption
- Application crash on load

**Immediate Action (Within 5 minutes):**

```bash
# 1. Rollback Firebase Hosting to previous version
firebase hosting:rollback --project ropi-bccee --target aoss-production

# 2. Verify rollback
curl -I https://ropi-aoss.web.app
# Check version in HTML meta tag or assets

# 3. Notify team
# Post in Slack: "Production rolled back to v1.0.0 due to [issue]"
```

**Root Cause Analysis:**
- Investigate error in Sentry
- Review recent commits
- Test fix in staging
- Prepare hotfix PR

### Scenario 2: Firestore Rules Causing Permission Errors

**Symptoms:**
- "permission-denied" errors in Firestore
- Users unable to create observations
- Launch signups failing

**Immediate Action:**

```bash
# 1. Checkout last known-good Firestore rules
git checkout HEAD~1 -- firestore.rules

# 2. Deploy rules
firebase deploy --only firestore:rules --project ropi-bccee

# 3. Verify in Firebase Console
# Go to Firestore → Rules → Check active ruleset

# 4. Monitor Sentry for permission-denied errors
# Should decrease immediately
```

### Scenario 3: Performance Degradation

**Symptoms:**
- Slow page loads (> 5s)
- Firestore read/write latency spikes
- High memory usage

**Immediate Action:**

1. **Check Firebase Console:**
   - Firestore usage metrics
   - Hosting bandwidth
   - Authentication load

2. **Identify Bottleneck:**
   - Sentry performance monitoring
   - Network tab in browser DevTools
   - Firestore query patterns

3. **Mitigation:**
   - Enable Firebase CDN caching
   - Optimize expensive queries
   - Add Firestore indexes if missing

4. **If Unfixable:**
   - Roll back to previous version
   - Schedule maintenance window for fix

### Rollback Decision Matrix

| Issue Severity | User Impact | Rollback Required? | Timeline |
|----------------|-------------|-------------------|----------|
| Critical | All users blocked | ✅ Yes | Immediate (< 5 min) |
| High | Major features broken | ✅ Yes | Within 30 min |
| Medium | Non-critical feature broken | ⚠️ Maybe | Evaluate (1-2 hours) |
| Low | UI glitch, minor bug | ❌ No | Fix forward |

---

## Feature Flags & Toggles

### Environment Variables

Managed via `.env.production` and Firebase environment config:

```bash
# Environment detection
VITE_ENV=production  # or 'staging'

# Feature toggles
VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED=false  # Public email signups (disabled by default)

# Monitoring
VITE_SENTRY_DSN=https://...@sentry.io/...  # Sentry error monitoring

# Firebase config
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... (see deploy-precheck.yml for full list)
```

### Disabling Features in Emergency

**Disable Public Launch Signups:**
```bash
# 1. Set env var to false
VITE_LAUNCH_SIGNUP_PUBLIC_ENABLED=false

# 2. Rebuild and redeploy
pnpm --filter @ropi-aoss/web build
firebase deploy --only hosting:aoss-production
```

**Disable Email Verification Enforcement:**
- Controlled by `VITE_ENV` (staging = soft, production = hard)
- To temporarily disable in production:
  ```bash
  VITE_ENV=staging pnpm build
  # Deploy (NOT RECOMMENDED - violates security policy)
  ```
- **Recommended:** Fix underlying issue instead of disabling security

---

## Monitoring & Alerts

### Sentry Error Monitoring

**Dashboard:** https://sentry.io/organizations/ropi-aoss/projects/

**Key Metrics:**
- Error rate (target: < 5%)
- Unhandled exceptions
- Performance metrics (page load, API latency)

**Alert Channels:**
- Slack: `#ropi-aoss-alerts`
- Email: lisa@shiekhshoes.org, theo@shiekhshoes.org

**Error Categorization:**

| Feature | Tag | Alert Threshold |
|---------|-----|-----------------|
| Auth | `feature:auth` | > 10 errors/hour |
| Firestore | `feature:firestore` | > 20 errors/hour |
| Launch Signups | `feature:launch-signup` | > 5 errors/hour |
| Observations | `feature:observations` | > 10 errors/hour |

### Firebase Monitoring

**Console:** https://console.firebase.google.com/project/ropi-bccee

**Key Metrics:**
- **Hosting:** Bandwidth, requests/min, cache hit rate
- **Firestore:** Read/write operations, document count
- **Auth:** Daily active users, sign-in methods

**Alert Conditions:**
- Firestore reads > 100k/day (cost alert)
- Auth failures > 50/hour
- Hosting 4xx/5xx errors > 5%

### Manual Checks

**Daily (Monday-Friday):**
- [ ] Check Sentry for new errors
- [ ] Review Firebase usage metrics
- [ ] Verify staging and production are healthy

**After Each Deploy:**
- [ ] Check Sentry for spikes in errors
- [ ] Verify Firebase Hosting deploy succeeded
- [ ] Test critical user flows (auth, observations, launch signups)

---

## Emergency Contacts

### Escalation Path

1. **First Responder:** Theo (GitHub: @theo)
   - Initial triage and rollback decision

2. **Approval Authority:** Lisa (GitHub: @lisa)
   - Production deploy approval
   - Rollback authorization for major incidents

3. **Firebase Admin:** Service Account
   - GCP_SA_KEY_BASE64 secret in GitHub Actions
   - Emergency access via `gcloud auth activate-service-account`

### Communication Channels

- **Slack:** `#ropi-aoss-dev` (development), `#ropi-aoss-alerts` (production)
- **GitHub:** Issues and PRs for tracking
- **Email:** For critical production incidents

### On-Call Schedule

- **Primary:** Theo (weekdays 9am-5pm PT)
- **Secondary:** Lisa (escalations, approvals)
- **After Hours:** Best-effort response (check Slack/email)

---

## Appendix: Common Commands

### Build & Deploy
```bash
# Build web app
cd packages/web
pnpm build

# Deploy to staging
firebase deploy --only hosting:aoss-staging --project ropi-bccee

# Deploy to production (REQUIRES APPROVAL)
firebase deploy --only hosting:aoss-production --project ropi-bccee

# Deploy Firestore rules
firebase deploy --only firestore:rules --project ropi-bccee

# Deploy everything
firebase deploy --project ropi-bccee
```

### Rollback
```bash
# Rollback hosting
firebase hosting:rollback --project ropi-bccee --target aoss-production

# Rollback Firestore rules (manual)
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules --project ropi-bccee
```

### Monitoring
```bash
# View Firebase hosting versions
firebase hosting:channel:list --project ropi-bccee

# Check Firestore usage
firebase firestore:usage --project ropi-bccee

# View recent logs (requires gcloud setup)
gcloud logging read "resource.type=firebase" --limit=50 --project=ropi-bccee
```

### Testing
```bash
# Run unit tests
pnpm --filter @ropi-aoss/web test

# Run E2E tests locally
cd packages/web
BASE_URL=http://localhost:5173 pnpm test:e2e

# Run E2E against staging
BASE_URL=https://ropi-aoss-staging.web.app pnpm test:e2e
```

---

**Document Version:** 1.0  
**Last Review:** December 3, 2025  
**Next Review:** January 3, 2026 (monthly)
