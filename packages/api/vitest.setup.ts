// packages/api/vitest.setup.ts
import { vi } from 'vitest';

const isEmulator =
  !!process.env.FIREBASE_AUTH_EMULATOR_HOST ||
  !!process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.NODE_ENV === 'test_emulator';

if (!isEmulator) {
  vi.mock('firebase-admin', async (importOriginal) => {
    const actual = await importOriginal();

    // Track initialized apps so tests that check admin.apps work
    const apps: any[] = [];

    const authMock = () => ({
      createUser: vi.fn().mockImplementation(async ({ email }) => ({ uid: `uid-${Math.random().toString(36).slice(2,9)}`, email })),
      updateUser: vi.fn().mockImplementation(async (uid, props) => ({ uid, ...props })),
      deleteUser: vi.fn().mockResolvedValue(undefined),
      getUser: vi.fn().mockImplementation(async (uid) => ({ uid, email: `${uid}@example.com`, customClaims: {} })),
      setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
      generatePasswordResetLink: vi.fn().mockResolvedValue('https://reset.example/'),
      verifyIdToken: vi.fn().mockImplementation(async (token) => {
        if (token && token.startsWith('emulator-')) {
          return { uid: 'emulator-admin', email: 'emulator@local', admin: true };
        }
        return { uid: 'test-uid', email: 'test@example.com', admin: true };
      }),
      listUsers: vi.fn().mockResolvedValue({ users: [], pageToken: undefined }),
    });

    const mockDoc = () => ({
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(undefined),
      collection: vi.fn().mockImplementation(() => mockCollection()),
    });

    const mockCollection = () => ({
      doc: vi.fn().mockImplementation(() => mockDoc()),
      add: vi.fn().mockResolvedValue({ id: 'mock-id' }),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      startAfter: vi.fn().mockReturnThis(),
      startAt: vi.fn().mockReturnThis(),
      endBefore: vi.fn().mockReturnThis(),
      endAt: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ docs: [] }),
    });

    const firestoreMock = vi.fn(() => {
      const batchOps: any[] = [];
      return {
        collection: vi.fn().mockImplementation(() => mockCollection()),
        doc: vi.fn().mockImplementation(() => mockDoc()),
        batch: vi.fn().mockImplementation(() => ({
          set: vi.fn((ref, data) => batchOps.push({ op: 'set', ref, data })),
          update: vi.fn((ref, data) => batchOps.push({ op: 'update', ref, data })),
          delete: vi.fn((ref) => batchOps.push({ op: 'delete', ref })),
          commit: vi.fn().mockResolvedValue(batchOps),
        })),
      };
    });

    const initializeApp = vi.fn((options?: any) => {
      const app = { name: 'mockApp', options: options || {} };
      apps.push(app);
      return app;
    });

    return {
      ...actual,
      auth: authMock,
      firestore: firestoreMock,
      initializeApp,
      credential: actual.credential,
      apps,
    };
  });
} else {
  // Running integration tests against emulator: do not mock admin
  // Optional: console.log('Running in emulator mode: using real firebase-admin')
}
