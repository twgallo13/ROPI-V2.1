/**
 * Products List Page
 * 
 * LP-1.3.5: Products filters & pagination
 * 
 * Features:
 * - Table view as default (cards as optional toggle)
 * - Server-side pagination with Next/Prev navigation
 * - Rows-per-page selector (25/50/100) - default 25
 * - Enhanced filters: Brand (dropdown), Department (enum), Status, Import Date (date-range)
 * - Header checkbox + select-visible for bulk operations
 * - Bulk action toolbar with progress indicators
 * - Search by SKU, MPN, name, or attributes
 * 
 * AOSS Compliance:
 * - Mobile-first design
 * - Accessible controls with proper labels and ARIA
 * - Consistent spacing and typography
 * - Defensive loading states
 */

import { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { Pagination } from '@/components/common/Pagination';
import { ProductsTable, BulkActionToolbar } from '@/components/products';
import { useProducts, type ProductSummary, type ProductFilters } from '@/hooks/useProducts';
import { usePageTitle } from '@/hooks/usePageTitle';
import './ProductsPage.css';

// Department enum values from attributeRegistry.json
const DEPARTMENT_OPTIONS = ['Mens', 'Womens', 'Kids', 'Unisex', 'Boys', 'Girls'];

// Status options
const STATUS_OPTIONS = ['draft', 'pending', 'active', 'discontinued'];

// Default rows per page
const DEFAULT_ROWS_PER_PAGE = 25;

/**
 * View Mode Toggle
 */
type ViewMode = 'table' | 'cards';

/**
 * Product Card Component (for card view)
 */
interface ProductCardProps {
  product: ProductSummary;
  selected: boolean;
  onSelect: (selected: boolean) => void;
}

function ProductCard({ product, selected, onSelect }: ProductCardProps) {
  const {
    id,
    sku,
    name,
    status,
    brand,
    category,
    department,
    websites = [],
    imageUrl,
  } = product;

  return (
    <div className={`product-card ${selected ? 'product-card--selected' : ''}`}>
      {/* Selection Checkbox */}
      <div className="product-card__checkbox">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          aria-label={`Select ${name || sku || id}`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <Link
        to={`/products/${id}`}
        className="product-card__link"
        aria-label={`View product ${name || sku || id}`}
      >
        {/* Product Image */}
        <div className="product-card__image">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name || sku || 'Product'}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.querySelector('.product-card__image-fallback')?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div className={`product-card__image-placeholder ${imageUrl ? 'product-card__image-fallback hidden' : ''}`}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        </div>

        {/* Product Info */}
        <div className="product-card__content">
          {sku && (
            <div className="product-card__sku" title={`SKU: ${sku}`}>
              {sku}
            </div>
          )}

          <h3 className="product-card__name">{name || 'Unnamed Product'}</h3>

          {(brand || category) && (
            <div className="product-card__meta">
              {brand && <span>{brand}</span>}
              {brand && category && <span className="product-card__separator">•</span>}
              {category && <span>{category}</span>}
            </div>
          )}

          {department && (
            <div className="product-card__department">{department}</div>
          )}

          <div className="product-card__footer">
            {status && (
              <span
                className={`product-card__status product-card__status--${status.toLowerCase()}`}
                title={`Status: ${status}`}
              >
                {status}
              </span>
            )}

            {websites.length > 0 && (
              <div className="product-card__websites" title={`Websites: ${websites.join(', ')}`}>
                {websites.slice(0, 3).map((site) => (
                  <span key={site} className="product-card__website-badge">
                    {site}
                  </span>
                ))}
                {websites.length > 3 && (
                  <span className="product-card__website-badge">+{websites.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

/**
 * Products Page Component
 */
function ProductsPage() {
  // Set page title
  usePageTitle('Products');
  
  // View mode state (table is default)
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Pagination state (UI page number, 1-indexed)
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  
  // Search input state
  const [searchInput, setSearchInput] = useState('');
  
  // Date range filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  // Hook for fetching products
  const {
    items,
    loading,
    error,
    hasMore,
    total,
    search,
    setSearch,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    refresh,
    bulkDeleteProducts,
  } = useProducts({
    limit: itemsPerPage,
    autoLoad: true,
    debounceMs: 300,
  });

  // Get unique brands from current items for dropdown
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    items.forEach(item => {
      if (item.brand) brands.add(item.brand);
    });
    return Array.from(brands).sort();
  }, [items]);

  /**
   * Handle search form submission
   */
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(searchInput);
      setCurrentPage(1);
    },
    [searchInput, setSearch]
  );

  /**
   * Handle search input change
   */
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      if (value === '' && search !== '') {
        setSearch('');
        setCurrentPage(1);
      }
    },
    [search, setSearch]
  );

  /**
   * Handle clear search
   */
  const handleClearSearch = useCallback(() => {
    setSearchInput('');
    setSearch('');
    setCurrentPage(1);
  }, [setSearch]);

  /**
   * Handle filter changes
   */
  const handleFilterChange = useCallback(
    (key: keyof ProductFilters, value: string | undefined) => {
      setFilters({ ...filters, [key]: value || undefined });
      setCurrentPage(1);
      setSelectedIds(new Set()); // Clear selection when filters change
    },
    [filters, setFilters]
  );

  /**
   * Handle date range filter
   * Validates from <= to and normalizes to ISO strings for API
   */
  const handleDateRangeChange = useCallback(
    (from: string, to: string) => {
      // Validate date range: from should not be after to
      if (from && to && new Date(from) > new Date(to)) {
        // Swap if from > to
        [from, to] = [to, from];
      }
      
      setDateFrom(from);
      setDateTo(to);
      
      // Wire to API filters - normalize times for date range query
      // dateFrom: start of day, dateTo: end of day (handled by API)
      setFilters({
        ...filters,
        dateFrom: from || undefined,
        dateTo: to || undefined,
      });
      
      setCurrentPage(1);
    },
    [filters, setFilters]
  );

  /**
   * Clear all filters
   */
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [setFilters]);

  /**
   * Handle sort column click
   */
  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
        setSortBy(field);
        setSortDir('desc');
      }
      setCurrentPage(1);
    },
    [sortBy, sortDir, setSortBy, setSortDir]
  );

  /**
   * Handle page change
   */
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      setSelectedIds(new Set()); // Clear selection when page changes
      // Note: For cursor-based pagination, we'd need to track page tokens
    },
    []
  );

  /**
   * Handle items per page change
   */
  const handleItemsPerPageChange = useCallback(
    (count: number) => {
      setItemsPerPage(count);
      setCurrentPage(1);
      setSelectedIds(new Set());
      // This will trigger a refresh via the hook
    },
    []
  );

  /**
   * Handle select all visible
   */
  const handleSelectAll = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedIds(new Set(items.map(p => p.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [items]
  );

  /**
   * Handle select one
   */
  const handleSelectOne = useCallback(
    (id: string, selected: boolean) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (selected) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
    },
    []
  );

  /**
   * Handle bulk action
   */
  const handleBulkAction = useCallback(
    async (action: string) => {
      const ids = Array.from(selectedIds);
      console.log(`Bulk action: ${action}`, ids);
      
      // TODO: Implement actual bulk actions
      switch (action) {
        case 'export':
          alert(`Export ${ids.length} products (not yet implemented)`);
          break;
        case 'setStatus':
          alert(`Set status for ${ids.length} products (not yet implemented)`);
          break;
        case 'delete':
          if (confirm(`Delete ${ids.length} products? This cannot be undone.`)) {
            const idsArray = Array.from(ids);
            bulkDeleteProducts(idsArray)
              .then(() => {
                alert(`Successfully deleted ${ids.length} products`);
                setSelectedIds(new Set());
              })
              .catch((error: Error) => {
                alert(`Failed to delete products: ${error.message}`);
              });
            return; // Don't clear selection yet, will clear on success
          }
          break;
      }
      
      // Clear selection after action
      setSelectedIds(new Set());
    },
    [selectedIds, bulkDeleteProducts]
  );

  // Check if any filters are active
  const hasActiveFilters = filters.brand || filters.status || filters.category || filters.department || dateFrom || dateTo;

  return (
    <PageLayout title="Products">
      <div className="products-page">
        {/* Header with View Toggle */}
        <div className="products-page__header">
          <div className="products-page__title-row">
            <h1 className="products-page__title">Products</h1>
            
            {/* View Mode Toggle */}
            <div className="products-page__view-toggle" role="group" aria-label="View mode">
              <button
                type="button"
                className={`products-page__view-btn ${viewMode === 'table' ? 'products-page__view-btn--active' : ''}`}
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                title="Table view"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="3" y1="9" x2="21" y2="9" />
                  <line x1="3" y1="15" x2="21" y2="15" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                </svg>
              </button>
              <button
                type="button"
                className={`products-page__view-btn ${viewMode === 'cards' ? 'products-page__view-btn--active' : ''}`}
                onClick={() => setViewMode('cards')}
                aria-pressed={viewMode === 'cards'}
                title="Card view"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="products-page__search">
          <form onSubmit={handleSearch} className="search-form">
            <label htmlFor="product-search" className="search-form__label">
              Search products
            </label>
            <div className="search-form__input-group">
              <input
                id="product-search"
                type="search"
                className="search-form__input"
                placeholder="Search by SKU, name, or attributes..."
                value={searchInput}
                onChange={handleSearchInputChange}
                aria-label="Search products"
              />
              {searchInput && (
                <button
                  type="button"
                  className="search-form__clear"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
              <button
                type="submit"
                className="search-form__submit"
                aria-label="Search"
                title="Search"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>
            </div>
          </form>

          {search && (
            <div className="products-page__search-indicator">
              Searching for: <strong>{search}</strong>
              <button
                type="button"
                className="products-page__search-clear"
                onClick={handleClearSearch}
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Filters Row */}
        <div className="products-page__filters">
          {/* Brand Filter (Dropdown) */}
          <div className="products-page__filter">
            <label htmlFor="brand-filter" className="products-page__filter-label">
              Brand:
            </label>
            <select
              id="brand-filter"
              className="products-page__filter-select"
              value={filters.brand || ''}
              onChange={(e) => handleFilterChange('brand', e.target.value)}
              aria-label="Filter by brand"
            >
              <option value="">All Brands</option>
              {availableBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter (Enum) */}
          <div className="products-page__filter">
            <label htmlFor="department-filter" className="products-page__filter-label">
              Department:
            </label>
            <select
              id="department-filter"
              className="products-page__filter-select"
              value={filters.department || ''}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              aria-label="Filter by department"
            >
              <option value="">All Departments</option>
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="products-page__filter">
            <label htmlFor="status-filter" className="products-page__filter-label">
              Status:
            </label>
            <select
              id="status-filter"
              className="products-page__filter-select"
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Import Date Range */}
          <div className="products-page__filter products-page__filter--date-range">
            <label className="products-page__filter-label">
              Import Date:
            </label>
            <div className="products-page__date-inputs">
              <input
                type="date"
                className="products-page__filter-input products-page__filter-input--date"
                value={dateFrom}
                onChange={(e) => handleDateRangeChange(e.target.value, dateTo)}
                aria-label="Import date from"
                placeholder="From"
              />
              <span className="products-page__date-separator">–</span>
              <input
                type="date"
                className="products-page__filter-input products-page__filter-input--date"
                value={dateTo}
                onChange={(e) => handleDateRangeChange(dateFrom, e.target.value)}
                aria-label="Import date to"
                placeholder="To"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              className="products-page__clear-filters"
              onClick={handleClearFilters}
              title="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Sort Controls (for table view, sort is in column headers) */}
        {viewMode === 'cards' && (
          <div className="products-page__controls">
            <div className="products-page__sort">
              <label htmlFor="sort-select" className="products-page__sort-label">
                Sort by:
              </label>
              <select
                id="sort-select"
                className="products-page__sort-select"
                value={`${sortBy}-${sortDir}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split('-');
                  setSortBy(field);
                  setSortDir(direction as 'asc' | 'desc');
                }}
                aria-label="Sort products"
              >
                <option value="updatedAt-desc">Recently Updated</option>
                <option value="updatedAt-asc">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="sku-asc">SKU (A-Z)</option>
                <option value="sku-desc">SKU (Z-A)</option>
                <option value="createdAt-desc">Recently Created</option>
                <option value="createdAt-asc">Oldest Created</option>
              </select>
            </div>
          </div>
        )}

        {/* Bulk Action Toolbar */}
        <BulkActionToolbar
          selectedCount={selectedIds.size}
          onClearSelection={() => setSelectedIds(new Set())}
          onBulkAction={handleBulkAction}
        />

        {/* Results Count */}
        {!loading && items.length > 0 && (
          <div className="products-page__results-count">
            {total ? `${total} product${total !== 1 ? 's' : ''}` : `${items.length} product${items.length !== 1 ? 's' : ''}`}
            {hasMore && !total && ' (more available)'}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="products-page__error" role="alert">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <button onClick={refresh} className="products-page__retry">
              Try Again
            </button>
          </div>
        )}

        {/* Loading State (Initial) */}
        {loading && items.length === 0 && (
          <div className="products-page__loading" role="status" aria-live="polite">
            <div className="spinner" />
            <p>Loading products...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && items.length === 0 && (
          <div className="products-page__empty">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <h3>No products found</h3>
            {search ? (
              <p>
                No products match "{search}". Try a different search term or{' '}
                <button onClick={handleClearSearch} className="link-button">
                  clear the search
                </button>
                .
              </p>
            ) : hasActiveFilters ? (
              <p>
                No products match the current filters.{' '}
                <button onClick={handleClearFilters} className="link-button">
                  Clear filters
                </button>
                .
              </p>
            ) : (
              <p>
                Your product catalog is empty. Import products from RetailOps or add them manually.
              </p>
            )}
          </div>
        )}

        {/* Products Content */}
        {items.length > 0 && (
          <>
            {viewMode === 'table' ? (
              <ProductsTable
                products={items}
                selectedIds={selectedIds}
                onSelectAll={handleSelectAll}
                onSelectOne={handleSelectOne}
                sortBy={sortBy}
                sortDir={sortDir}
                onSort={handleSort}
              />
            ) : (
              <div className="products-page__grid">
                {items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedIds.has(product.id)}
                    onSelect={(selected) => handleSelectOne(product.id, selected)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalItems={total || items.length}
              itemsPerPage={itemsPerPage}
              hasMore={hasMore}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
              loading={loading}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default ProductsPage;
