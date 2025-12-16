// packages/api/vitest.setup.ts
import { vi } from 'vitest';

const isEmulator = !!process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.NODE_ENV === 'test_emulator';

if (!isEmulator) {
  vi.mock('firebase-admin', async (importOriginal) => {
    const actual = await importOriginal();

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
    });

    return {
      ...actual,
      auth: authMock,
      firestore: actual.firestore,
      initializeApp: actual.initializeApp,
      credential: actual.credential,
    };
  });
} else {
  // Running integration tests against emulator: do not mock admin
  // Optional: console.log('Running in emulator mode: using real firebase-admin')
}
