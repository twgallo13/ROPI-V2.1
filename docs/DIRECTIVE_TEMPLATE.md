# Directive Template — Lisa → Homer Contract

> **Usage:** Lisa must use this template when instructing Homer.
> Copy and fill in all required fields before issuing a directive.
> Homer must not execute without a complete directive.

---

## Directive

**PhaseName:** `<Human-readable phase name>`

**PhaseSlug:** `<kebab-case-slug>`

**LP:** `LP-<PhaseSlug>-#NNN`

**Version:** `<SemVer e.g. 1.0.0>`

**Date:** `<YYYY-MM-DD>`

---

## Goal

> _One sentence describing the outcome._

---

## Scope

> _Numbered list of what Homer must do (ordered, minimal)._

1. 
2. 
3. 

---

## Explicit Non-Goals

> _What Homer must NOT do in this directive._

- 
- 
- 

---

## Stop Conditions

> _Homer must stop if any of these occur._

- 
- 
- 

---

## Required Outputs

| Output | Description |
|--------|-------------|
| **PR** | PR titled with LP string, targeting `aoss-main` |
| **HES JSON** | Homer Execution Summary in JSON format |
| **VVP** | Visual Verification Protocol (if applicable) |
| **Receipts** | Commit SHAs, CI run IDs, deploy URLs |

---

## Example

```markdown
**PhaseName:** Governance Alignment

**PhaseSlug:** governance-alignment

**LP:** LP-governance-alignment-1.0.0

**Version:** 1.0.0

**Date:** 2026-01-05

---

## Goal

Bring repository into clean alignment with canonical workflow without adding new rules.

## Scope

1. Add canonical workflow declaration to GOVERNANCE.md
2. Add Phase Identity registry (PhaseName, PhaseSlug, LP Prefix)
3. Create directive template (this document)
4. Normalize HES and VVP formats
5. Mark deprecated workflow docs

## Explicit Non-Goals

- No new CI gates
- No new automation
- No Firebase / infra changes
- No workflow expansion

## Stop Conditions

- Any change would require inventing new workflow logic
- Discovery of conflicting authoritative rules

## Required Outputs

| Output | Description |
|--------|-------------|
| PR | "Workflow consolidation — V5.1 alignment" |
| HES JSON | Files changed and outcome |
| VVP | N/A (documentation only) |
| Receipts | Commit SHAs, PR URL |
```
