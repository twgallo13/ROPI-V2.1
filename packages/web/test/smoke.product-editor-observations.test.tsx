/**
 * Smoke Test: Product Editor with Observations Panel
 * 
 * Basic integration test to verify ProductEditorPage renders with wired ObservationsPanel.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProductEditorPage from '../src/pages/ProductEditorPage';
import * as observationsService from '../src/services/observations';
import { AuthProvider } from '../src/contexts/AuthProvider';
import * as firebaseConfig from '../src/firebaseConfig';

// Mock modules
vi.mock('../src/services/observations');
vi.mock('../src/firebaseConfig');
vi.mock('../src/hooks/useProduct', () => ({
  useProduct: () => ({
    product: {
      id: '123',
      sku: 'TEST-SKU-001',
      name: 'Test Product',
      status: 'in-progress',
      websites: ['north-america', 'europe'],
      observations: [],
      smartSuggestions: [],
      exportReadiness: {
        overall: 75,
        byWebsite: {
          'north-america': { 
            score: 80, 
            checklist: {
              coreInfo: true,
              attributes: true,
              descriptions: true,
              media: false,
              pricing: true,
            } 
          },
          'europe': { 
            score: 70, 
            checklist: {
              coreInfo: true,
              attributes: true,
              descriptions: false,
              media: false,
              pricing: true,
            } 
          },
        },
      },
      attributes: {},
      descriptions: {},
      media: { heroImage: '', gallery: [] },
      lifecycle: {},
    },
    loading: false,
    saveProduct: vi.fn(),
    updateField: vi.fn(),
    addObservation: vi.fn(),
    resolveObservation: vi.fn(),
    applySuggestion: vi.fn(),
    ignoreSuggestion: vi.fn(),
  }),
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendEmailVerification: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn((auth, callback) => {
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

describe('Smoke Test: ProductEditorPage with Observations', () => {
  it('renders Product Editor with wired ObservationsPanel', () => {
    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);

    const mockListen = vi.fn().mockReturnValue(vi.fn());
    vi.mocked(observationsService.listenToObservations).mockImplementation(mockListen);

    render(
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<ProductEditorPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    );

    // Verify main UI sections render
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getAllByText('Core Information').length).toBeGreaterThan(0); // Tab button
    expect(screen.getByText('Observations')).toBeInTheDocument();
    expect(screen.getByText('Smart Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Export Readiness')).toBeInTheDocument();

    // Verify ObservationsPanel received correct productId
    expect(mockListen).toHaveBeenCalledWith('123', expect.any(Function));
  });
});
