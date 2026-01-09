# Phase 2B — Design Signoff

LP: LP-phase2b-001
Feature: Completion UI & Export Gate
Signer: Lisa
Date: 2026-01-09
Decision: Approved

## Links
- Figma (master prototype): https://www.figma.com/file/XXXXXXXX/Completion-Export-Gate
- Thumbnails:
  - CompletionCard-desktop: inventory/LP-phase2b-001/evidence/screens/CompletionCard-desktop.png
  - CompletionCard-mobile:  inventory/LP-phase2b-001/evidence/screens/CompletionCard-mobile.png
  - ExportGatePanel-desktop: inventory/LP-phase2b-001/evidence/screens/ExportGatePanel-desktop.png
  - GlobalModeCard-desktop: inventory/LP-phase2b-001/evidence/screens/GlobalModeCard-desktop.png
(If thumbnails are missing, Homer: export 2 PNGs for each component into the path above.)

## Overview / Acceptance Guidance (non-dev)
- **CompletionCard** must show `completionPct`, `status` (ready/partial/blocked), and a short list of `blockingReasons`. Visual state must update to match the engine response on every load and re-check.
- **ExportGatePanel** must:
  - Show an actionable Export button when `status == "ready"`.
  - Disable Export when `status == "partial"` or `status == "blocked"`, and show the `blockingReasons` prominently (no truncation that hides meaning).
  - Provide an explanation tooltip/aria description for each blocking reason.
- **GlobalModeCard** toggles site details and must display site-level readiness and an admin link to the export rules.

## Interaction Notes
- Keyboard: tab order must reach all actionable controls; Enter triggers primary actions; Escape closes overlays.
- Focus management: after Export click, focus moves to confirmation dialog; after dialog dismiss, focus returns to Export button.
- Loading states: show skeleton placeholder for CompletionCard until API returns; display an inline spinner on Export button while export request is pending.
- Error states: network errors show user-friendly message with retry; do not hide blocking reasons.
- Accessibility: ARIA role `status` for the blockingReasons; `aria-disabled` for disabled Export; visible focus indicators.

## i18n
- All strings must be keys in `i18n/en.json` (placeholders included). Example keys:
  - `completionCard.status.ready`
  - `exportGate.button.export`
  - `exportGate.reason.missingAttributes`

## Accessibility Checklist
- Color contrast ≥ 4.5:1 for main text; 3:1 for large text.
- All interactive elements reachable by keyboard.
- Proper ARIA labels for dynamic content (status updates must be announced).

## Admin UI
- `pages/admin/completion-rules` must show:
  - `rulesVersion` (timestamp and author)
  - human-readable rule names and thresholds
  - last modified timestamp
- This page is read-only for Phase 2B and must not include hidden toggles.

## Signoff
I have reviewed the mockups, interaction notes, accessibility checklist, and i18n placeholders. The design is **Approved** for Phase 2B implementation under the binding quality bar.

Signer: Lisa  
Date: 2026-01-09  
Decision: Approved
