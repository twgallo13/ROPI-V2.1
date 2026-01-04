# 📋 Homer Execution Authorization

**LP Identifier:** LP-completion-model-export-gate-1.0.0  
**Phase:** Completion Model → Export Gate  
**Issued By:** Lisa (Planner + Enforcer)  
**Issued To:** Homer (Executor)  
**Timestamp:** 2026-01-03T00:00:00Z  
**Status:** ✅ **ACTIVE**

---

## Authorization Scope

Homer is **authorized** to execute the following work **strictly per the Execution Plan**:

[**LP-completion-model-export-gate-1.0.0_EXECUTION_PLAN.md**](./LP-completion-model-export-gate-1.0.0_EXECUTION_PLAN.md)

---

## Execution Units (Authorized Work)

| Unit # | Unit Name | Status | PR | HES |
|--------|-----------|--------|-----|-----|
| **1** | Settings Persistence + Versioning | 🟡 Ready | — | — |
| **2** | Completion Evaluation Engine | 🔒 Blocked | — | — |
| **3** | Settings UI (Completion Rules) | 🔒 Blocked | — | — |
| **4** | Export Gate Enforcement | 🔒 Blocked | — | — |
| **5** | Product Blocking Explanations | 🔒 Blocked | — | — |
| **6** | VVP + Phase Close Verification | 🔒 Blocked | — | — |

**Execution Mode:** Sequential (Unit N must close before Unit N+1 begins)

---

## Binding Constraints

### 1. Work Authorization

- Homer may **only** execute work within Units 1–6 as defined in the Execution Plan
- Any work outside this scope requires **explicit Lisa authorization**
- No exploration, refactoring, or optimization unless explicitly in scope

### 2. PR Discipline

- **One PR per execution unit** (atomic, reviewable)
- PR title format: `LP-completion-model-export-gate-1.0.0 — Unit N: [Unit Name]`
- PR description must reference:
  - Execution Plan
  - Unit deliverables
  - Acceptance criteria
- HES (Homer Execution Summary) must be created per PR

### 3. Invariant Enforcement

Homer must **halt execution** if any invariant is violated:

- Completion is not the only export gate
- Media/pricing affects completion or export
- Hard-coded readiness logic exists
- UI control has no effect
- Backend logic is not UI-visible
- Site-aware descriptions do not block

**Halt means:** Stop work, document the violation, escalate to Lisa.

### 4. Ambiguity Handling

If requirements are unclear or conflicting:

- **Do not guess or infer**
- **Do not proceed**
- Document the ambiguity
- Escalate to Lisa for clarification

### 5. CI + Testing

- All PRs must pass CI before merge
- Unit tests required for:
  - Completion evaluation logic
  - Settings validation
  - Export gate enforcement
- VVP checks must have evidence (screenshots, logs, test results)

### 6. Documentation

- Update relevant docs per unit
- Create HES per PR
- Archive completed units in execution plan

---

## Execution Workflow (Per Unit)

```
1. Homer reads Unit N deliverables + acceptance criteria
2. Homer implements deliverables
3. Homer creates PR with HES
4. CI passes
5. Lisa reviews PR
6. PR merged
7. Unit N marked complete in execution plan
8. Unit N+1 unlocked
```

---

## Communication Protocol

### Homer → Lisa

- **PR opened:** Notify Lisa with link + summary
- **Blocker encountered:** Halt, document, escalate
- **Unit complete:** Update execution plan, request review
- **Ambiguity found:** Escalate immediately

### Lisa → Homer

- **Clarification provided:** Update execution plan, resume
- **PR approved:** Merge, unlock next unit
- **Invariant violation detected:** Halt, remediate
- **Scope change:** Re-version execution plan, re-authorize

---

## Reporting Requirements

### Per PR

- HES document (Homer Execution Summary)
- Files changed (with purpose)
- Tests added/modified
- CI status
- Acceptance criteria met (checklist)

### Per Unit

- Execution plan updated (status, PR link, HES link)
- VVP checks executed (where applicable)
- Evidence attached (screenshots, logs)

### Phase Close

- All 6 units complete
- VVP passed with evidence
- Phase archive created
- Final HES with artifacts

---

## Homer's Mandate (Explicit)

**You are authorized to:**

- Implement features per execution plan
- Write code, tests, and documentation
- Create PRs and HES documents
- Execute VVP checks with evidence
- Update execution plan status

**You are NOT authorized to:**

- Work outside Units 1–6 without approval
- Bypass invariants or validation
- Guess or infer ambiguous requirements
- Merge PRs without CI passing
- Change scope without Lisa authorization

---

## Immediate Next Action

**Homer:** Begin **Unit 1: Settings Persistence + Versioning**

**Deliverables:**

- Schema design (`CompletionRulesConfig`)
- Firestore structure (`settings/exportSettings/...`)
- Validation logic (weights sum to 100, valid enums, etc.)
- Versioning (monotonic `rulesVersion`, snapshots, audit)

**Acceptance:**

- Settings can be written, read, versioned
- Validation blocks invalid configs
- Audit trail exists

**PR Title:** `LP-completion-model-export-gate-1.0.0 — Unit 1: Settings Persistence + Versioning`

---

**Authorization Status:** ✅ **ACTIVE**  
**Homer Status:** 🟢 **READY TO EXECUTE**  
**Phase Gate:** 🟢 **OPEN**

---

_This authorization is binding. Homer must comply with all constraints and workflows. Violations halt execution. Lisa monitors and enforces._
