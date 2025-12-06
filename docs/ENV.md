# Environment Variables & Secrets

This document lists all required environment variables and secrets for ROPI AOSS development and deployment.

---

## Table of Contents

1. [Required Environment Variables](#required-environment-variables)
2. [Local Development (.env.local)](#local-development-envlocal)
3. [GitHub Actions Secrets](#github-actions-secrets)
4. [Service Account Setup](#service-account-setup)
5. [Security Reminders](#security-reminders)

---

## Required Environment Variables

### Firebase Configuration (Frontend)

These variables are used by `@ropi-aoss/web` for Firebase client SDK:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | ✅ Yes |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (e.g., `project.firebaseapp.com`) | ✅ Yes |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID (e.g., `ropi-bccee`) | ✅ Yes |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ Yes |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅ Yes |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | ✅ Yes |

### GCP / Firebase (Backend & Deployment)

| Variable | Description | Required |
|----------|-------------|----------|
| `GCP_SA_KEY_BASE64` | Base64-encoded GCP service account JSON key | ✅ For CI/CD |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCP service account JSON file | ✅ For local |

### Notion Integration (CLI)

| Variable | Description | Required |
|----------|-------------|----------|
| `NOTION_TOKEN` | Notion API integration token | For CLI import |
| `NOTION_PAGE_IDS` | Comma-separated Notion page IDs | For CLI import |

### Optional Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key (for AI-powered endpoints) | Optional |
| `SENTRY_DSN` | Sentry error tracking DSN | Optional |

---

## Local Development (.env.local)

Create a `.env.local` file in `packages/web/` for local development:

```bash
# packages/web/.env.local
# DO NOT COMMIT THIS FILE

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional
VITE_SENTRY_DSN=
```

### For Backend Development

Set the service account credentials:

```bash
# Option 1: Export the path
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"

# Option 2: Add to shell profile (~/.bashrc or ~/.zshrc)
echo 'export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/gcloud/service-account.json"' >> ~/.bashrc
```

### For CLI Development

```bash
# Notion import (if using CLI)
export NOTION_TOKEN="your_notion_integration_token"
export NOTION_PAGE_IDS="page_id_1,page_id_2"
```

---

## GitHub Actions Secrets

### How to Add Secrets to GitHub

1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Enter the secret name and value
5. Click **Add secret**

### Required Secrets for CI/CD

| Secret Name | Description | Where Used |
|-------------|-------------|------------|
| `GCP_SA_KEY_BASE64` | Base64-encoded service account key | `deploy-staging.yml`, `deploy-preview.yml` |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key | `deploy-staging.yml` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `deploy-staging.yml` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `deploy-staging.yml` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `deploy-staging.yml` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | `deploy-staging.yml` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `deploy-staging.yml` |

### Environment-Specific Secrets

Some secrets are configured per environment:

1. Go to **Settings** → **Environments**
2. Select the environment (e.g., `staging`)
3. Click **Add secret**

---

## Service Account Setup

### Creating a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Name it (e.g., `github-actions-deploy`)
6. Grant these roles:
   - `Firebase Hosting Admin`
   - `Cloud Functions Developer`
   - `Firestore User` (if needed)
   - `Service Account User`
7. Click **Done**

### Generating the Key

1. Click on the service account
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON**
5. Download the key file

### Encoding for GitHub Actions

```bash
# Encode the key to base64
base64 -i path/to/your-key.json | tr -d '\n'

# Copy the output and add it as GCP_SA_KEY_BASE64 secret
```

### Minimum Required Permissions

For deployment, the service account needs:

| Role | Purpose |
|------|---------|
| `roles/firebasehosting.admin` | Deploy to Firebase Hosting |
| `roles/cloudfunctions.developer` | Deploy Cloud Functions |
| `roles/iam.serviceAccountUser` | Act as service account |
| `roles/storage.objectAdmin` | Upload build artifacts |

---

## Security Reminders

### ⚠️ NEVER Commit Secrets

- Add `.env.local` to `.gitignore`
- Never commit JSON key files
- Never paste secrets in code or comments
- Never log secrets in CI/CD output

### Check for Accidental Commits

```bash
# Search for potential secrets in git history
git log -p | grep -i "api_key\|secret\|password\|token" | head -20
```

### Rotate Secrets Regularly

- Rotate service account keys every 90 days
- Update GitHub secrets when keys are rotated
- Revoke old keys immediately after rotation

### Use Environment-Specific Secrets

- Don't use production secrets in development
- Use separate Firebase projects for staging/production
- Keep staging and production secrets separate

---

## Troubleshooting

### "GOOGLE_APPLICATION_CREDENTIALS not set"

```bash
# Verify the variable is set
echo $GOOGLE_APPLICATION_CREDENTIALS

# Verify the file exists
ls -la $GOOGLE_APPLICATION_CREDENTIALS
```

### "VITE_FIREBASE_API_KEY is empty" in CI

1. Go to GitHub → Settings → Secrets
2. Verify the secret exists and is not empty
3. Check the workflow file references the correct secret name

### Firebase Authentication Errors

```bash
# Test authentication locally
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
gcloud auth list
```

---

## Quick Setup Checklist

### Local Development

- [ ] Create `packages/web/.env.local` with Firebase config
- [ ] Download service account key JSON
- [ ] Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- [ ] Verify with `pnpm --filter @ropi-aoss/api serve`

### GitHub Actions

- [ ] Add `GCP_SA_KEY_BASE64` secret (base64-encoded key)
- [ ] Add all `VITE_FIREBASE_*` secrets
- [ ] Verify secrets are in correct environment (staging)
- [ ] Test with a PR to trigger `deploy-preview.yml`
