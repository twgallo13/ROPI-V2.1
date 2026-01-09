# LP-products-list-remediation-003: Delete Functionality

## LP Metadata
- **LP ID**: LP-products-list-remediation-003
- **LP Name**: Delete Functionality
- **Phase**: Products List Remediation (products-list-remediation-2b)
- **Status**: Not Started
- **Priority**: P1 (High - Destructive Operations)
- **Estimated Effort**: 10-16 hours
- **Dependencies**: LP-002 (Column Configuration) - helpful for delete confirmation details

## Objective

Implement safe, audited, and user-friendly product deletion capabilities including both single product delete and bulk delete operations. Ensure destructive operations include mandatory confirmation, comprehensive audit logging, clear success/failure messaging, and automatic list refresh.

## Current State Analysis

### Issues with Current Implementation
1. Delete functionality may not exist at all
2. No bulk delete capability
3. Missing confirmation dialogs
4. No audit logging for delete operations
5. List may not refresh after deletion
6. No error handling or user feedback

### Technical Debt
- Audit logging system may need to be implemented
- Delete permissions/authorization may not be in place
- Soft delete vs hard delete strategy undefined

## Requirements

### Functional Requirements

#### FR-1: Single Product Delete
- Delete button/icon on each product row
- Confirmation dialog before deletion
- Shows product details (MPN, Name) in confirmation
- Executes delete on confirmation
- Updates UI immediately on success
- Shows error message on failure

#### FR-2: Bulk Delete
- Checkbox selection for multiple products
- "Select All" checkbox in header
- "Delete Selected" button (appears when items selected)
- Confirmation dialog shows count and list of products
- Batch delete operation
- All-or-nothing transaction (if possible)
- Clear selection after successful delete

#### FR-3: Confirmation Dialog
- Clear warning about permanent deletion
- Display product count and details
- "Cancel" and "Delete" buttons
- "Delete" button styled as danger/warning
- Require explicit user action (no auto-confirm)
- Escape key closes dialog (cancel)
- Focus management (focus Cancel by default)

#### FR-4: Audit Logging
- Log every delete operation to auditLog collection
- Include: timestamp, user ID, user email, action, productIds
- Include: product details (MPN, Name, Brand) before deletion
- Store enough data to identify what was deleted
- Atomic write with delete operation (if possible)
- Searchable and queryable audit logs

#### FR-5: User Feedback
- Success toast/notification: "X product(s) deleted successfully"
- Error toast/notification with specific error message
- Loading state during delete operation
- Disable delete buttons during operation
- Clear visual feedback (row fade-out animation optional)

#### FR-6: List Refresh
- Remove deleted products from UI immediately
- Update pagination counts
- Refetch current page if needed
- Handle edge case: deleting all items on last page
- Maintain scroll position when practical

### Non-Functional Requirements

#### NFR-1: Safety
- No accidental deletes (always require confirmation)
- Destructive action styling (red/danger colors)
- Clear warnings in confirmation dialog
- Limit bulk delete size (e.g., max 100 at once)
- Consider implementing soft delete (optional)

#### NFR-2: Performance
- Delete operations complete in < 2 seconds
- Bulk delete handles up to 100 products efficiently
- No UI blocking during delete
- Optimistic UI updates (show as deleted immediately)

#### NFR-3: Reliability
- Atomic delete operations where possible
- Handle partial failures gracefully
- Rollback on error (if using transactions)
- Retry logic for transient failures
- Comprehensive error logging

#### NFR-4: Authorization
- Verify user has delete permissions
- Backend validation of delete requests
- Audit user role in audit logs
- Prevent unauthorized deletions

#### NFR-5: Accessibility
- Keyboard navigation for delete actions
- Screen reader announcements
- Focus management in dialogs
- ARIA labels for delete buttons

## Technical Implementation

### Architecture

#### Component Structure
```
ProductList/
├── ProductTableRow
│   └── DeleteButton (single delete)
├── ProductTableHeader
│   └── SelectAllCheckbox
├── BulkActions
│   └── DeleteSelectedButton
├── DeleteConfirmationDialog
│   ├── SingleProductConfirmation
│   └── BulkDeleteConfirmation
└── hooks/
    └── useProductDelete.ts
```

