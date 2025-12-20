/**
 * Smoke Tests for ObservationsPanel component
 * 
 * LP-1.1.11: Updated tests for unified observations code path.
 * Tests verify component renders correctly with mocked services.
 * 
 * Note: Full interaction tests are covered by observations service tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ObservationsPanel from './ObservationsPanel';
import * as observationsService from '../../services/observations';
import { AuthProvider } from '../../contexts/AuthProvider';
import * as useObservationsSyncModule from '../../hooks/useObservationsSync';

// Mock modules
vi.mock('../../services/observations');
vi.mock('../../hooks/useObservationsSync');

// Mock useObservationsSync hook
const mockSyncNow = vi.fn().mockResolvedValue({ synced: 0, failed: 0 });
const mockAddObservation = vi.fn().mockResolvedValue({ id: 'test-obs-1' });

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback({ uid: 'test_user_123', email: 'test@example.com', displayName: 'Test User' });
    return vi.fn();
  }),
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  Timestamp: { now: vi.fn(() => ({ seconds: Date.now() / 1000 })) },
}));

describe('ObservationsPanel - Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: online with no pending
    vi.mocked(useObservationsSyncModule.useObservationsSync).mockReturnValue({
      pendingCount: 0,
      isOnline: true,
      isSyncing: false,
      addObservation: mockAddObservation,
      syncNow: mockSyncNow,
      pendingObservations: [],
      refreshPending: vi.fn(),
    });
  });

  it('renders with basic structure', () => {
    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Observations')).toBeInTheDocument();
    expect(screen.getByText('+ Add Observation')).toBeInTheDocument();
  });

  it('calls listenToObservations on mount', () => {
    const mockListen = vi.fn().mockReturnValue(vi.fn());
    vi.mocked(observationsService.listenToObservations).mockImplementation(mockListen);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(mockListen).toHaveBeenCalledWith('prod123', expect.any(Function));
  });

  it('accepts productMpn prop for unified schema', () => {
    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" productMpn="TEST-MPN-001" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Observations')).toBeInTheDocument();
  });

  it('shows offline banner when not online', () => {
    vi.mocked(useObservationsSyncModule.useObservationsSync).mockReturnValue({
      pendingCount: 0,
      isOnline: false,
      isSyncing: false,
      addObservation: mockAddObservation,
      syncNow: mockSyncNow,
      pendingObservations: [],
      refreshPending: vi.fn(),
    });
    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Offline Mode - Changes saved locally')).toBeInTheDocument();
    expect(screen.getByText('Sync Now')).toBeInTheDocument();
  });

  it('shows pending count when observations are queued', () => {
    vi.mocked(useObservationsSyncModule.useObservationsSync).mockReturnValue({
      pendingCount: 3,
      isOnline: true,
      isSyncing: false,
      addObservation: mockAddObservation,
      syncNow: mockSyncNow,
      pendingObservations: [],
      refreshPending: vi.fn(),
    });
    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('3 observations pending sync')).toBeInTheDocument();
  });
});
