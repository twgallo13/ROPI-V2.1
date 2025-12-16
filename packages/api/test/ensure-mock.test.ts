import admin from 'firebase-admin';

test('firebase-admin auth is available (mocked) in unit tests', () => {
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    return;
  }
  expect(typeof (admin as any).auth).toBe('function');
});
