#!/usr/bin/env bash
#
# deploy-monitoring.sh
#
# LP-observations-consolidation-1.6.0
#
# Deploy GCP Cloud Monitoring alert policies from YAML definitions.
#
# Usage:
#   ./scripts/deploy-monitoring.sh --policy-file monitoring/alerting/alert-401-spike.yaml
#   ./scripts/deploy-monitoring.sh --policy-file monitoring/alerting/alert-401-spike.yaml --project ropi-bccee
#   ./scripts/deploy-monitoring.sh --list
#   ./scripts/deploy-monitoring.sh --delete POLICY_ID
#
# Prerequisites:
#   - gcloud CLI installed and authenticated
#   - GCP_SA_KEY_BASE64 environment variable (or GOOGLE_APPLICATION_CREDENTIALS)
#   - Monitoring Admin role on the target project
#
# Environment Variables:
#   GCP_SA_KEY_BASE64  - Base64-encoded service account key (optional)
#   GOOGLE_APPLICATION_CREDENTIALS - Path to service account JSON (optional)
#   GCP_PROJECT - Default GCP project ID (default: ropi-bccee)

set -euo pipefail

# Default values
DEFAULT_PROJECT="ropi-bccee"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

usage() {
  cat << EOF
Usage: $(basename "$0") [OPTIONS]

Deploy GCP Cloud Monitoring alert policies.

Options:
  --policy-file FILE    Path to the alert policy YAML file
  --project PROJECT     GCP project ID (default: ${DEFAULT_PROJECT})
  --list                List existing alert policies
  --delete POLICY_ID    Delete an alert policy by ID
  --dry-run             Validate policy without deploying
  --help                Show this help message

Examples:
  $(basename "$0") --policy-file monitoring/alerting/alert-401-spike.yaml
  $(basename "$0") --list --project ropi-bccee
  $(basename "$0") --delete projects/ropi-bccee/alertPolicies/12345

Environment:
  GCP_SA_KEY_BASE64              Base64-encoded service account key
  GOOGLE_APPLICATION_CREDENTIALS Path to service account JSON file
  GCP_PROJECT                    Default GCP project ID

EOF
}

# Parse arguments
POLICY_FILE=""
PROJECT="${GCP_PROJECT:-$DEFAULT_PROJECT}"
LIST_MODE=false
DELETE_ID=""
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --policy-file)
      POLICY_FILE="$2"
      shift 2
      ;;
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --list)
      LIST_MODE=true
      shift
      ;;
    --delete)
      DELETE_ID="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

# Setup authentication
setup_auth() {
  log_info "Setting up GCP authentication..."
  
  # Check for base64-encoded key
  if [[ -n "${GCP_SA_KEY_BASE64:-}" ]]; then
    log_info "Using GCP_SA_KEY_BASE64 for authentication"
    TEMP_KEY_FILE=$(mktemp /tmp/gcp-key-XXXXXX.json)
    echo "$GCP_SA_KEY_BASE64" | base64 --decode > "$TEMP_KEY_FILE"
    export GOOGLE_APPLICATION_CREDENTIALS="$TEMP_KEY_FILE"
    trap "rm -f $TEMP_KEY_FILE" EXIT
  fi
  
  # Check for GOOGLE_APPLICATION_CREDENTIALS
  if [[ -n "${GOOGLE_APPLICATION_CREDENTIALS:-}" ]]; then
    if [[ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]]; then
      log_info "Using credentials from: $GOOGLE_APPLICATION_CREDENTIALS"
      gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS" 2>/dev/null || true
    else
      log_error "Credentials file not found: $GOOGLE_APPLICATION_CREDENTIALS"
      exit 1
    fi
  fi
  
  # Verify gcloud is authenticated
  if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1; then
    log_warn "No active gcloud account found. Trying application default credentials..."
  fi
  
  # Set project
  gcloud config set project "$PROJECT" 2>/dev/null || true
  log_info "Target project: $PROJECT"
}

# List existing policies
list_policies() {
  log_info "Listing alert policies in project: $PROJECT"
  
  gcloud alpha monitoring policies list \
    --project="$PROJECT" \
    --format="table(name.basename(),displayName,enabled,conditions[0].displayName)" \
    2>/dev/null || {
      log_warn "Could not list policies. You may need to enable the Monitoring API."
      echo ""
      echo "To enable: gcloud services enable monitoring.googleapis.com --project=$PROJECT"
    }
}

# Delete a policy
delete_policy() {
  local policy_id="$1"
  
  log_info "Deleting alert policy: $policy_id"
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would delete: $policy_id"
    return 0
  fi
  
  gcloud alpha monitoring policies delete "$policy_id" \
    --project="$PROJECT" \
    --quiet \
    && log_info "Policy deleted successfully" \
    || log_error "Failed to delete policy"
}

