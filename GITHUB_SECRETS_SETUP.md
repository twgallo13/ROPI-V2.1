# GitHub Actions Secrets Setup

To ensure CI/CD deployments work correctly with the Gemini API, you need to add repository secrets.

## Required Secrets

### 1. GEMINI_API_KEY
The API key for Google's Gemini AI service.

**Value:** `AIzaSyAISgrsonzuui3hpeTCxeRpnb1Venq3I1s`

### 2. SEED_TOKEN (Optional)
Token for seeding vocabulary and settings data.

## How to Add Secrets

1. Go to your GitHub repository: <https://github.com/twgallo13/ROPI-V2.1>
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:
   - Name: `GEMINI_API_KEY`
   - Value: `AIzaSyAISgrsonzuui3hpeTCxeRpnb1Venq3I1s`
6. Click **Add secret**

## Verification

After adding the secrets, the next CI deployment will:

- Export `GEMINI_API_KEY` before deploying functions
- Use the real Gemini API instead of mock responses
- Log `GEMINI_KEY_PRESENT true` during deployment

## Workflow Changes

The `.github/workflows/deploy.yml` file has been updated to export the API key:

```yaml
- name: Deploy Hosting + Functions
  env:
    GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  run: |
    export GEMINI_API_KEY="${{ secrets.GEMINI_API_KEY }}"
    firebase deploy --only hosting,functions
```

This ensures CI-triggered deploys don't revert to mock output.
