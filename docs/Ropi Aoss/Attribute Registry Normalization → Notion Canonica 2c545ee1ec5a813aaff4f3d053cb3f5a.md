# Attribute Registry Normalization → Notion Canonical (snake_case) — Release v0.6.2 / Registry v1.0.1

# Release Summary

Normalized the ROPI attribute registry to the Notion canonical registry (snake_case). Added `shoe_width`, standardized `made_in` (synonym: `country_of_origin`), added `tax_class` (export-required), removed mock attributes, and hardened E2E workflow fallback to staging URL to prevent preview-channel quota failures.

# Release Summary

Normalized the ROPI attribute registry to the Notion canonical registry (snake_case). Added `shoe_width`, standardized `made_in` (synonym: `country_of_origin`), added `tax_class` (export-required), removed mock attributes, and hardened E2E workflow fallback to staging URL to prevent preview-channel quota failures.

## Release Information

- Date: **2025-12-10**
- Release Version: **`v0.6.2`**
- Registry Version: **`v1.0.1`**
- Status: **Released / Merged**
- Merge Commit: `6ab828e7d3b79333bf7442af821b12f8483dcced`

## Validation Results

- Normalization: **PASS** (94 products, 0 errors)
- E2E Tests: **PASS** (staging fallback solved preview quota failures)
- Import/Export Validators: **WARN** (scripts not present; non-blocking)