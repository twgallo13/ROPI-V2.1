Purpose

This file is the mandatory entry contract for any AI or cold-start chat operating in the ROPI AOSS repository.

Its sole purpose is to:

Prevent cross-project or random context searching

Enforce repo-first execution

Align all agents to the phase-based workflow

Enable autonomous execution within a phase

If any rule below cannot be followed, STOP immediately.

Canonical Repository Description

ROPI AOSS — Admin Order & Staging System

Monorepo structure:

packages/cli

packages/sdk

packages/api

packages/web

The canonical product attribute registry is:

packages/sdk/config/attributeRegistry.json


This JSON is the source of truth and syncs to Firestore at:

settings/attributes/keys/{attributeId}

Source-of-Truth Hierarchy (Strict)
Canonical (Authoritative)

GitHub Repository

https://github.com/twgallo13/ROPI-V2.1


Required documents:

README.md — Orientation

GOVERNANCE.md — Workflow, authority, enforcement (authoritative)

docs/DEPLOYMENT.md — Deployment runbook

docs/ATTRIBUTE-REGISTRY.md — Registry semantics

packages/sdk/config/attributeRegistry.json — Canonical registry

Human-Readable Mirror (Non-Authoritative)

Notion — Prompt: Start Phase Workflow V5.1 — Consolidation & Verification

https://www.notion.so/Prompt-Start-Phase-Workflow-V5-1-Consolidation-Verification-2df45ee1ec5a806bbec8ddd52baf6a58


Notion mirrors repo intent.

If Notion and repo diverge, the repo always wins.

Notion must never override or invent rules.

Forbidden Sources (Unless Explicitly Authorized)

Google Drive

Other GitHub repositories

Other projects

Prior chats

Memory or “similar systems”

If another source appears required:
→ STOP
→ Name the exact source
→ Wait for authorization

Phase Model (Non-Versioned)

A Phase is a bounded execution container.

A phase starts once and ends once.

Phases are NOT versioned.

Identifiers:

PhaseName — descriptive, human-readable

PhaseSlug — stable kebab-case identifier

All work (fixes, retries, verification, follow-ups) lives inside the same phase until closure.

LP (Lisa Protocol) Model — Sequential

LPs are the only authorization mechanism for work.

Format

LP-<PhaseSlug>-001
LP-<PhaseSlug>-002
LP-<PhaseSlug>-003


Rules:

Numeric and sequential

Never reset while the phase is open

SemVer (1.0.0, v1, etc.) is forbidden inside phases

LP number scopes all prompts, PRs, and HES artifacts

Roles & Authority (Hard Boundaries)
Lisa — Phase Owner / Orchestrator

Owns phase scope and sequencing

Issues LPs

Coordinates work autonomously with Homer

Does not execute code

Does not merge PRs

Does not advance HES states

Homer — Executor

Executes LPs exactly as written

Opens PRs

Runs CI

Uses Firebase, GitHub, Cloud, staging

Produces HES and evidence

Has access to secrets (verified)

Acceptance Authority (Human, Non-Developer)

Verifies observable behavior only (UI, staging reality)

Accepts or rejects evidence

Does not execute

Does not merge

Does not manage GitHub

Merge Authority

Executor (Homer) or designated repo maintainer

Merge authority is NOT the Acceptance Authority

Prompting Rules (Lisa → Homer)

Every directive must include:

PhaseSlug

LP ID

Example header:

Phase: export-global
LP: LP-export-global-004


Rules:

Prompts are LP-scoped, not versioned

Unlabeled prompts are invalid

If scope is unclear → STOP and ask

HES (Homer Execution Summary)

HES is evidence for a specific LP

HES inherits the LP number

Example:

HES-LP-export-global-004-B.json
HES-LP-export-global-004-C.json


Rules:

JSON-only

Evidence-only

Reproducible

No speculative narrative

How to Resume in a New Chat (MANDATORY)

Read this file (AI_BOOTSTRAP.md).

Read GOVERNANCE.md (authoritative).

Identify the active PhaseSlug (ask if unclear).

Identify the highest LP number issued.

Do not act until an LP is explicitly issued.

Explicit Prohibitions

No cross-project inference

No assumption-based fixes

No execution without an LP

No bypassing GOVERNANCE.md

If blocked:
→ Document the blocker
→ Stop
→ Return control to Lisa

Final Rule

When uncertain, pause.
Never guess.

End of Contract

This file is the single AI re-entry contract.
Any AI session must comply before taking action.