#### State Management
```typescript
interface DeleteState {
  isDeleting: boolean;
  selectedProducts: Set<string>; // product IDs
  showConfirmDialog: boolean;
  deleteMode: 'single' | 'bulk';
  productToDelete: Product | null;
  error: string | null;
}
```

#### Audit Log Structure
```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Timestamp;
  userId: string;
  userEmail: string;
  action: 'product_delete' | 'product_bulk_delete';
  productIds: string[];
  productDetails: Array<{
    id: string;
    mpn: string;
    name: string;
    brand: string;
  }>;
  count: number;
  success: boolean;
  error?: string;
  metadata: {
    userAgent: string;
    ip?: string;
  };
}
```

### Firestore Operations

#### Single Delete
```typescript
async function deleteProduct(productId: string, user: User): Promise<void> {
  const batch = db.batch();
  
  // Get product details for audit log
  const productDoc = await db.collection('products').doc(productId).get();
  const product = productDoc.data();
  
  // Delete product
  batch.delete(db.collection('products').doc(productId));
  
  // Create audit log entry
  const auditRef = db.collection('auditLog').doc();
  batch.set(auditRef, {
    timestamp: FieldValue.serverTimestamp(),
    userId: user.uid,
    userEmail: user.email,
    action: 'product_delete',
    productIds: [productId],
    productDetails: [{
      id: productId,
      mpn: product.mpn,
      name: product.name,
      brand: product.brand
    }],
    count: 1,
    success: true,
    metadata: {
      userAgent: navigator.userAgent
    }
  });
  
  await batch.commit();
}
```

#### Bulk Delete
```typescript
async function bulkDeleteProducts(
  productIds: string[], 
  user: User
): Promise<{ success: boolean; errors: string[] }> {
  // Firestore has 500 writes per batch limit
  const MAX_BATCH_SIZE = 100; // Conservative limit
  
  if (productIds.length > MAX_BATCH_SIZE) {
    throw new Error(`Cannot delete more than ${MAX_BATCH_SIZE} products at once`);
  }
  
  const batch = db.batch();
  const productDetails: any[] = [];
  
  // Fetch all products for audit trail
  const productPromises = productIds.map(id => 
    db.collection('products').doc(id).get()
  );
  const productDocs = await Promise.all(productPromises);
  
  productDocs.forEach((doc, index) => {
    if (doc.exists) {
      const data = doc.data();
      productDetails.push({
        id: productIds[index],
        mpn: data.mpn,
        name: data.name,
        brand: data.brand
      });
      
      // Delete product
      batch.delete(doc.ref);
    }
  });
  
  // Create audit log entry
  const auditRef = db.collection('auditLog').doc();
  batch.set(auditRef, {
    timestamp: FieldValue.serverTimestamp(),
    userId: user.uid,
    userEmail: user.email,
    action: 'product_bulk_delete',
    productIds: productIds,
    productDetails: productDetails,
    count: productIds.length,
    success: true,
    metadata: {
      userAgent: navigator.userAgent
    }
  });
  
  await batch.commit();
  
  return { success: true, errors: [] };
}
```

### Implementation Steps

#### Step 1: Create Delete Hook
- Create `useProductDelete.ts` custom hook
- Implement single delete logic
- Implement bulk delete logic
- Add error handling and state management
- Include audit logging

#### Step 2: Add Selection State
- Add checkbox to each table row
- Implement "Select All" checkbox
- Manage selected products Set in state
- Add visual feedback for selected rows

#### Step 3: Build Confirmation Dialog
- Create `DeleteConfirmationDialog.tsx` component
- Implement single product confirmation view
- Implement bulk delete confirmation view
- Add proper styling (danger theme)
- Implement keyboard navigation

#### Step 4: Implement Delete Buttons
- Add delete icon button to each row
- Create "Delete Selected" button in header/toolbar
- Wire up onClick handlers
- Implement loading states

#### Step 5: Add Audit Logging
- Create audit log write functions
- Integrate with delete operations
- Test audit log entries in Firestore
- Verify all required fields captured

