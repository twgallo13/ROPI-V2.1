# Phase Requirements Document (PRD)

## Phase Metadata
- **PhaseName**: Products List Remediation
- **PhaseSlug**: `products-list-remediation-2b`
- **Created**: 2026-01-09
- **Phase Owner**: Lisa
- **Status**: Active

## Ambiguity Resolution
- **AmbiguityResolved**: YES
- **NoUserPromptsDuringExecution**: YES

## Phase Overview

This phase addresses critical issues with the Products List page, implementing robust pagination, proper column configuration, delete functionality, search capabilities, and real-time data refresh. The goal is to provide a reliable, production-ready product management interface that scales beyond 25 items and provides essential CRUD operations.

## Definition of Done

### 1. Pagination
**Requirement**: Cursor/page-based pagination and UI Next/Prev + rows-per-page (25/50/100) operate reliably; can page beyond 25 and show 50 rows.

**Acceptance Criteria**:
- [ ] Pagination supports cursor-based navigation through large product sets
- [ ] UI provides Next/Previous buttons that work reliably
- [ ] Rows-per-page selector with options: 25, 50, 100
- [ ] Can navigate beyond 25 items without issues
- [ ] Can display 50 rows on a single page
- [ ] Pagination state persists during session
- [ ] Page indicators show current position (e.g., "1-25 of 150")

**Evidence Required**: Screenshots/video showing navigation through >50 products with different page sizes

### 2. Columns
**Requirement**: Table header and columns exactly: MPN, Brand, Name, Department, Status, Updated (Date), Import Date (createdAt).

**Acceptance Criteria**:
- [ ] Columns appear in exact order: MPN, Brand, Name, Department, Status, Updated, Import Date
- [ ] All columns display correct data from Firestore
- [ ] Date columns formatted consistently (YYYY-MM-DD or locale-appropriate)
- [ ] Column headers are clear and properly labeled
- [ ] No extraneous columns present
- [ ] Responsive layout maintains readability on different screen sizes

**Evidence Required**: Screenshot showing full table header with all required columns in correct order

### 3. Delete
**Requirement**: Bulk and single Delete implemented end-to-end with safe confirmation, audit logging, success/failure messaging, and list refresh.

**Acceptance Criteria**:
- [ ] Single product delete with confirmation dialog
- [ ] Bulk delete with multi-select and confirmation
- [ ] Confirmation dialog shows count and details of items to be deleted
- [ ] Delete operations write to audit log with timestamp, user, and deleted product IDs
- [ ] Success message displays after successful deletion
- [ ] Error handling with clear failure messages
- [ ] Product list automatically refreshes after deletion
- [ ] Deleted products no longer appear in list or search results
- [ ] Delete operations are atomic (all-or-nothing for bulk)

**Evidence Required**: Video showing delete flow with confirmation, audit log entry, and list refresh

### 4. Search
**Requirement**: Search returns correct results for MPN and Name (case-insensitive, partial matches).

**Acceptance Criteria**:
- [ ] Search box filters products by MPN (partial, case-insensitive)
- [ ] Search box filters products by Name (partial, case-insensitive)
- [ ] Search results update in real-time as user types
- [ ] Search works with pagination (shows total matching results)
- [ ] Clear search button resets to full product list
- [ ] Search state indicated in UI (e.g., "Showing 12 results for 'widget'")
- [ ] Empty search results show helpful message

**Evidence Required**: Screenshots showing search results for MPN and Name queries, including partial matches

### 5. Data Refresh
**Requirement**: Products page reflects imports and edits promptly without manually opening/resaving a product.

