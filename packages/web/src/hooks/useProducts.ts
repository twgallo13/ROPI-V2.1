/**
 * useProducts Hook
 * 
 * Fetches and manages products list with server-side pagination and search.
 * 
 * Features:
 * - Server-side pagination with pageToken
 * - Search by SKU, MPN, name, or attributes
 * - Automatic auth header injection (waits for Firebase auth)
 * - Loading and error states
 * - Refresh and loadMore actions
 * 
 * AOSS Compliance:
 * - Uses getAuthHeaders() to avoid 401 race conditions
 * - Defensive error handling
 * - Mobile-first design considerations
 * 
 * Lisa v1.0.0 + Homer Products List
 * 
 * References:
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * - Product Completion Workflows: https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '../lib/authHeaders';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface ProductSummary {
  id: string;
  sku?: string;
  mpn?: string;
  name?: string;
  status?: string;
  brand?: string;
  category?: string;
  department?: string;
  class?: string;
  websites?: string[];
  imageUrl?: string;
  updatedAt?: string;
  createdAt?: string;
  attributes?: Record<string, unknown>;
}

export interface ProductsListResponse {
  items: ProductSummary[];
  hasMore?: boolean;
  pageToken?: string;
  total?: number;
}

export interface ProductFilters {
  brand?: string;
  status?: string;
  category?: string;
  department?: string;
}

export interface UseProductsOptions {
  limit?: number;
  initialSearch?: string;
  initialFilters?: ProductFilters;
  initialSortBy?: string;
  initialSortDir?: 'asc' | 'desc';
  autoLoad?: boolean;
  debounceMs?: number;
}

export interface UseProductsResult {
  items: ProductSummary[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  pageToken: string | null;
  total: number | null;
  search: string;
  filters: ProductFilters;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  setSearch: (search: string) => void;
  setFilters: (filters: ProductFilters) => void;
  setSortBy: (sortBy: string) => void;
  setSortDir: (sortDir: 'asc' | 'desc') => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
}

/**
 * useProducts - Fetch and manage products list
 * 
 * @param options - Configuration options
 * @returns Products list state and actions
 * 
 * @example
 * ```tsx
 * const { items, loading, error, hasMore, loadMore, search, setSearch } = useProducts({
 *   limit: 24,
 *   autoLoad: true,
 * });
 * 
 * return (
 *   <div>
 *     <input value={search} onChange={e => setSearch(e.target.value)} />
 *     {items.map(product => <ProductCard key={product.id} product={product} />)}
 *     {hasMore && <button onClick={loadMore}>Load More</button>}
 *   </div>
 * );
 * ```
 */
export function useProducts(options: UseProductsOptions = {}): UseProductsResult {
  const {
    limit = 50,
    initialSearch = '',
    initialFilters = {},
    initialSortBy = 'updatedAt',
    initialSortDir = 'desc',
    autoLoad = true,
    debounceMs = 300,
  } = options;

  const [items, setItems] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [pageToken, setPageToken] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);

  /**
   * Fetch products from API with auth headers
   */
  const fetchProducts = useCallback(async (
    reset: boolean = false,
    searchQuery: string = debouncedSearch,
    currentFilters: ProductFilters = filters,
    currentSortBy: string = sortBy,
    currentSortDir: 'asc' | 'desc' = sortDir,
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Get auth headers (waits for Firebase auth to be ready)
      const headers = await getAuthHeaders();

      // Build query params
      const params = new URLSearchParams({
        limit: limit.toString(),
        sortBy: currentSortBy,
        sortDir: currentSortDir,
      });

      if (!reset && pageToken) {
        params.append('pageToken', pageToken);
      }

      if (searchQuery) {
        params.append('q', searchQuery);
      }

      // Add filter params
      if (currentFilters.brand) {
        params.append('brand', currentFilters.brand);
      }
      if (currentFilters.status) {
        params.append('status', currentFilters.status);
      }
      if (currentFilters.category) {
        params.append('category', currentFilters.category);
      }
      if (currentFilters.department) {
        params.append('department', currentFilters.department);
      }

      // Fetch from API
      const url = `${API_BASE}/api/products?${params.toString()}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Please sign in again.');
        }
        if (response.status === 403) {
          throw new Error('You do not have permission to view products.');
        }
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }

      const data: ProductsListResponse = await response.json();

      // Update state
      if (reset) {
        setItems(data.items || []);
      } else {
        setItems(prev => [...prev, ...(data.items || [])]);
      }

      setHasMore(data.hasMore ?? false);
      setPageToken(data.pageToken ?? null);
      setTotal(data.total ?? null);

    } catch (err) {
      console.error('[useProducts] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [limit, pageToken, debouncedSearch, filters, sortBy, sortDir]);

  /**
   * Refresh products list (reset pagination)
   */
  const refresh = useCallback(async (): Promise<void> => {
    setPageToken(null);
    await fetchProducts(true);
  }, [fetchProducts]);

  /**
   * Load more products (next page)
   */
  const loadMore = useCallback(async (): Promise<void> => {
    if (!loading && hasMore) {
      await fetchProducts(false);
    }
  }, [loading, hasMore, fetchProducts]);

  /**
   * Update search query and refresh
   */
  const handleSetSearch = useCallback((newSearch: string) => {
    setSearch(newSearch);
    setPageToken(null);
    // Trigger refresh will happen in effect below
  }, []);

  /**
   * Debounce search input
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [search, debounceMs]);

  /**
   * Auto-load products when debounced search, filters, or sorting changes
   */
  useEffect(() => {
    if (autoLoad) {
      fetchProducts(true);
    }
  }, [debouncedSearch, filters, sortBy, sortDir, autoLoad]); // Trigger on filter/sort changes

  /**
   * Custom filter setter that resets pagination
   */
  const handleSetFilters = useCallback((newFilters: ProductFilters) => {
    setFilters(newFilters);
    setPageToken(null);
  }, []);

  /**
   * Custom sort setters that reset pagination
   */
  const handleSetSortBy = useCallback((newSortBy: string) => {
    setSortBy(newSortBy);
    setPageToken(null);
  }, []);

  const handleSetSortDir = useCallback((newSortDir: 'asc' | 'desc') => {
    setSortDir(newSortDir);
    setPageToken(null);
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    pageToken,
    total,
    search,
    setSearch: handleSetSearch,
    filters,
    setFilters: handleSetFilters,
    sortBy,
    setSortBy: handleSetSortBy,
    sortDir,
    setSortDir: handleSetSortDir,
    refresh,
    loadMore,
  };
}

export default useProducts;
