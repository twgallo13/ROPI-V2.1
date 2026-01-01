/**
 * Smoke Tests for ObservationsPanel component
 * 
 * LP-observations-consolidation-1.0.0: Updated to test listenToProductObservation (SRoT)
 * 
 * Basic rendering and integration tests for ObservationsPanel
 * with Firestore service integration.
 * 
 * Note: Full interaction tests are covered by observations service tests (12/12 passing).
 * These tests verify component renders correctly with mocked service.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ObservationsPanel from './ObservationsPanel';
import * as observationsService from '../../services/observations';
import { AuthProvider } from '../../contexts/AuthProvider';
import * as firebaseConfig from '../../firebaseConfig';

// Mock modules
vi.mock('../../services/observations');
vi.mock('../../firebaseConfig');

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    // Immediately call callback with mock user for tests
    callback({ uid: 'test_user_123', email: 'test@example.com', displayName: 'Test User' });
    return vi.fn(); // unsubscribe function
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
    // LP-observations-consolidation-1.0.0: Mock SRoT listener
    vi.mocked(observationsService.listenToProductObservation).mockReturnValue(vi.fn());
  });

  it('renders with basic structure', () => {
    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);
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
    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);

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

  // LP-observations-consolidation-1.0.0: Test canonical SRoT listener
  it('calls listenToProductObservation on mount (SRoT)', () => {
    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);
    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    const mockProductListen = vi.fn().mockReturnValue(vi.fn());
    vi.mocked(observationsService.listenToProductObservation).mockImplementation(mockProductListen);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(mockProductListen).toHaveBeenCalledWith('prod123', expect.any(Function));
  });

  it('shows offline banner when Firebase unavailable', () => {
    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(false);
    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <AuthProvider>
          <ObservationsPanel productId="prod123" />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Offline Mode - Changes saved locally')).toBeInTheDocument();
    expect(screen.getByText('Retry Sync')).toBeInTheDocument();
  });
});
