# HOMER Operations Log

## [P13.1] materials hook fix — 2025-11-13

- Files: src/hooks/useAttributesSettings.ts
- Summary: added 'materials' to AttributeKey, INITIAL_ATTRIBUTES, and subscribe keys
- PR: #73
- Changes:
  - Added 'materials' to AttributeKey type definition
  - Added 'materials' to INITIAL_ATTRIBUTES initialization
  - Added 'materials' to subscription keys array for real-time updates
- Impact: Settings → Materials CUD operations now work correctly