**Acceptance Criteria**:
- [ ] New imported products appear in list without manual refresh
- [ ] Edited product details update in list view automatically
- [ ] Real-time listener implementation or smart polling mechanism
- [ ] Refresh mechanism is performant (doesn't cause UI jank)
- [ ] Works reliably across browser tabs
- [ ] Status changes reflect immediately

**Evidence Required**: Video showing product import/edit flow with automatic list update

### 6. Tests
**Requirement**: Unit, integration, and E2E tests added/updated to cover the above behaviors and CI is green.

**Acceptance Criteria**:
- [ ] Unit tests for pagination logic (min 80% coverage)
- [ ] Unit tests for search filtering logic
- [ ] Integration tests for delete operations
- [ ] E2E tests for full product list workflows
- [ ] E2E test for pagination beyond 25 items
- [ ] E2E test for bulk delete with confirmation
- [ ] E2E test for search functionality
- [ ] All tests passing in CI
- [ ] No regression in existing test suite

**Evidence Required**: CI logs showing green test runs, coverage reports

### 7. Evidence
**Requirement**: Each acceptance item must include non-dev verification artifacts (screenshots, short screencast, CI logs).

**Acceptance Criteria**:
- [ ] All screenshots captured and stored in phase evidence folder
- [ ] Video demonstrations uploaded and linked
- [ ] CI logs attached to phase completion
- [ ] Evidence indexed in ledger.json
- [ ] Staging URL documented and accessible

**Evidence Required**: Evidence manifest in ledger.json with links to all artifacts

## Live Definition

### Staging Verification
- **StagingProofURL**: https://ropi-aoss-staging.web.app/products
- **RequiredReceipts**:
  - CI Unit/Integration/E2E green
  - Staging Deploy Receipt
  - VVP Evidence (screenshots/video)
  - HES JSON completion artifact

### Proof That Live
Staging screenshots/videos demonstrating:
1. Pagination beyond 25 items
2. Display of 50 items per page
3. Correct header column order
4. Complete delete flow with confirmation and audit
5. Search by MPN and Name with results
6. UI auto-refresh after import/update

## Environments
- **Staging**: ropi-aoss-staging.web.app
- **Production**: (to be deployed after staging verification)

## Known Risks

### Risk 1: Firestore Composite Indexes
**Description**: Certain filter+sort combinations may require composite index creation in Firestore.

**Mitigation**:
- Review query patterns before implementation
- Create necessary indexes proactively
- Test index deployment in staging
- Monitor index build status

### Risk 2: Client-Side Search Scaling
**Description**: Client-side search may not scale beyond 5,000 products efficiently.

**Mitigation**:
- Implement pagination with search (limit results loaded)
- Document recommendation for Algolia/Elasticsearch in future LP
- Set performance baseline for acceptable response times
- Consider backend search endpoint for large datasets

### Risk 3: Destructive Delete Operations
**Description**: Bulk delete could accidentally remove large numbers of products.

**Mitigation**:
- Implement mandatory confirmation dialog with product count
- Add audit logging for all delete operations
- Consider soft-delete with recovery period
- Limit bulk delete batch size (e.g., max 100 at once)
- Require explicit user acknowledgment for bulk operations

### Risk 4: Real-Time Listener Performance
**Description**: Firestore real-time listeners could increase costs and connections if applied to many documents.

**Mitigation**:
- Scope listeners to visible items only (current page)
- Implement listener cleanup on unmount
- Consider smart polling as alternative for background updates
- Monitor Firestore listener usage metrics

### Risk 5: Pagination State Management
**Description**: Complex pagination state could lead to UI inconsistencies or data loading issues.

**Mitigation**:
- Use proven pagination library (e.g., react-query, swr)
- Implement comprehensive error handling
- Cache pagination cursors appropriately
- Test edge cases (deleted items, concurrent updates)

## Lisa Confirmation
- **RequestedBy**: Lisa (Phase Owner)
- **RequestedOn**: 2026-01-08T00:00:00Z
- **ConfirmationStatus**: Confirmed

## Machine Checks
✓ PhaseName present and non-empty  
✓ PhaseSlug present and kebab-case  
✓ AmbiguityResolved == YES  
✓ NoUserPromptsDuringExecution == YES  
✓ DefinitionOfDone contains seven binary checks (>5 required)  
✓ LisaConfirmation timestamp present  

## Linear Plans (LPs)

This phase is decomposed into 5 Linear Plans:

1. **LP-products-list-remediation-001**: Pagination Implementation
2. **LP-products-list-remediation-002**: Column Configuration
3. **LP-products-list-remediation-003**: Delete Functionality
4. **LP-products-list-remediation-004**: Search Implementation
5. **LP-products-list-remediation-005**: Data Refresh and Testing

See individual LP files in `lps/` directory for detailed implementation specifications.

## Success Metrics

### Performance
- Page load time < 2 seconds for 100 items
- Search response time < 500ms
- Delete operation completion < 1 second

### Quality
- Zero critical bugs in staging for 48 hours
- Test coverage > 80% for new code
- All accessibility checks passing

### User Experience
- Product list usable without page refresh
- Clear feedback for all operations
- No data loss during delete operations

## Dependencies
- Firestore collections: `products`, `auditLog`
- React components: ProductList, ProductTable
- Backend: Delete endpoint with audit logging
- Authentication: User context for audit trails

## Timeline
- **Start Date**: 2026-01-09
- **Target Completion**: TBD (based on LP estimates)
- **Review Cycle**: After each LP completion

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-09  
**Status**: Active - Ready for Implementation
