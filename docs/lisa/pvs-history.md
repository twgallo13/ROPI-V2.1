# Lisa PVS History

This file tracks Lisa-issued PVS prompts, associated PRs, and a short summary.

## PVS-0.1.0 — 2025-12-11
**Title:** Create Lisa governance: add PR template, docs, and PR metadata checks  
**Branch:** `lisa/PVS-0.1.0/setup-lisa-governance`  
**PR:** #254  
**Summary:** Add initial governance docs, PR template, and a GH Action enforcing PVS tags and acceptance criteria presence.  
**Status:** MERGED

---

## PVS-0.1.1 — 2025-12-11
**Title:** SDK AttributeSchema (canonical attribute types)  
**Branch:** `lisa/PVS-0.1.1/sdk-attribute-schema`  
**PR:** #258  
**Summary:** Add `AttributeSchema` Zod schema to SDK for canonical attribute validation.  
**Status:** MERGED

---

## PVS-0.1.2 — 2025-12-11
**Title:** API: Add attribute validation using SDK schema  
**Branch:** `lisa/PVS-0.1.2/api-attribute-validation`  
**PR:** #259  
**Summary:** Wire API attribute endpoints to validate against `AttributeSchema`.  
**Status:** MERGED

---

## PVS-0.1.3 — 2025-12-17
**Title:** Scaffold API attribute sync & migrate tasks  
**Branch:** `lisa/PVS-0.1.3/sync-migrate-tasks`  
**PR:** #267  
**Summary:** Add placeholder sync:attributes and migrate:attributes build tasks to API package.  
**Status:** MERGED

---

## PVS-0.1.4 — 2025-12-18
**Title:** Attributes: nav fix, editor fields, API validation, sync & migrate  
**Branch:** `lisa/PVS-0.1.4/attributes-fixes`  
**PR:** #271  
**Summary:** Fix attribute nav, add editor fields (source), complete API validation wiring, TypeScript fixes. Merged after resolving merge conflicts with aoss-main.  
**Status:** MERGED

---

## PVS-0.1.5 — 2025-12-18
**Title:** Integration test for attribute update merge verification  
**Branch:** `lisa/PVS-0.1.5/attribute-update-test`  
**PR:** #272  
**Summary:** Add integration test verifying attribute UPDATE merges with existing doc; fix delete handler error to preserve message property.  
**Status:** OPEN

---

## PVS-0.1.6 — 2025-12-18
**Title:** Staging dry-run: attribute normalization report  
**Branch:** `lisa/PVS-0.1.6/normalize-staging-dryrun`  
**PR:** #273  
**Summary:** Run attribute normalization dry-run against staging Firestore, produce verification docs. Result: 0 diffs needed (data already compliant), 422 docs (251 deprecated stubs, 171 valid).  
**Status:** OPEN

---

## PVS-0.1.7 — 2025-12-18
**Title:** Apply normalization, verify, merge PR #271  
**Branch:** `lisa/PVS-0.1.7/apply-normalize-staging`  
**PR:** (to be created)  
**Summary:** Run attribute normalization non-dry on staging (0 changes needed), verify via API tests and spot checks, merge PR #271 (PVS-0.1.4). PR #271 merged successfully after resolving TypeScript errors and merge conflicts.  
**Status:** IN PROGRESS

---

<!-- Future entries:
## PVS-X.Y.Z — (date)
**Title:**
**Branch:**
**PR:**
**Summary:**
**Status:**
-->

