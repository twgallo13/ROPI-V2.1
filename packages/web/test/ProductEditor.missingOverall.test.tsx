/**
 * ProductEditor Missing Overall Tests
 * LP-3.0.2: Test that ProductEditorPage renders without errors
 * when product is missing attributes or attributes.overall
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the useProduct hook
const mockSaveProduct = vi.fn();
const mockUpdateField = vi.fn();
const mockApplySuggestion = vi.fn();
const mockIgnoreSuggestion = vi.fn();

vi.mock('../src/hooks/useProduct', () => ({
  useProduct: vi.fn((productId) => ({
    product: {
      id: productId,
      sku: 'TEST-SKU',
      name: 'Test Product',
      brand: 'Test Brand',
      category: 'Test Category',
      status: 'draft',
      // Intentionally missing attributes
      // attributes: undefined
      websites: ['shiekh.com'],
      descriptions: {},
      media: {},
      smartSuggestions: [],
      exportReadiness: {
        overall: 50,
        byWebsite: {},
      },
    },
    loading: false,
    saveProduct: mockSaveProduct,
    updateField: mockUpdateField,
    applySuggestion: mockApplySuggestion,
    ignoreSuggestion: mockIgnoreSuggestion,
  })),
}));

// Mock firebase config
vi.mock('../src/firebaseConfig', () => ({
  isFirebaseAvailable: () => false,
  db: null,
}));

// Mock attribute registry
vi.mock('../src/hooks/useAttributeRegistry', () => ({
  useAttributeRegistry: () => ({
    attributes: [],
    loading: false,
    error: null,
  }),
}));

// Mock AuthProvider/useAuth
vi.mock('../src/contexts/AuthProvider', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback({ uid: 'test-user' });
    return () => {};
  }),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getFirestore: vi.fn(),
}));

// Import after mocks
import ProductEditorPage from '../src/pages/ProductEditorPage';

describe('ProductEditorPage with missing attributes (LP-3.0.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console errors/warnings during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without throwing when product.attributes is undefined', () => {
    // Should not throw TypeError
    expect(() => {
      render(
        <MemoryRouter initialEntries={['/products/TEST-123']}>
          <Routes>
            <Route path="/products/:id" element={<ProductEditorPage />} />
          </Routes>
        </MemoryRouter>
      );
    }).not.toThrow();
  });

  it('displays product name and SKU in header', () => {
    render(
      <MemoryRouter initialEntries={['/products/TEST-123']}>
        <Routes>
          <Route path="/products/:id" element={<ProductEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('TEST-SKU')).toBeInTheDocument();
    expect(screen.getByText('Test Product')).toBeInTheDocument();
  });

  it('renders tab navigation', () => {
    render(
      <MemoryRouter initialEntries={['/products/TEST-123']}>
        <Routes>
          <Route path="/products/:id" element={<ProductEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Core Information')).toBeInTheDocument();
    expect(screen.getByText('Product Attributes')).toBeInTheDocument();
    expect(screen.getByText('Descriptions & SEO')).toBeInTheDocument();
  });

  it('renders Export Readiness panel with percentage', () => {
    render(
      <MemoryRouter initialEntries={['/products/TEST-123']}>
        <Routes>
          <Route path="/products/:id" element={<ProductEditorPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Export Readiness')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
