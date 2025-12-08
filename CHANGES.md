# CHANGES

---

## aoss.v0.6.1 — 2025-12-08

### Admin Settings Frontend Release

**Merged PRs:**
- PR #221: feat(admin/ui): Settings UI + AttributeManager + E2E (Lisa v0.2.0) (`41ebdba`, merged 2025-12-08)
- PR #227: fix(e2e): add data-testid to AttributeManager + harden E2E selectors (`b20bc30`, merged 2025-12-08)
- PR #228: ci(e2e): seed firebase emulator users + run tests under emulators:exec (`040edd9`, merged 2025-12-08)

**Key Features:**
1. **Admin UI: Settings CRUD** — Implemented Settings page with Attributes, SmartRules, and AITemplates tabs
2. **AttributeManager UI** — Full CRUD (list/create/edit/delete) with data validation
3. **Playwright E2E Tests** — 13 comprehensive tests for AttributeManager with `data-testid` selectors
4. **CI Emulator Seeder** — Firebase Auth emulator seeding for hermetic E2E tests
5. **E2E Stability** — All 31 E2E tests passing (7 intentionally skipped)

**Test Results:**
- Admin Attribute CRUD: 13/13 ✅
- Authentication Flows: 7/8 ✅ (1 skipped - OAuth)
- Launch Calendar: 5/6 ✅ (1 skipped - feature disabled)
- Observations: 6/11 ✅ (5 skipped - test data requirements)

---

## aoss.v0.6.0

## Integration Release: RetailOps Integration and Schema Work

### Merged PRs

- PR #218: feat(admin): Attributes persistence & API (Lisa v0.2.0) (`6a89fc1`, merged 2025-12-07)
- PR #184: feat(infra): Repo Workflow Guard - PR template, policy, and validation (`08e1cee`, merged 2025-12-07)
- PR #185: docs: Repo README & Developer Onboarding (aoss.v0.3.1) (`878f83d`, merged 2025-12-07)
- PR #186: feat(sdk): Core Product & Import Schemas (aoss.v0.4.0) (`7648035`, merged 2025-12-07)
- PR #187: feat(sdk): RetailOps Export Mapping (Nike Men's Footwear MVP) (aoss.v0.5.0) (`62ac0e7`, merged 2025-12-07)
- PR #188: feat(sdk): RetailOps CSV Import to CoreProduct (aoss.v0.6.0) (`1555ed0`)
- PR #190: fix(e2e): update auth tests to match SignInModal flow (`c95cf54`, merged 2025-12-07)
- PR #191: chore(integration): merge aoss-staging-integration to aoss-main (`7858014`)
- PR #193: ci(validate): allow integration branch for staged merges (`b0d310c`)

### Release Details

- **Release Date:** 2025-12-07T03:16:41Z
- **Target Branch:** aoss-main (staging)
- **Integration Branch:** aoss-staging-integration

### Key Features

1. **Repo Workflow Guard** - PR template, policy, and validation workflow
2. **Developer Onboarding** - Updated README and contributing docs
3. **Core Product & Import Schemas** - SDK schema definitions
4. **RetailOps Export Mapping** - Nike Men's Footwear MVP export
5. **RetailOps CSV Import** - Import to CoreProduct transformation
6. **E2E Auth Fixes** - SignInModal flow test updates
7. **CI Validator Enhancement** - Support for integration branch naming
