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
import * as UserContext from '../src/contexts/UserContext';
import * as firebaseConfig from '../src/firebaseConfig';

// Mock modules
vi.mock('../src/services/observations');
vi.mock('../src/contexts/UserContext');
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

const mockUser = { uid: 'test_user_123', name: 'Test User' };

describe('Smoke Test: ProductEditorPage with Observations', () => {
  it('renders Product Editor with wired ObservationsPanel', () => {
    vi.mocked(UserContext.useUser).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });

    vi.mocked(firebaseConfig.isFirebaseAvailable).mockReturnValue(true);

    const mockListen = vi.fn().mockReturnValue(vi.fn());
    vi.mocked(observationsService.listenToObservations).mockImplementation(mockListen);

    render(
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProductEditorPage />} />
        </Routes>
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