#### Step 6: Implement User Feedback
- Add toast notification system (if not exists)
- Show success/error messages
- Implement optimistic UI updates
- Add row fade-out animations (optional)

#### Step 7: Handle List Refresh
- Remove deleted products from local state
- Update pagination counts
- Refetch if necessary
- Handle edge cases (empty pages)

#### Step 8: Add Authorization
- Check user permissions before showing delete buttons
- Validate on backend (Cloud Function or Security Rules)
- Handle unauthorized attempts gracefully

### Files to Create/Modify

```
src/
├── hooks/
│   ├── useProductDelete.ts (CREATE)
│   └── useProductSelection.ts (CREATE)
├── components/
│   ├── Products/
│   │   ├── ProductListContainer.tsx (MODIFY)
│   │   ├── ProductTable.tsx (MODIFY)
│   │   ├── ProductTableRow.tsx (MODIFY)
│   │   ├── ProductTableHeader.tsx (MODIFY)
│   │   ├── DeleteButton.tsx (CREATE)
│   │   ├── BulkActionsBar.tsx (CREATE)
│   │   └── DeleteConfirmationDialog.tsx (CREATE)
│   └── common/
│       ├── Toast.tsx (USE EXISTING or CREATE)
│       └── ConfirmDialog.tsx (USE EXISTING or CREATE)
├── services/
│   ├── auditLog.ts (CREATE)
│   └── productService.ts (MODIFY)
└── types/
    └── auditLog.ts (CREATE)

functions/
└── src/
    └── products/
        └── deleteProduct.ts (CREATE - optional backend validation)
```

### Backend Security Rules

```javascript
// firestore.rules
match /products/{productId} {
  allow delete: if request.auth != null 
    && request.auth.token.role in ['admin', 'manager'];
}

match /auditLog/{logId} {
  allow write: if request.auth != null;
  allow read: if request.auth != null 
    && request.auth.token.role in ['admin'];
}
```

## Acceptance Criteria

### AC-1: Single Delete
- [ ] Delete button appears on each product row
- [ ] Clicking delete shows confirmation dialog
- [ ] Confirmation shows product MPN and Name
- [ ] Confirming delete removes product from list
- [ ] Success message displays after deletion
- [ ] Audit log entry created

### AC-2: Bulk Delete
- [ ] Checkbox appears on each row
- [ ] "Select All" checkbox works correctly
- [ ] "Delete Selected" button appears when items selected
- [ ] Confirmation shows count and list of products
- [ ] All selected products deleted on confirmation
- [ ] Selection cleared after deletion
- [ ] Success message shows count deleted

### AC-3: Confirmation Dialog
- [ ] Dialog clearly warns about permanent deletion
- [ ] Shows specific product details
- [ ] Has Cancel and Delete buttons
- [ ] Delete button styled as danger/warning
- [ ] Escape key closes dialog (cancel)
- [ ] Focus on Cancel button by default

### AC-4: Audit Logging
- [ ] Every delete creates audit log entry
- [ ] Audit log includes timestamp
- [ ] Audit log includes user ID and email
- [ ] Audit log includes product IDs and details
- [ ] Audit log includes action type
- [ ] Audit logs are queryable in Firestore

### AC-5: User Feedback
- [ ] Success message after successful delete
- [ ] Error message if delete fails
- [ ] Loading state during delete operation
- [ ] Delete buttons disabled while deleting
- [ ] Clear visual feedback

### AC-6: List Refresh
- [ ] Deleted products removed from UI immediately
- [ ] Pagination updated correctly
- [ ] Current page refetched if needed
- [ ] Handles deleting all items on last page gracefully

### AC-7: Error Handling
- [ ] Network errors handled gracefully
- [ ] Permission errors show appropriate message
- [ ] Partial failures reported to user
- [ ] Failed deletes do not remove from UI

### AC-8: Batch Size Limit
- [ ] Cannot select more than 100 products for bulk delete
- [ ] Warning message if limit exceeded
- [ ] "Select All" respects batch limit

## Testing Strategy

