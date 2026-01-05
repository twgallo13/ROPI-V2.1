# Phase Index

> **Registry of Phases and LP Identifiers**
>
> This is a passive registry — it records phase identity but does NOT enforce new phases or states.
> For workflow rules, see [`GOVERNANCE.md`](./GOVERNANCE.md).

---

## Phase Identity Schema

| Field | Description | Example |
|-------|-------------|---------|
| **PhaseName** | Human-readable name | "Governance Alignment" |
| **PhaseSlug** | Kebab-case identifier | `governance-alignment` |
| **LP Prefix** | LP naming prefix | `LP-governance-alignment-` |

---

## Active Phases

### governance-alignment
- **PhaseName:** Governance Alignment
- **PhaseSlug:** `governance-alignment`
- **LP Prefix:** `LP-governance-alignment-`
- **Description:** Repository workflow consolidation and V5.1 alignment
- **LPs:**
  - `LP-governance-alignment-1.0.0` → PR: #443 → Status: in-progress

---

## Completed Phases

### service-account-ropi-deploy
- **PhaseName:** Service Account Deploy
- **PhaseSlug:** `service-account-ropi-deploy`
- **LP Prefix:** `LP-service-account-ropi-deploy-`

### obs-studio-cleanup
- **PhaseName:** Observations Studio Cleanup
- **PhaseSlug:** `obs-studio-cleanup`
- **LP Prefix:** `LP-obs-studio-cleanup-`

---

## Phase Template

```markdown
### <PhaseSlug>
- **PhaseName:** <Human Readable Name>
- **PhaseSlug:** `<kebab-case-slug>`
- **LP Prefix:** `LP-<PhaseSlug>-`
- **Description:** <one-line description>
- **LPs:**
  - `LP-<PhaseSlug>-#NNN` → PR: #<number> → Status: <open/merged/closed>
- **Evidence:**
  - HES: `<path or link>`
```
