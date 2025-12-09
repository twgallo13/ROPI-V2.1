# Tech-Debt: Fix Test Infrastructure - Firebase Auth Mocks + Firestore Emulator

**Priority**: Medium  
**Impact**: Test Reliability and CI/CD Pipeline  
**Category**: Test Infrastructure  
**Created**: 2025-01-XX (Post list endpoint deployment)

---

## Problem Summary

The test suites have pre-existing infrastructure issues that cause false failures unrelated to feature code quality:

1. **Web Tests (12/77 failures)**: Incomplete Firebase Auth mocks across multiple hook tests
2. **API Tests (18/43 failures)**: Firestore emulator not configured for integration tests

These failures are **not caused by recent feature work** - the list endpoint and client materialization code is sound (ImportBatchDetailPage tests: 5/5 passing consistently).

---

## Root Cause Analysis

### Issue 1: Firebase Auth Mocking (Web Tests)

**Affected Files**:
- `packages/web/test/useAttributes.test.tsx` (6/6 tests failing)
- `packages/web/src/hooks/useUsers.test.ts` (6/9 tests failing)

**Root Cause**:
Hooks like `useAttributes` and `useUsers` use Firebase Auth's `onAuthStateChanged` + `getIdToken()` flow to fetch auth tokens for API requests. Test mocks are incomplete:

1. **Missing `onAuthStateChanged` unsubscribe function**: 
   ```typescript
   // Current mock
   vi.mocked(onAuthStateChanged).mockImplementation((auth, callback) => {
     callback(mockUser as any);
     // ❌ Missing: return () => {} (unsubscribe function)
   });
   ```
   **Error**: `TypeError: unsubscribe is not a function`

2. **Missing `getAuth().currentUser` property**:
   ```typescript
   // Current mock
   vi.mocked(getAuth).mockReturnValue({ /* missing currentUser */ } as any);
   ```
   **Error**: `Cannot read properties of undefined (reading 'get')`

3. **Incomplete fetch Response mock**:
   ```typescript
   // Current mock
   global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({...}) });
   // ❌ Missing: text(), headers.get()
   ```
   **Error**: `res.text is not a function`, `Cannot read properties of undefined (reading 'get')`

4. **Missing `authHeaders` module mock**:
   ```typescript
   // No mock for packages/web/src/utils/authHeaders.ts
   ```
   **Error**: Auth token retrieval fails, causing `Authentication required` errors

**Example Stack Trace**:
```
Error fetching attributes: res.text is not a function
    at fetchJSON src/hooks/useAttributes.ts:80:26
    at Object.createAttribute src/hooks/useAttributes.ts:203:21
```

### Issue 2: Firestore Emulator Not Configured (API Tests)

**Affected Files**:
- `packages/api/test/attributes.service.spec.ts` (12/16 tests failing)
- `packages/api/test/productCommitService.test.ts` (6/6 tests failing)

**Root Cause**:
API integration tests attempt to connect to Firestore but fail with:
```
Error: 7 PERMISSION_DENIED: Permission denied on resource project demo-test-project.
```

This indicates tests are trying to connect to a real Firestore project (`demo-test-project`) instead of a local emulator.

**Missing Setup**:
1. No Firestore emulator configuration in test setup
2. No `FIRESTORE_EMULATOR_HOST` environment variable set
3. No emulator startup/teardown in test lifecycle

**Example Stack Trace**:
```
callErrorFromStatus /@grpc/grpc-js/src/call.ts:84:17
ServiceClientImpl.makeUnaryRequest /@grpc/grpc-js/src/client.ts:325:42
WriteBatch.commit /@google-cloud/firestore/build/src/write-batch.js:438:27
```

---

## Impact Assessment

### Current State:
- **Web Tests**: 65/77 passing (84.4% pass rate)
  - ✅ ImportBatchDetailPage: 5/5 passing (feature code tests)
  - ✅ observations.test.ts: 12/12 passing
  - ✅ useProduct.test.ts: 8/8 passing
  - ✅ envPolicy.test.ts: 19/19 passing
  - ❌ useAttributes.test.tsx: 0/6 passing (auth mock issues)
  - ❌ useUsers.test.ts: 3/9 passing (auth mock issues)

