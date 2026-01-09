# Precondition Verification Needed

The following preconditions must be verified before UI implementation can begin:

## 1. Stable Engine APIs on Staging

**Requirement:** Verify `GET /api/products/{id}/completion` endpoint is available and functional on staging.

**Verification Steps:**
1. Deploy LP-phase2a-001 engine to staging (if not already deployed)
2. Test endpoint with sample product IDs from Phase 2A test vectors
3. Verify response structure matches expected schema
4. Document endpoint behavior and sample responses

**Evidence Location:** `inventory/LP-phase2b-001/evidence/api_verification.txt`

---

## 2. Design Sign-off on UI/UX

**Requirement:** UI/UX approval for CompletionCard, ExportGatePanel, and GlobalModeCard components.

**Components Requiring Approval:**
- **CompletionCard:** Display completion percentage, status badge, segment breakdown
- **ExportGatePanel:** Export button with blocking reasons (when applicable)
- **GlobalModeCard:** "Advanced / site details" toggle for site-specific data

**Design Considerations:**
- Responsive design (mobile, tablet, desktop)
- Error states (API failures, loading states)
- Accessibility (ARIA labels, keyboard navigation, screen reader support)
- Color contrast (WCAG AA compliance)
- i18n support (all text externalized to locale files)

**Evidence Location:** `inventory/LP-phase2b-001/evidence/design_signoff.md`

---

## 3. Feature Flag Configuration

**Requirement:** Feature flag to toggle Phase 2B UI behavior.

**Configuration Details:**
- Flag name: `features.completion.phase2b.enabled`
- Default value: `false` (opt-in)
- Rollout strategy: Preview → Staging → Production
- Rollback time: <5 minutes

**Firebase Config Path:**
```
settings/{tenant}/exportSettings/config
{
  "features": {
    "completion": {
      "phase2b": {
        "enabled": false
      }
    }
  }
}
```

**Evidence Location:** `inventory/LP-phase2b-001/evidence/feature_flag_config.json`

---

## Precondition Status Summary

| Precondition | Status | Owner | Target Date |
|--------------|--------|-------|-------------|
| Engine APIs on staging | ⏳ PENDING | Homer | TBD |
| Design sign-off | ⏳ PENDING | Lisa | TBD |
| Feature flag config | ⏳ PENDING | Homer | TBD |

---

**Once all preconditions are SATISFIED, update HES and begin UI implementation.**
