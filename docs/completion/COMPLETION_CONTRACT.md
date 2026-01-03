# 📄 Completion Contract

**ROPI AOSS — Canonical Definition**

## Purpose

**Completion** defines when a product is eligible to be exported.
It is the single, canonical gate in the system.

A product cannot be exported unless Completion is satisfied.

## Core Principles (Non-Negotiable)

### Completion is the gate
- Export readiness is derived from Completion
- There are no parallel, fallback, or legacy export gates

### Completion is settings-driven

Behavior is controlled by:

- Attribute Registry
- Completion Rules (settings)
- Selected websites

No hard-coded logic exists in the readiness path.

### Completion is explainable

The system must always show:

- Why completion is blocked
- Which segment is incomplete
- Which site (if applicable)
- Which attributes are missing

### Completion is stable

- Completion % has a defined meaning
- Safe to use as a KPI without redefinition

## What Completion Is (and Is Not)

### Completion IS:

- A weighted progress model (0–100%)
- A measure of readiness toward export
- Site-aware
- Segment-based
- Settings-configurable

### Completion IS NOT:

- A simple checklist
- A UI-only indicator
- A media or pricing signal
- Inferred from legacy behavior

## Completion Segments (Initial Model)

Completion is composed of segments, each contributing to the total Completion %.

Default segments (configurable via settings):

- Core attributes
- Required product attributes
- Descriptions + SEO (per selected website)
- Required technical attributes

Each segment:

- Has a defined contribution (weight)
- Has explicit inclusion rules
- Is independently explainable

## Site-Aware Enforcement (Critical)

There is no single global description.

Each selected website has its own required:

- Description fields
- SEO fields

Missing description or SEO for any selected site blocks Completion.

Site-specific failures must be explicitly surfaced in UI.

## Explicit Exclusions

The following never affect Completion or Export:

### Images / media

- Informational only
- Used for Launch Calendar and AI Observations

### Pricing

- Override-only
- Non-blocking

No exceptions.

## Completion % Semantics

- Completion % represents true progress.
- Segment weights determine contribution.
- Export is unlocked only when Completion reaches the configured threshold (typically 100%).
- Partial completion is meaningful and observable.

## Settings & Source of Truth

### Attribute Registry

Defines attributes, categories, metadata

### Completion Rules (Settings UI)

Defines segments:

- Weights
- ALL vs ANY logic
- Site applicability

### Validation & Enforcement

- Derive rules at runtime from registry + settings.
- Do not invent or override rules.

## Operator Guarantees

At any time, an operator must be able to answer:

- Why is this product not exportable?
- Which segment is blocking?
- Which site (if applicable)?
- Which attributes are missing?

If the system cannot answer these, it is a bug.

## Invariants (Must Always Hold)

- Completion is the only export gate
- No hidden rules
- No hard-coded requirements
- No UI controls that don't affect logic
- No backend logic that isn't observable in UI

**This contract is authoritative.**
Any implementation, UI, or workflow that contradicts it is incorrect by definition.
