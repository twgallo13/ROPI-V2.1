# Daily Delta Reports

This directory contains daily delta audit reports for the 15-day soak period (2025-12-10 to 2025-12-25).

## Purpose

Track attribute drift during the staging soak period to ensure:
- No new high-volume unknown attributes appear
- Existing unknown attributes remain stable
- Schema changes are detected early

## File Format

Each daily delta CSV contains:
- `unknown_key` - Attribute key name
- `prev_count` - Product count from previous day
- `new_count` - Product count from current day
- `delta` - Change in product count
- `top_values` - Most common values
- `sample_skus` - Example product SKUs

## Monitoring Schedule

Daily audits run at 00:00 UTC for 15 days starting 2025-12-11.

## Alert Criteria

Alerts are triggered if:
- New high-volume unknown (>10 products) appears
- Existing unknown increases >20%
- Multiple new unknowns (>3) in single day

## Artifact Locations

- **Repo:** `reports/attribute-inspections/2025-12-10/daily/`
- **GCS:** `gs://ropi-aoss-staging-backups-20251210222705/attribute-audits/2025-12-10/daily/`

---

Generated: 2025-12-10
Homer automation: Active
