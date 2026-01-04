## LP-completion-admin-rules-ui-1.3.0 — Draft Plan and Audit

### Scope
- Build admin UI for completion rules editing per COMPLETION_RULES_UI_SPEC.md.
- Wire to existing Firestore-backed completion rules document (no backend semantics changes).
- Enforce spec-driven validation and UX (client-side pre-save; backend errors surfaced).
- Keep all merges blocked behind PR #433, PR #434, and PR #435.

### Constraints
- No schema changes and no new defaults; must load live Firestore config.
- No rule semantics invention; UI reflects backend validation exactly.
- Locked docs remain unchanged; follow COMPLETION_RULES_UI_SPEC.md literally.
- Saves must remain atomic; no partial updates.

### Current UI vs Spec Audit
Findings reference existing implementation in packages/web/src/pages/settings/ExportSettingsPage.tsx.

1) Missing fields
- No appliesTo.mode control (ALL_PRODUCTS vs CONDITIONAL); sites always shown.
- Attribute selector lacks categories, requirementFlag, includeInternalOnly, excludeAttributeIds, staticAttributeIds fields and conditional visibility for REGISTRY vs STATIC.
- No include of attributeSelector.source-specific validation hints.

2) Validation gaps
- Client validation only checks sites, weights, threshold, enabled segments; it does not gate on appliesTo.mode, source-specific required fields, or tolerate live validation (save disabled only after manual validate).
- Save button can be enabled while invalid until user clicks Save; spec requires real-time disable when errors exist.

3) UX gaps vs spec
- Site selection warning shown even when segment should apply to all products; spec requires sites only when mode=CONDITIONAL and hide otherwise.
- Weight distribution bars do not label disabled segments with “(disabled)” visual per spec (text partially present, styling may not gray out consistently).
- No explicit “Save changes affects live export immediately” reminder near actions (only at top).
- No loading “Retry” icon/controls matching spec styling (functional but not aligned).

4) Data handling risks
- Frontend increments rulesVersion and sets updatedAt/updatedBy client-side; spec says backend owns these. Need to ensure UI submits payload without mutating server-managed fields or clearly defers to backend increment if API is adjusted.
- builtInSegments and exclusions are passed through but not guarded; removal risk if form omits them.

### Required Components/Pages
- ExportSettingsPage (existing) enhancements: segment editor, validation, save flow, state handling.
- Possible shared form subcomponents if needed (SegmentEditor, AttributeSelector inputs).
- Stylesheet updates in packages/web/src/pages/settings/ExportSettingsPage.css per spec visuals.

### Validation Flows (target)
- Client: validate on every edit; display alert; disable Save when errors exist. Rules: at least one segment enabled; enabled weights sum to 100% (±0.1); threshold 0-100; if mode=CONDITIONAL and enabled then at least one site; REGISTRY requires categories + requirementFlag; STATIC requires staticAttributeIds; source present; appliesTo.mode present.
- Server: preserve existing validation (stricter weight tolerance, selector checks); surface error text in red alert without losing edits.

### Save/Versioning Behavior
- Preserve builtInSegments and exclusions untouched.
- Submit full config; do not auto-increment rulesVersion client-side if backend handles it (confirm endpoint contract before change).
- Success toast per spec, auto-dismiss ~3s; errors persist until corrected.

### Test Expectations
- Unit/component tests: validation for modes, site requirement, source-specific fields, weight sum; Save disabled when invalid; errors clear on edit.
- Integration/API client tests: happy path save, backend error surfacing, version/metadata handled server-side.

### Merge Block Notes
- All PRs for LP-1.3.0 remain merge-blocked until PR #433, PR #434, and PR #435 are merged.