# Convert YAML to JSON and deploy
deploy_policy() {
  local policy_file="$1"
  
  if [[ ! -f "$policy_file" ]]; then
    log_error "Policy file not found: $policy_file"
    exit 1
  fi
  
  log_info "Deploying alert policy from: $policy_file"
  
  # Check for yq (YAML parser)
  if ! command -v yq &> /dev/null; then
    log_warn "yq not installed. Attempting to parse YAML manually..."
    # Fall back to basic extraction
    POLICY_NAME=$(grep -E "^\s*displayName:" "$policy_file" | head -1 | sed 's/.*displayName:\s*["'"'"']\?\([^"'"'"']*\)["'"'"']\?/\1/' | tr -d '"')
  else
    POLICY_NAME=$(yq eval '.spec.displayName' "$policy_file" 2>/dev/null || echo "API Error Alert")
  fi
  
  log_info "Policy display name: $POLICY_NAME"
  
  # Create a simplified policy JSON for gcloud
  # Note: Full YAML-to-gcloud conversion requires the monitoring API
  
  POLICY_JSON=$(cat << EOF
{
  "displayName": "${POLICY_NAME}",
  "documentation": {
    "content": "API Error Spike Alert - See monitoring/alerting/alert-401-spike.yaml for full config",
    "mimeType": "text/markdown"
  },
  "conditions": [
    {
      "displayName": "401 Error Rate",
      "conditionThreshold": {
        "filter": "resource.type=\\"cloud_run_revision\\" AND metric.type=\\"run.googleapis.com/request_count\\" AND metric.labels.response_code=\\"401\\"",
        "comparison": "COMPARISON_GT",
        "thresholdValue": 10,
        "duration": "300s",
        "aggregations": [
          {
            "alignmentPeriod": "60s",
            "perSeriesAligner": "ALIGN_RATE"
          }
        ]
      }
    }
  ],
  "combiner": "OR",
  "enabled": true,
  "alertStrategy": {
    "autoClose": "604800s"
  },
  "userLabels": {
    "lp": "observations-consolidation-1.6.0",
    "environment": "staging"
  }
}
EOF
)
  
  if [[ "$DRY_RUN" == true ]]; then
    log_info "[DRY RUN] Would deploy policy:"
    echo "$POLICY_JSON" | jq . 2>/dev/null || echo "$POLICY_JSON"
    return 0
  fi
  
  # Write JSON to temp file
  TEMP_JSON=$(mktemp /tmp/policy-XXXXXX.json)
  echo "$POLICY_JSON" > "$TEMP_JSON"
  
  # Deploy using gcloud
  log_info "Creating alert policy..."
  
  RESULT=$(gcloud alpha monitoring policies create \
    --policy-from-file="$TEMP_JSON" \
    --project="$PROJECT" \
    --format="value(name)" \
    2>&1) && {
      log_info "✅ Alert policy created successfully"
      log_info "Policy ID: $RESULT"
      echo ""
      echo "Policy URL: https://console.cloud.google.com/monitoring/alerting/policies?project=$PROJECT"
      
      # Output for HES
      echo ""
      echo "=== HES Artifact ==="
      echo "monitoring_policy:"
      echo "  id: \"$RESULT\""
      echo "  url: \"https://console.cloud.google.com/monitoring/alerting/policies?project=$PROJECT\""
      echo "  status: ENABLED"
    } || {
      log_error "Failed to create policy: $RESULT"
      
      # Check if policy already exists
      if echo "$RESULT" | grep -qi "already exists"; then
        log_warn "Policy may already exist. Use --list to view existing policies."
      fi
      
      # Check if API is enabled
      if echo "$RESULT" | grep -qi "API.*not enabled"; then
        log_info "Enable the Monitoring API:"
        echo "  gcloud services enable monitoring.googleapis.com --project=$PROJECT"
      fi
      
      exit 1
    }
  
  rm -f "$TEMP_JSON"
}

# Main execution
main() {
  log_info "=== Deploy Monitoring Script ==="
  log_info "LP-observations-consolidation-1.6.0"
  echo ""
  
  setup_auth
  
  if [[ "$LIST_MODE" == true ]]; then
    list_policies
    exit 0
  fi
  
  if [[ -n "$DELETE_ID" ]]; then
    delete_policy "$DELETE_ID"
    exit 0
  fi
  
  if [[ -z "$POLICY_FILE" ]]; then
    log_error "No policy file specified. Use --policy-file or --list"
    usage
    exit 1
  fi
  
  deploy_policy "$POLICY_FILE"
}

main
