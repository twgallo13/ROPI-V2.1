# Section 13 — Admin Console, Help & Training

[← Back to ROPI AOSS (Main Page)]({{https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})

# Section 13 — Admin Console, Help & Training

This section provides admin UI specifications, help center content, training materials, and support procedures for ROPI operations.

---

## 13.0 — Admin Module Overview (v1.1)

---

## 13.2 Settings Module Overview

The `/app/settings` area is the central administrative hub for all configuration in AOSS. It uses a card-based layout and includes:

- **Attributes** — attribute definitions, allowed values, data types
- **Smart Rules** — automated rules that transform or validate product data
- **AI Templates** — Audience Template Builder for description tone, structure, and SEO rules
- **AI Settings** — global controls for Describe behavior, fallbacks, rate limits, async generation, and tone presets
- **Export Profiles** — CSV and feed mapping defaults
- **Archiver & Retention** — retention windows and cleanup settings
- **Users** — admin-only user management and role assignment

These Settings pages are referenced throughout the system and must be properly configured before training or onboarding teams.

---

## 13.3 Training Requirements: AI Templates (Audience Template Builder)

Admins working with the Audience Template Builder (`/app/settings/ai-templates`) must understand:

- How template conditions work (match ALL vs ANY)
- How product attributes influence template matching
- How formatting styles guide the Describe Engine (paragraph lengths, headlines, bullets)
- How tone presets, avoid words, and brand rules shape final descriptions
- How SEO patterns (metaTitlePattern, includeFit, etc.) influence metadata generation
- How to manage template versions and lifecycle (active, draft, disabled)
- How the default template per site interacts with global AI Settings

Training Recommendation:

- Include hands-on exercises where admins modify a template, regenerate descriptions, then review the results across different product types.

---

## 13.4 Training Requirements: AI Settings

The AI Settings page (`/app/settings/ai`) controls global AI behavior. Admins should understand:

- How to set default templates per website
- When to apply a global tone preset vs letting audience templates define tone
- How rate limits protect system stability (maxSyncDescribePerMinute, maxRegenerations)
- How async batch jobs work and when to enable or disable them
- How experimental features impact Describe (advanced SEO, structured bullets, two-pass generation)
- How these global settings combine with AI Templates inside the Describe pipeline (see Section 5)

Training Recommendation:

- Provide examples showing how changing global tone or default template affects actual output.

---

## 13.5 Training Requirements: Smart Rules + AI Describe Interaction

Because Smart Rules run before the Describe Engine, they directly influence template matching and prompt construction.

Admins should be trained on:

- Which product attributes Smart Rules commonly modify (gender, department, materials, ageGroup)
- How attribute normalization can cause a different audience template to match
- How to safely test Smart Rules without impacting live Describe behavior
- How to audit Describe output when a Smart Rule unexpectedly changes attribute values

Recommendation:

- Include a walkthrough demonstrating how modifying a product attribute triggers a different AI template.

---

## 13.0 — Admin Module Overview (v1.1)

The Admin Module centralizes all configuration, governance, audit, and support functions for AOSS-backed ROPI. It provides a unified console for administrators, training teams, support staff, and engineering operations.

### 13.0.1 Goals of the Admin Module

1. **Configuration Safety** — prevent invalid settings from impacting W1/W2 or Smart Rules
2. **Auditability** — all admin actions produce logs (Section 11.2)
3. **Stability** — safely deploy schema changes, rules, and AI updates
4. **Role-Based Access** — enforce correct permissions across Admin, Merch, Ops, and Engineering
5. **Support Workflow Integration** — centralize troubleshooting for all users

### 13.0.2 Admin Personas

- **AOSS Admin** — maintains schema, rules, and AI behavior
- **Merch Admin** — maintains categories, brand pages, pricing rules
- **Support Admin** — resolves user incidents, permissions, onboarding
- **Engineering Admin** — manages scripts, deployments, and error handling

### 13.0.3 Key Surfaces

- Settings Console
- Rules Console
- AI Governance Console
- Help Center
- Training Hub
- Audit Logs

---

## 13.1 — Admin Console (v1.1)

The Admin Console houses all configuration and administrative controls supporting AOSS workflows, schema governance, and system operations.

### 13.1.1 Console Structure

- **Dashboard** — high-level insights, SLO indicators, active alerts
- **Settings** — system-wide configuration (Section 13.2)
- **Smart Rules** — Smart Rules management (Section 4 — Part 1 user behavior, Part 2 rule definitions)
- **AI Governance** — Describe/Complete model settings, drift reports

---

## 13.1.4 — Smart Rules Administration (Updated Reference to Section 4)

The Admin Console includes a full Smart Rules management interface. As defined in Section 4 — Part 1, only **Admins** may:

- Create, edit, or delete Smart Rules
- Enable or disable Rule Packs
- Configure autoApply settings
- Publish rule versions (draft → test → publish)

Admins can also:

- View rule execution logs
- Test rules against sample products
- Manage rule conflicts and bulk cleanup

Training and onboarding materials must direct users to:

- Understanding how suggestions appear
- How to Apply or Ignore suggestions
- How conflicts must be resolved
- The difference between auto-apply and suggestion-only rules

This page should link to Section 4 for full rule definitions and versioning logic.

Eligibility for auto-apply in Smart Rules is constrained to attributes marked requiredForExport or requiredForLaunch in the Product Schema (Section 2.1). All other attributes are suggestion-only, and all behavior must follow the precedence and safety rules defined in Section 4.

---

## 13.2 — Settings & Controls (v1.1)

The Settings Console allows safe configuration of all global system settings.

### 13.2.1 Top-Level Categories

- **Product Schema Settings**
- **AI Behavior Settings**
- **Smart Rules Settings**
- **UI/UX Settings**
- **Workflow Settings (W1, W2)**
- **Export/Launch Calendar Settings**

### 13.2.2 Validation Rules

Every setting must comply with:

1. **Schema validation** (Section 2)
2. **Domain rules** (Section 2.3)
3. **Observability safety checks** (Section 11.1)
4. **Migration state restrictions** (Section 12)

### 13.2.3 AI Settings

Controls available:

- AI Describe confidence threshold
- AI Complete enforcement threshold
- Hallucination guardrail toggles
- Rewrite limits
- "Do not auto-write" flags
- Model version pinning

### 13.2.4 Safety Requirements

- All settings must be reversible
- All risky changes require two-step confirmation
- All changes produce audit events (Section 11.2)

---

## 13.3 — Help Center (v1.1)

The Help Center provides structured onboarding, workflow guidance, troubleshooting, and AI education for all AOSS users.

### 13.3.1 Help Center Structure

- **Getting Started** — New user intro
- **W1: Observations**
- **W2: Product Completion**
- **AI Describe / Complete**
- **Import Engine**
- **Smart Rules**
- **Admin Tools**
- **FAQ & Troubleshooting**

### 13.3.2 Required Articles

Each must have:

- Goals
- Step-by-step instructions
- Images or examples
- Troubleshooting
- Escalation path (Section 13.6)

### 13.3.3 Troubleshooting Framework

Every article must include:

- Symptoms
- Likely Cause
- Confirmations
- Fixes
- Escalation Target
- Required Logs (Section 11.2)

### 13.3.4 Role-Specific Guides

- Merch Role
- Admin Role
- Support Role
- Engineering Role

Each guide must reference W1, W2, and Section 11 safety protocols.

---

## 13.4 — Admin Glossary & Concepts (v1.1)

This glossary defines key terms used in the Admin, Help, and Training ecosystem for AOSS-backed ROPI.

### 13.4.1 Core Concepts

**Admin Console**

Central UI for configuration, governance, support, and audit.

**Settings Console**

Area where global system, AI, workflow, and UI settings are edited.

**Rules Console**

Smart Rules editing and management surface (see Section 4).

**AI Governance Console**

Area for managing AI Describe/Complete models, thresholds, and drift.

**Audit Log**

Searchable record of configuration and admin actions (Section 11.2).

**Activity Log**

Business-facing history of product and workflow changes (W1/W2).

---

### 13.4.2 Workflow Concepts

**W1 — Observations Capture & Apply**

Workflow for capturing human/visual observations and applying them to products.

**W2 — Full Product Completion**

Workflow that takes a product from imported → fully merchandised and ready.

**Smart Rules**

Deterministic rule system that proposes and optionally auto-applies values for attributes—especially those marked requiredForExport or requiredForLaunch—running during Import (Section 3), W1, and W2, and governed by the behavior and schemas defined in Section 4 (Parts 1 and 2).

**Validation Engine**

Enforces attribute constraints and domain rules before write/launch.

---

### 13.4.3 Reliability & Ops Concepts

**SLO**

Service-Level Objective (target reliability).

**SLI**

Service-Level Indicator (measurement of behavior).

**Incident**

Any event where reliability, correctness, or safety is violated.

**Runbook**

Step-by-step procedure for responding to known issues.

**Environment**

Staging or production runtime that ROPI uses.

**Tenant / Brand Context (if multi-tenant)**

Optional isolation boundary for configuration and data.

All other glossary terms must align with Section 11.10 — Observability Glossary.

---

## 13.5 — Training Plan (v1.1)

Training must ensure each role can safely use AOSS-backed ROPI without breaking workflows or corrupting data.

### 13.5.1 Training Tracks

**Track A — Store & Merch Users**

- W1 Observations
- W2 Product Completion
- Basic troubleshooting
- When to escalate

**Track B — Admin & Support Users**

- Admin Console basics
- Settings and safety
- Help Center usage
- Incident reporting

**Track C — Engineering & Ops**

- Migration awareness (Section 12)
- Observability (Section 11)
- Runbooks and SLOs
- AI behavior management

### 13.5.2 Training Delivery

- Help Center articles (13.3)
- Short video walkthroughs
- Live or recorded sessions
- Sandbox / staging exercises

### 13.5.3 Certification & Access

- Access to `admin.*` roles requires completion of Track B or C.
- Admin features gated behind:
    - Training completion
    - Acknowledgement of risk
    - Understanding of rollback paths

### 13.5.4 Content Maintenance

- Training updated after:
    - Major schema changes
    - Smart Rules updates
    - AI model upgrades
    - Migration or cutover events

All updates must be reflected in the Help Center and release notes (Section 14).

---

## 13.6 — Support & Escalation (v1.1)

Support workflows ensure that issues with ROPI, AOSS, or Admin tools are handled consistently and safely.

### 13.6.1 Support Tiers

**Tier 0 — Self-Service**

- Help Center articles
- Training materials
- FAQ

**Tier 1 — Support Admin**

- Password or access issues
- Basic workflow questions
- Non-critical configuration questions

**Tier 2 — AOSS Admin / Engineering**

- Schema-level issues
- Smart Rules problems
- AI behavior issues
- Migration or cutover concerns

### 13.6.2 Escalation Flow

1. User checks Help Center
2. If unresolved → Support Admin (Tier 1)
3. If still unresolved OR risk to W1/W2 → AOSS Admin / Engineering (Tier 2)
4. If impacting SLOs → follow Section 11 incident workflows

### 13.6.3 Required Artifacts for Escalation

Every escalation should include:

- Screenshots or product IDs
- Time of occurrence
- Description of expected vs actual behavior
- Relevant logs or trace IDs (if available)
- Any recent configuration changes

This ensures Engineering can quickly debug using Section 11 tooling.

---

## 13.7 — FAQ (v1.1)

The FAQ should provide short, practical answers to recurring questions from Admins, Merch, Support, and Engineering.

### 13.7.1 FAQ Content Guidelines

Each FAQ entry should:

- Ask one clear question
- Provide one clear answer
- Link to deeper Help Center docs when needed
- Indicate when to escalate

### 13.7.2 Core FAQ Categories

- W1 & W2 workflows
- Observations and ai_insights
- Smart Rules behavior
- AI Describe / Complete
- Admin settings and permissions
- Error messages and what they mean
- Migration and cutover questions

### 13.7.3 Ownership

- AOSS Admin owns accuracy of workflow and configuration answers
- Engineering owns technical, AI, and SLO-related answers
- Support Admin curates and maintains FAQ entries over time

---

## 13.8 — Admin Audit Checklist (v1.1)

This checklist ensures monthly and quarterly admin activities are executed consistently to maintain data integrity, AI stability, and workflow safety.

### 13.8.1 Monthly Audit Requirements

- [ ]  Review Audit Log for configuration changes
- [ ]  Validate Smart Rules performance
- [ ]  Validate AI Describe drift reports
- [ ]  Review error-rate SLOs (Section 11.1)
- [ ]  Confirm W1/W2 workflow stability
- [ ]  Check for deprecated schema usage
- [ ]  Review admin permissions changes

### 13.8.2 Quarterly Audit Requirements

- [ ]  Full schema validation
- [ ]  Full Smart Rules conflict scan
- [ ]  AI drift analysis vs previous quarter
- [ ]  Review Help Center accuracy
- [ ]  Revalidate training certification status
- [ ]  Review migration readiness (Section 12)
- [ ]  Review any incidents from past quarter

### 13.8.3 Audit Output Requirements

Each audit must output:

- Summary
- Conflicts or errors
- Recommendations
- Responsible owner
- Expected resolution timeline

---

## 13.9 — Quick Reference Cards (v1.1)

Quick reference cards provide fast-access training for key roles.

### 13.9.1 Merch Card

- W1 overview
- W2 overview
- Attribute rules
- Describe/Complete tips
- When to escalate

### 13.9.2 Admin Card

- Console surfaces
- Settings safety rules
- AI governance basics
- Smart Rules quick checks
- Required logs for escalation

### 13.9.3 Engineering Card

- Observability dashboards
- AI drift detection
- Smart Rules conflict debugging
- Migration validation
- Incident workflows (Section 11)

### 13.9.4 Support Card

- FAQ lookups
- Permission resets
- Workflow troubleshooting
- Escalation templates

---

## 13.10 — Admin Best Practices (v1.1)

### 13.9.4 Support Card

- FAQ lookups
- Permission resets
- Workflow troubleshooting
- Escalation templates

---

### 13.9.5 Cross-Reference Map for Admin Training

For effective onboarding, refer to the following system components:

- **AI Templates** → Section 4 (Settings CRUD — AI Templates Manager)
- **AI Settings** → Section 5 (Settings CRUD — Global AI Controls)
- **Template System Behavior** → Section 5 (AI Describe Engine, Template System)
- **Smart Rules** → Section 4 (Smart Rules Engine)
- **Settings Hub** → Section 1.2 (Global Routes) and Settings CRUD top-level section

These links form the recommended "admin learning path" for maintaining AI behavior in AOSS.

---

## 13.10 — Admin Best Practices (v1.1)

### 13.10.1 Configuration Best Practices

- Make incremental changes
- Validate in staging before production
- Always check SLO dashboards after changes
- Avoid changes during launch windows

### 13.10.2 AI Governance Best Practices

- Pin model versions for stability
- Review drift weekly
- Never allow auto-write on low-confidence
- Log all override decisions

### 13.10.3 Smart Rules Best Practices

- Test each rule change individually
- Monitor conflict rates
- Keep rule groups well-scoped
- Document every rule change

### 13.10.4 Support Best Practices

- Always gather logs before escalating
- Capture screenshots of errors
- Follow Section 13.6 escalation workflow
- Document tribal knowledge in Help Center

---

## 13.11 — Section Summary (v1.1)

The Admin Module provides the tools, governance, training, and safety systems needed to operate AOSS-backed ROPI at scale.

### Key Takeaways

- Admin Console centralizes governance
- Help Center supports all user roles
- Training ensures safe workflow execution
- Support tiers route issues clearly
- Audit logs and SLOs protect reliability
- Best practices help admins avoid misconfiguration

This section is complete and aligns with:

- Section 7 (UI & Frontend)
- Section 11 (Observability & Ops)
- Section 12 (Migration & Cutover)
- Workflow W1 / W2 requirements

Admins must read Sections 11 and 12 before making configuration changes.

---

### Navigation

← Previous Section: [Section 12 — Migration](https://www.notion.so/2b845ee1ec5a80658739f5ce9d768e11}})

→ Next Section: [Section 14 — Appendix](https://www.notion.so/2b845ee1ec5a801ea453cd4578501b39}})

[← Back to ROPI AOSS (Main Page)](https://www.notion.so/2b645ee1ec5a80e5b64fd04cea9e0d52}})