# Homer STARTING: LP-1.2.2 — Diagnose/Fix MPN 401

**Timestamp:** 2024-12-20T00:00:00Z (session start)

## Objective
Diagnose the 401 returned by `/api/products/by-mpn/:mpn`, fix client or server cause, add defensive logging/tests, deploy to staging and verify MPN lookup works without 401s for an admin user.

## Environment Notes
- **Repository:** twgallo13/ROPI-V2.1
- **Branch:** lisa/LP-1.2.2/mpn-401-fix (created)
- **Default Branch:** aoss-main
- **OS:** Ubuntu 24.04.3 LTS (dev container)

## Plan
1. Reproduce & capture server response with curl
2. Inspect browser request & confirm client authorization header
3. Inspect server-side logs for 401 stacktrace
4. Examine endpoint implementation & auth guard
5. Implement fix(s) - server-side and/or client-side
6. Run tests & local verification
7. Deploy changes to staging & verify
8. Final report (Homer DONE)

## Hard Rules
- Do not create/delete product or attribute data
- Do not leak tokens or secrets in logs (show only token prefix)
- Add tests and PR for any code changes
- Save all artifacts into docs/lisa/observations/LP-1.2.2/
