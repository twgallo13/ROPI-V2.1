# GitHub Actions Secrets Setup

To ensure CI/CD deployments work correctly with the Gemini API and Firebase, add the required repository or environment secrets — DO NOT place real keys in repo files.

## Required Secrets
1. GEMINI_API_KEY
   - The API key for Google's Gemini AI service.
   - **Action:** Create/rotate a Gemini API key in the Google Cloud console and add it to:
     - Repository: Settings → Secrets and variables → Actions
     - or Environment: Settings → Environments → PRODUCTION → Add secret
   - Name the secret exactly: `GEMINI_API_KEY`

2. (Optional) SEED_TOKEN
   - Token for seeding vocabulary and settings data (if used).

## How to Add Secrets
1. Go to your GitHub repository: `https://github.com/<owner>/<repo>`
2. Click Settings → Secrets and variables → Actions (or Environments → PRODUCTION).
3. Click New repository secret (or Add secret in PRODUCTION).
4. Add each secret by name (e.g., `GEMINI_API_KEY`) and paste the key value.
5. Click Add secret.

## Verification
After adding the secret(s), run the deploy workflow. The workflow will reference secrets like `secrets.GEMINI_API_KEY` during deploy.

**Important:** If a secret was accidentally committed to the repository, consider it compromised — rotate the key immediately and follow the purge guide (see SECURITY/PURGE_GUIDE.md).
