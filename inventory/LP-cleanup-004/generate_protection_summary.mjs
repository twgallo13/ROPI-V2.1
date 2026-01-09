#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const protectionData = JSON.parse(readFileSync('./evidence/branch_protection_manual.json', 'utf8'));
const classification = JSON.parse(readFileSync('./branch_classification.json', 'utf8'));

// Generate branch protection summary
const summary = {
  summary_version: "1.0",
  generated_at: new Date().toISOString(),
  source: "Manual export via gh api (Option 2)",
  total_branches_analyzed: classification.length,
  protection_data_source: "./evidence/branch_protection_manual.json",
  
  protection_overview: {
    total_protected_branches: protectionData.filter(p => !p.error).length,
    protected_with_errors: protectionData.filter(p => p.error).length,
    branches_marked_protected: protectionData.length,
    branches_with_readable_rules: protectionData.filter(p => !p.error).length
  },
  
  protected_branches: protectionData.map(p => ({
    branch: p.branch,
    has_protection_rules: !p.error,
    error: p.error || null,
    required_status_checks: p.required_status_checks || null,
    enforce_admins: p.enforce_admins || null,
    required_pull_request_reviews: p.required_pull_request_reviews || null,
    restrictions: p.restrictions || null,
    allow_force_pushes: p.allow_force_pushes || null,
    allow_deletions: p.allow_deletions || null
  })),
  
  classification_impact: {
    branches_classified_protected: classification.filter(c => c.classification === 'PROTECTED').length,
    branches_with_unknown_protection: classification.filter(c => c.protection_status === 'unknown').length,
    branches_confirmed_not_protected: classification.filter(c => c.protection_status === 'not_protected').length
  },
  
  api_access_status: {
    can_read_branch_list: true,
    can_read_protection_rules: false,
    error_encountered: "permission_or_not_protected",
    workaround_applied: "Manual export with fallback error handling"
  },
  
  notes: [
    "Token cannot read branch protection rules (HTTP 403)",
    "All protected branches show 'permission_or_not_protected' error",
    "Branch protection status inferred from branch list API",
    "Delete candidates exclude all branches marked as protected",
    "Manual verification recommended before any deletion"
  ]
};

writeFileSync('./branch_protection_summary.json', JSON.stringify(summary, null, 2));
console.log('✅ Generated branch_protection_summary.json');
