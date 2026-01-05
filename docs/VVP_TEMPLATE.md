# VVP Template — Visual Verification Protocol (Canonical)

> **Status:** AUTHORITATIVE
>
> This is the **single VVP template** for this repository.
> Written for non-developers who need to verify UI/UX changes.
> Use when a change requires human visual confirmation.

---

## What is VVP?

VVP (Visual Verification Protocol) is a step-by-step guide for non-technical users to verify that UI changes work correctly. It uses simple language, numbered steps, and expected screenshots.

---

## VVP Document Structure

### Header

```markdown
# VVP: <Feature Name>

**LP:** LP-<PhaseSlug>-<SemVer>
**Date:** <YYYY-MM-DD>
**Verifier:** <Name or role>
**Environment:** <staging URL or local>
```

### Prerequisites

```markdown
## Before You Start

- [ ] You have access to <environment>
- [ ] You are logged in as <role>
- [ ] You have <any required data>
```

### Steps

```markdown
## Verification Steps

### Step 1: <Action Name>

1. Go to <URL or navigation path>
2. Click on <element>
3. You should see: <expected result>

**Expected Screenshot:**
![Step 1 Expected](./screenshots/step1-expected.png)

**Pass Criteria:** <what makes this pass>
```

### Sign-Off

```markdown
## Verification Sign-Off

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| 1 | ☐ Pass ☐ Fail | |
| 2 | ☐ Pass ☐ Fail | |
| 3 | ☐ Pass ☐ Fail | |

**Overall Result:** ☐ PASS ☐ FAIL

**Verifier Signature:** _______________
**Date:** _______________
```

---

## Writing Guidelines

### Do

- Use simple, non-technical language
- Number every action
- Show expected results with screenshots
- Include exact URLs and button names
- State pass/fail criteria clearly

### Don't

- Assume technical knowledge
- Use developer jargon (API, endpoint, etc.)
- Skip steps that seem obvious
- Leave expected results vague

---

## Example VVP

```markdown
# VVP: Export Page Button Visibility

**LP:** LP-export-gate-1.0.0
**Date:** 2026-01-05
**Verifier:** QA Team
**Environment:** https://ropi-aoss-staging.web.app

---

## Before You Start

- [ ] You can access the staging site
- [ ] You are logged in as an admin user
- [ ] You have at least one product in the system

---

## Verification Steps

### Step 1: Navigate to Export Page

1. Open your browser
2. Go to https://ropi-aoss-staging.web.app/export
3. You should see the Export page with a list of products

**Pass Criteria:** Export page loads without errors

---

### Step 2: Check Export Button

1. Find a product in the list
2. Look for the "Export" button on the right side
3. You should see either:
   - A blue "Export" button (product is ready)
   - A gray "Blocked" button (product is not ready)

**Pass Criteria:** Button shows correct state based on product readiness

---

## Verification Sign-Off

| Step | Pass/Fail | Notes |
|------|-----------|-------|
| 1 | ☐ Pass ☐ Fail | |
| 2 | ☐ Pass ☐ Fail | |

**Overall Result:** ☐ PASS ☐ FAIL

**Verifier Signature:** _______________
**Date:** _______________
```

---

## When to Use VVP

- UI layout changes
- New buttons or controls
- Changed user flows
- Visual feedback changes
- Accessibility improvements

## When NOT to Use VVP

- Backend-only changes
- API changes without UI impact
- Documentation updates
- Code refactoring
