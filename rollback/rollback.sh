#!/bin/bash
#
# Emergency Rollback Script for ROPI AOSS
# 
# Usage:
#   ./rollback/rollback.sh [target]
#
# Arguments:
#   target: 'hosting' | 'rules' | 'all' (default: hosting)
#
# Examples:
#   ./rollback/rollback.sh               # Rollback hosting only
#   ./rollback/rollback.sh hosting       # Rollback hosting
#   ./rollback/rollback.sh rules         # Rollback Firestore rules
#   ./rollback/rollback.sh all           # Rollback everything
#
# Requirements:
#   - Firebase CLI installed
#   - Authenticated with Firebase (firebase login)
#   - Git repository with history
#

set -euo pipefail

# Configuration
PROJECT="ropi-bccee"
TARGET="${1:-hosting}"
PRODUCTION_TARGET="aoss-production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

confirm() {
  read -p "$(echo -e ${YELLOW}[CONFIRM]${NC}) $1 (y/N): " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

# Rollback hosting
rollback_hosting() {
  info "Rolling back Firebase Hosting..."
  
  # Show current version
  info "Current hosting versions:"
  firebase hosting:channel:list --project "$PROJECT" 2>/dev/null || true
  
  if ! confirm "Proceed with hosting rollback?"; then
    warn "Hosting rollback cancelled"
    return 1
  fi
  
  # Perform rollback
  firebase hosting:rollback --project "$PROJECT" --target "$PRODUCTION_TARGET"
  
  if [ $? -eq 0 ]; then
    info "✅ Hosting rolled back successfully"
    info "Production URL: https://ropi-aoss.web.app"
    info "Verify deployment: curl -I https://ropi-aoss.web.app"
  else
    error "❌ Hosting rollback failed"
    return 1
  fi
}

# Rollback Firestore rules
rollback_rules() {
  info "Rolling back Firestore rules..."
  
  # Check if firestore.rules exists
  if [ ! -f "firestore.rules" ]; then
    error "firestore.rules not found in current directory"
    return 1
  fi
  
  # Show current rules diff
  info "Current Firestore rules:"
  head -n 20 firestore.rules
  
  if ! confirm "Revert firestore.rules to previous commit and deploy?"; then
    warn "Firestore rules rollback cancelled"
    return 1
  fi
  
  # Backup current rules
  cp firestore.rules firestore.rules.backup
  info "Current rules backed up to firestore.rules.backup"
  
  # Revert to previous commit
  git checkout HEAD~1 -- firestore.rules
  
  if [ $? -ne 0 ]; then
    error "Failed to checkout previous firestore.rules"
    mv firestore.rules.backup firestore.rules
    return 1
  fi
  
  # Deploy previous rules
  firebase deploy --only firestore:rules --project "$PROJECT"
  
  if [ $? -eq 0 ]; then
    info "✅ Firestore rules rolled back successfully"
    info "Verify in Firebase Console: https://console.firebase.google.com/project/$PROJECT/firestore/rules"
  else
    error "❌ Firestore rules deployment failed"
    error "Restoring current rules from backup"
    mv firestore.rules.backup firestore.rules
    return 1
  fi
  
  # Clean up backup
  rm -f firestore.rules.backup
}

# Main script
main() {
  info "🚨 ROPI AOSS Emergency Rollback Script"
  info "Project: $PROJECT"
  info "Target: $TARGET"
  echo ""
  
  # Check if firebase CLI is available
  if ! command -v firebase &> /dev/null; then
    error "Firebase CLI not found. Install: npm install -g firebase-tools"
    exit 1
  fi
  
  # Check if authenticated
  if ! firebase projects:list &> /dev/null; then
    error "Not authenticated with Firebase. Run: firebase login"
    exit 1
  fi
  
  case "$TARGET" in
    hosting)
      rollback_hosting
      ;;
    rules)
      rollback_rules
      ;;
    all)
      rollback_hosting
      rollback_rules
      ;;
    *)
      error "Invalid target: $TARGET"
      error "Valid targets: hosting, rules, all"
      exit 1
      ;;
  esac
  
  info ""
  info "✅ Rollback complete!"
  info ""
  info "Next steps:"
  info "1. Verify application is working: https://ropi-aoss.web.app"
  info "2. Check Sentry for errors: https://sentry.io"
  info "3. Investigate root cause in staging"
  info "4. Prepare hotfix PR with fix"
  info "5. Document incident in Build Log (Notion)"
}

# Run main function
main
