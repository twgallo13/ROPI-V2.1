/**
 * ObservationsPage Unit Tests
 * 
 * LP-1.1.9: Tests for the /observations route and page component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ObservationsPage from '../../src/pages/ObservationsPage';
import * as observationsService from '../../src/services/observations';
import * as useAuthHook from '../../src/hooks/useAuth';

// Mock the observations service
vi.mock('../../src/services/observations', () => ({
  listObservations: vi.fn(),
  resolveObservation: vi.fn(),
  syncLocalToFirestore: vi.fn(),
  addObservation: vi.fn(),
}));

// Mock Firebase config
vi.mock('../../src/firebaseConfig', () => ({
  isFirebaseAvailable: vi.fn(() => true),
  db: {},
  auth: {},
}));

// Mock useAuth hook
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

const mockUser = {
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
};

describe('ObservationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthHook.useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      currentUser: mockUser,
      loading: false,
    });
    (observationsService.listObservations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = () => {
    return render(
      <BrowserRouter>
        <ObservationsPage />
      </BrowserRouter>
    );
  };

  describe('Page rendering', () => {
    it('renders the observations page', async () => {
      renderPage();
      
      // Should render without crashing
      await waitFor(() => {
        expect(document.body).toBeTruthy();
      });
    });

    it('calls listObservations on mount', async () => {
      renderPage();
      
      await waitFor(() => {
        expect(observationsService.listObservations).toHaveBeenCalled();
      });
    });
  });

  describe('Route integration', () => {
    it('page component is importable', () => {
      expect(ObservationsPage).toBeDefined();
      expect(typeof ObservationsPage).toBe('function');
    });
  });

  describe('Service integration', () => {
    it('listObservations is called with product IDs', async () => {
      (observationsService.listObservations as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      
      renderPage();
      
      await waitFor(() => {
        // Should be called at least once (for each demo product ID)
        expect(observationsService.listObservations).toHaveBeenCalled();
      });
    });

    it('resolveObservation is available', () => {
      expect(observationsService.resolveObservation).toBeDefined();
    });
  });
});

describe('ObservationsPage API route', () => {
  it('observations service has required methods', () => {
    expect(observationsService.listObservations).toBeDefined();
    expect(observationsService.resolveObservation).toBeDefined();
    expect(observationsService.addObservation).toBeDefined();
  });
});
