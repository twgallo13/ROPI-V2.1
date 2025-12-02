/**
 * Smoke Tests for ObservationsPanel component
 * 
 * Basic rendering and integration tests for ObservationsPanel
 * with Firestore service integration.
 * 
 * Note: Full interaction tests are covered by observations service tests (12/12 passing).
 * These tests verify component renders correctly with mocked service.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import ObservationsPanel from './ObservationsPanel';
import * as observationsService from '../../services/observations';
import * as UserContext from '../../contexts/UserContext';
import * as firebaseConfig from '../../firebaseConfig';

// Mock modules
vi.mock('../../services/observations');
vi.mock('../../contexts/UserContext');
vi.mock('../../firebaseConfig');

const mockUser = { uid: 'test_user_123', name: 'Test User' };

describe('ObservationsPanel - Smoke Tests', () => {
  it('renders with basic structure', () => {
    vi.mocked(UserContext.useUser).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);

    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <ObservationsPanel productId="prod123" />
      </BrowserRouter>
    );

    expect(screen.getByText('Observations')).toBeInTheDocument();
    expect(screen.getByText('+ Add Observation')).toBeInTheDocument();
  });

  it('calls listenToObservations on mount', () => {
    vi.mocked(UserContext.useUser).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);

    const mockListen = vi.fn().mockReturnValue(vi.fn());
    vi.mocked(observationsService.listenToObservations).mockImplementation(mockListen);

    render(
      <BrowserRouter>
        <ObservationsPanel productId="prod123" />
      </BrowserRouter>
    );

    expect(mockListen).toHaveBeenCalledWith('prod123', expect.any(Function));
  });

  it('shows offline banner when Firebase unavailable', () => {
    vi.mocked(UserContext.useUser).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(false);

    vi.mocked(observationsService.listenToObservations).mockReturnValue(vi.fn());

    render(
      <BrowserRouter>
        <ObservationsPanel productId="prod123" />
      </BrowserRouter>
    );

    expect(screen.getByText('Offline Mode - Changes saved locally')).toBeInTheDocument();
    expect(screen.getByText('Retry Sync')).toBeInTheDocument();
  });
});