- **API Tests**: 8/43 passing (18.6% pass rate)
  - ✅ validation tests: 4/4 passing
  - ✅ importService.test.ts: 4/4 passing
  - ❌ attributes.service.spec.ts: 4/16 passing (emulator needed)
  - ❌ productCommitService.test.ts: 0/6 passing (emulator needed)

### Business Risk:
- **Medium**: Test suite cannot reliably validate feature changes
- **CI/CD Pipeline**: Cannot trust automated test results for deployment decisions
- **Developer Experience**: Developers see failures unrelated to their changes, causing confusion

---

## Proposed Solution

### Task 1: Centralize Firebase Auth Test Setup

**Goal**: Create shared test helpers for Firebase Auth mocking

**Files to Create**:
- `packages/web/test/helpers/mockFirebaseAuth.ts`

**Implementation**:
```typescript
// packages/web/test/helpers/mockFirebaseAuth.ts
import { vi } from 'vitest';
import type { User } from 'firebase/auth';

export function createMockUser(overrides = {}): User {
  return {
    uid: 'test-uid-123',
    email: 'test@example.com',
    getIdToken: vi.fn().mockResolvedValue('mock-jwt-token'),
    displayName: 'Test User',
    emailVerified: true,
    ...overrides,
  } as unknown as User;
}

export function mockFirebaseAuth() {
  const mockUser = createMockUser();
  const unsubscribe = vi.fn();

  // Mock getAuth
  vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
      currentUser: mockUser,
      onAuthStateChanged: vi.fn((callback) => {
        callback(mockUser);
        return unsubscribe;
      }),
    })),
    onAuthStateChanged: vi.fn((auth, callback) => {
      callback(mockUser);
      return unsubscribe;
    }),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  }));

  return { mockUser, unsubscribe };
}

export function mockFetch(responses: Record<string, any>) {
  global.fetch = vi.fn((url: string) => {
    const response = responses[url] || { items: [] };
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: {
        get: (header: string) => header === 'content-type' ? 'application/json' : null,
      },
    } as Response);
  });
}
```

**Update Tests**:
```typescript
// packages/web/test/useAttributes.test.tsx
import { mockFirebaseAuth, mockFetch } from './helpers/mockFirebaseAuth';

describe('useAttributes Hook', () => {
  beforeEach(() => {
    mockFirebaseAuth();
    mockFetch({
      '/admin/settings/attributes': {
        items: [
          { attribute_id: 'color', label: 'Color', data_type: 'enum' },
        ],
      },
    });
  });

  // ... tests
});
```

### Task 2: Configure Firestore Emulator for API Tests

**Goal**: Run API tests against local Firestore emulator

**Prerequisites**:
- Install Firebase emulators: `firebase setup:emulators:firestore`