### Unit Tests
```typescript
describe('useProductDelete', () => {
  it('should delete single product');
  it('should bulk delete multiple products');
  it('should create audit log entry');
  it('should handle delete errors');
  it('should validate user permissions');
  it('should enforce batch size limits');
});

describe('useProductSelection', () => {
  it('should select individual products');
  it('should select all products');
  it('should deselect all products');
  it('should respect max selection limit');
});

describe('DeleteConfirmationDialog', () => {
  it('should render single delete confirmation');
  it('should render bulk delete confirmation');
  it('should call onConfirm when confirmed');
  it('should call onCancel when cancelled');
  it('should focus Cancel button by default');
});
```

### Integration Tests
```typescript
describe('Product Delete Integration', () => {
  it('should delete product and create audit log');
  it('should bulk delete products and create audit log');
  it('should refresh list after deletion');
  it('should handle delete failures gracefully');
  it('should enforce permissions');
});
```

### E2E Tests
```typescript
describe('Product Delete E2E', () => {
  it('should complete single delete flow');
  it('should complete bulk delete flow');
  it('should show confirmation before delete');
  it('should display success message');
  it('should update list after delete');
  it('should create audit log entry');
  it('should prevent unauthorized deletes');
});
```

## Evidence Requirements

### Screenshots
1. Product row with delete button visible
2. Checkboxes and "Select All" functionality
3. "Delete Selected" button with count
4. Single product delete confirmation dialog
5. Bulk delete confirmation dialog with list
6. Success toast message
7. Audit log entries in Firestore console

### Video
- Screen recording (60-90 seconds) demonstrating:
  - Single product delete with confirmation
  - Selecting multiple products
  - Bulk delete with confirmation
  - Success message and list refresh
  - Viewing audit log entry in Firestore

### Code Evidence
- Link to PR with delete implementation
- Test coverage report (>80% for delete logic)
- Screenshot of Firestore audit log collection

## Risks and Mitigations

### Risk 1: Accidental Mass Deletion
**Risk**: User accidentally deletes many products.

**Mitigation**:
- Mandatory confirmation dialogs
- Show product count and details clearly
- Limit bulk delete to 100 products
- Consider soft delete with recovery period
- Implement "undo" feature (future enhancement)

### Risk 2: Audit Log Failure
**Risk**: Audit log write fails but product still deleted.

**Mitigation**:
- Use Firestore batch writes (atomic)
- Fail entire operation if audit log fails
- Implement retry logic for transient failures
- Log errors to error tracking service

### Risk 3: Performance with Large Batches
**Risk**: Bulk delete of 100 products may be slow or fail.

**Mitigation**:
- Set conservative batch size limit (100)
- Implement progress indicator for large batches
- Consider chunking deletes in background
- Test with maximum batch size in staging

### Risk 4: Cascade Delete Issues
**Risk**: Deleting product may orphan related data.

**Mitigation**:
- Document data relationships
- Implement cascade delete if needed
- Check for related data before delete
- Warn user if deletion affects other records

### Risk 5: Permission Bypass
**Risk**: Client-side checks bypassed by malicious user.

**Mitigation**:
- Enforce permissions in Firestore Rules
- Validate on backend (Cloud Function)
- Log all delete attempts
- Monitor for suspicious activity

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests for delete flows passing
- [ ] Firestore security rules updated
- [ ] Audit logging verified in staging
- [ ] Code reviewed and approved
- [ ] Deployed to staging
- [ ] Evidence artifacts captured (screenshots, video)
- [ ] Bulk delete tested with 100 products
- [ ] Documentation updated
- [ ] Ledger updated with completion status

## Success Metrics

- **Safety**: 0 accidental deletes (all confirmed)
- **Reliability**: 100% audit log coverage
- **Performance**: Delete operations < 2 seconds
- **Coverage**: Test coverage > 80% for delete code

## Dependencies and Coordination

- Should be implemented after LP-002 (Column Configuration) to show correct details in confirmation
- Can be implemented in parallel with LP-004 (Search)
- Audit logging system will be reused for other operations

---

**LP Version**: 1.0  
**Created**: 2026-01-09  
**Last Updated**: 2026-01-09  
**Status**: Ready for Implementation
