#!/usr/bin/env bash
set -euo pipefail

# CONFIG
REPO="twgallo13/ROPI-V2.1"
PROJECT="ropi-bccee"
SA_NAME="ropi-deploy-sa"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
GITHUB_ENV="staging"   # GitHub environment where secret should live
GH_SECRET_NAME="GCP_SA_KEY_BASE64"
KEY_FILE="ropi-deploy-sa-key.json"
KEY_B64_FILE="${KEY_FILE}.b64"

# helper
log(){ echo "==> $*"; }

# 0) Ensure gh is installed
if ! command -v gh >/dev/null 2>&1; then
  log "gh CLI not found. Installing..."
  sudo apt-get update
  sudo apt-get install -y curl apt-transport-https ca-certificates gnupg
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y gh
fi
log "gh OK: $(gh --version | head -n1)"

# 1) Ensure gcloud is installed (attempt simple apt install as in CI)
if ! command -v gcloud >/dev/null 2>&1; then
  log "gcloud not found. Installing google-cloud-cli (may require apt repo configured)..."
  sudo apt-get update
  sudo apt-get install -y google-cloud-cli || {
    log "Automatic apt install failed. Please install Cloud SDK manually: https://cloud.google.com/sdk/docs/install"
    exit 2
  }
fi
log "gcloud OK: $(gcloud --version | head -n1)"

# 2) Initialize gcloud (ensure correct project)
log "Checking gcloud project"
CUR_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$CUR_PROJECT" ]; then
  log "No active gcloud project. Setting project to ${PROJECT}"
  gcloud config set project "${PROJECT}"
else
  log "Active gcloud project: ${CUR_PROJECT}"
  if [ "${CUR_PROJECT}" != "${PROJECT}" ]; then
    log "Switching gcloud project to ${PROJECT}"
    gcloud config set project "${PROJECT}"
  fi
fi

# 3) Check if SA exists; create if necessary
EXISTS=$(gcloud iam service-accounts list --filter="email:${SA_EMAIL}" --format="value(email)" || echo "")
if [ -z "$EXISTS" ]; then
  log "Creating service account ${SA_EMAIL}"
  gcloud iam service-accounts create "${SA_NAME}" \
    --project="${PROJECT}" \
    --display-name="ROPI deploy & admin service account"
else
  log "Service account already exists: ${SA_EMAIL}"
fi

# 4) Check roles binding for roles/owner; add if missing
log "Checking roles/owner binding for ${SA_EMAIL}"
OWNER_BINDING=$(gcloud projects get-iam-policy "${PROJECT}" \
  --flatten="bindings[].members" \
  --format='json(bindings)' \
  | jq -r --arg sa "serviceAccount:${SA_EMAIL}" '.[]? | select(.members[]? == $sa) | .role' | grep -Fx "roles/owner" || true)

if [ -z "$OWNER_BINDING" ]; then
  log "Granting roles/owner to ${SA_EMAIL}"
  gcloud projects add-iam-policy-binding "${PROJECT}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/owner"
else
  log "roles/owner already granted to ${SA_EMAIL}"
fi

# 5) Create new JSON key (always create a new key for this run)
if [ -f "${KEY_FILE}" ]; then
  log "Removing local existing key ${KEY_FILE}"
  rm -f "${KEY_FILE}"
fi
log "Creating new service account key and saving to ${KEY_FILE}"
gcloud iam service-accounts keys create "${KEY_FILE}" \
  --iam-account="${SA_EMAIL}" \
  --project="${PROJECT}"

# 6) Base64 encode the key (no newlines)
base64 "${KEY_FILE}" | tr -d '\n' > "${KEY_B64_FILE}"
log "Created base64 key file: ${KEY_B64_FILE}"

# 7) Upload secret to GitHub environment (staging)
# NOTE: requires GH auth and permission to set environment secrets
log "Uploading base64 secret to GitHub environment '${GITHUB_ENV}' as '${GH_SECRET_NAME}'"
gh secret set "${GH_SECRET_NAME}" --env "${GITHUB_ENV}" < "${KEY_B64_FILE}"
log "Secret set."

# 8) Quick verification: gh secret list
log "Verifying GitHub secret presence:"
gh secret list --env "${GITHUB_ENV}" | grep "${GH_SECRET_NAME}" || {
  echo "ERROR: Secret ${GH_SECRET_NAME} not found in environment ${GITHUB_ENV}."
  exit 3
}

# 9) Trigger staging deploy workflow
log "Triggering deploy-staging workflow (manual run). This will use the new secret."
gh workflow run deploy-staging.yml --repo "${REPO}"
log "Triggered deploy workflow. Use 'gh run list --workflow=deploy-staging.yml --repo ${REPO}' to find run ID."

# Print poststeps note
cat <<EOF
SUCCESS: Service account and secret created/updated.
- Service account: ${SA_EMAIL}
- Key file: ${KEY_FILE}
- Uploaded secret: ${GH_SECRET_NAME} in environment ${GITHUB_ENV}
NEXT:
- Monitor the deploy workflow logs; verify gcloud auth activation and firebase deploy steps.
- After deploy finishes, run the verify script (see repo scripts/verify-attributes-meta.js) or inspect Firestore path: settings/attributesMeta.
EOF