**Files to Update**:
- `packages/api/vitest.config.ts`
- `packages/api/test/setup.ts` (create if doesn't exist)

**Implementation**:

```typescript
// packages/api/test/setup.ts
import { initializeApp, getApps, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { beforeAll, afterAll, beforeEach } from 'vitest';

let firestoreEmulator: any;

beforeAll(async () => {
  // Start Firestore emulator
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  process.env.GCLOUD_PROJECT = 'demo-test-project';
  
  // Initialize Firebase Admin with emulator
  if (getApps().length === 0) {
    initializeApp({ projectId: 'demo-test-project' });
  }
});

beforeEach(async () => {
  // Clear Firestore data between tests
  const db = getFirestore();
  const collections = await db.listCollections();
  const deletePromises = collections.map((col) => 
    db.recursiveDelete(col)
  );
  await Promise.all(deletePromises);
});

afterAll(async () => {
  // Cleanup
  const apps = getApps();
  await Promise.all(apps.map(app => deleteApp(app)));
  delete process.env.FIRESTORE_EMULATOR_HOST;
});
```

```typescript
// packages/api/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

**Add NPM Script**:
```json
// packages/api/package.json
{
  "scripts": {
    "test": "firebase emulators:exec --only firestore 'vitest run'",
    "test:watch": "firebase emulators:exec --only firestore 'vitest'"
  }
}
```

### Task 3: Document Test Patterns

**Goal**: Create developer guide for writing tests

**Files to Create**:
- `docs/TESTING.md`

**Content**: Include best practices for:
- Mocking Firebase Auth in React hooks
- Using Firestore emulator for API tests
- Shared test helpers location and usage
- Running tests locally vs. CI

---

## Acceptance Criteria

1. ✅ **Web Tests**: All useAttributes tests (6/6) passing with centralized mocks
2. ✅ **Web Tests**: All useUsers tests (9/9) passing with centralized mocks
3. ✅ **API Tests**: All attributes.service.spec.ts tests (16/16) passing with emulator
4. ✅ **API Tests**: All productCommitService.test.ts tests (6/6) passing with emulator
5. ✅ **Documentation**: `docs/TESTING.md` exists with clear examples
6. ✅ **CI Pipeline**: GitHub Actions workflow updated to start emulators before tests

---

## Testing Plan

1. **Local Validation**:
   ```bash
   # Test web with new mocks
   cd packages/web
   pnpm test test/useAttributes.test.tsx
   pnpm test src/hooks/useUsers.test.ts
   
   # Test API with emulator
   cd packages/api
   pnpm test test/attributes.service.spec.ts
   pnpm test test/productCommitService.test.ts
   ```

2. **Full Suite**:
   ```bash
   # Should achieve 100% pass rate (excluding E2E)
   pnpm --filter @ropi-aoss/web test
   pnpm --filter @ropi-aoss/api test
   ```

3. **CI Validation**:
   - Push branch and verify GitHub Actions passes all tests

---

## Effort Estimate

- **Time**: 4-6 hours
- **Complexity**: Medium (requires understanding of Firebase mocking patterns)
- **Dependencies**: None (can be done independently)

---

## Related Issues

- This tech-debt does **not** affect production functionality
- Feature code (list endpoint, client materialization) is working correctly
- ImportBatchDetailPage tests (5/5 passing) demonstrate feature stability

---

## Files Affected

### To Create:
- `packages/web/test/helpers/mockFirebaseAuth.ts`
- `packages/api/test/setup.ts`
- `docs/TESTING.md`

### To Update:
- `packages/web/test/useAttributes.test.tsx`
- `packages/web/src/hooks/useUsers.test.ts`
- `packages/api/vitest.config.ts`
- `packages/api/package.json`
- `.github/workflows/test.yml` (if exists)

---

## Appendix: Test Failure Details

### Web Test Failures (12 total)

**useAttributes.test.tsx (6 failures)**:
```
❌ should fetch attributes on mount
   → expected [] to deeply equal [ …(2) ]
❌ should handle fetch error
   → expected 'Cannot read properties of undefined (…' to be 'Server error'
❌ should create a new attribute and refresh
   → res.text is not a function
❌ should update an existing attribute and refresh
   → res.text is not a function
❌ should delete an attribute and refresh
   → res.text is not a function
❌ should throw error on create failure
   → unsubscribe is not a function
```

**useUsers.test.ts (6 failures)**:
```
❌ should support pagination
   → expected [] to have a length of 1 but got +0
❌ should create a new user
   → Authentication required
❌ should update user properties
   → expected [] to have a length of 1 but got +0
❌ should delete a user
   → expected [] to have a length of 2 but got +0
❌ should send password reset email
   → Authentication required
❌ should fetch available roles
   → expected [] to have a length of 2 but got +0
```

### API Test Failures (18 total)

**attributes.service.spec.ts (12 failures)**:
- All failures: `7 PERMISSION_DENIED: Permission denied on resource project demo-test-project.`

**productCommitService.test.ts (6 failures)**:
- All failures: `7 PERMISSION_DENIED: Permission denied on resource project demo-test-project.`

---

## Sign-off

**Created by**: HOMER AOSS Agent  
**Date**: 2025-01-XX  
**Status**: Ready for Implementation  
**Assigned to**: [TBD]
