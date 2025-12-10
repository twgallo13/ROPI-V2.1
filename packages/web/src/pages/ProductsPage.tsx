/**
 * Products List Page
 * 
 * Mobile-first, AOSS-aligned products list with search, pagination, and filtering.
 * 
 * Features:
 * - Server-side pagination with infinite scroll
 * - Search by SKU, MPN, name, or attributes
 * - Product cards with status badges and website indicators
 * - Direct links to Product Editor
 * - Responsive grid layout (1-col mobile, 2-col tablet, 3-col desktop)
 * - Single-thumb friendly controls
 * 
 * AOSS Compliance:
 * - Mobile-first design
 * - Brockman tone for help text
 * - Accessible controls with proper labels and ARIA
 * - Consistent spacing and typography
 * - Defensive loading states
 * 
 * Homer Products List v1.0
 * 
 * References:
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * - Product Completion Workflows: https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { useProducts, type ProductSummary } from '@/hooks/useProducts';
import './ProductsPage.css';

/**
 * Product Card Component
 */
interface ProductCardProps {
  product: ProductSummary;
}

function ProductCard({ product }: ProductCardProps) {
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
    <Link
      to={`/products/${id}`}
      className="product-card"
      aria-label={`View product ${name || sku || id}`}
    >
      {/* Product Image */}
      <div className="product-card__image">
        {imageUrl ? (
          <img src={imageUrl} alt={name || sku || 'Product'} loading="lazy" />
        ) : (
          <div className="product-card__image-placeholder">
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
        )}
      </div>

      {/* Product Info */}
      <div className="product-card__content">
        {/* SKU */}
        {sku && (
          <div className="product-card__sku" title={`SKU: ${sku}`}>
            {sku}
          </div>
        )}

        {/* Name */}
        <h3 className="product-card__name">{name || 'Unnamed Product'}</h3>

        {/* Brand & Category */}
        {(brand || category) && (
          <div className="product-card__meta">
            {brand && <span>{brand}</span>}
            {brand && category && <span className="product-card__separator">•</span>}
            {category && <span>{category}</span>}
          </div>
        )}

        {/* Department */}
        {department && (
          <div className="product-card__department">{department}</div>
        )}

        {/* Footer: Status & Websites */}
        <div className="product-card__footer">
          {/* Status Badge */}
          {status && (
            <span
              className={`product-card__status product-card__status--${status.toLowerCase()}`}
              title={`Status: ${status}`}
            >
              {status}
            </span>
          )}

          {/* Website Badges */}
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
  );
}

/**
 * Products Page Component
 */
function ProductsPage() {
  const [searchInput, setSearchInput] = useState('');
  
  // Enhanced hook with filters and sorting
  const {
    items,
    loading,
    error,
    hasMore,
    search,
    setSearch,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    loadMore,
    refresh,
  } = useProducts({
    limit: 50,
    autoLoad: true,
    debounceMs: 300,
  });

  /**
   * Handle search form submission
   */
  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearch(searchInput);
    },
    [searchInput, setSearch]
  );

  /**
   * Handle search input change (clear search if empty)
   */
  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      if (value === '' && search !== '') {
        setSearch('');
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
  }, [setSearch]);

  return (
    <PageLayout title="Products">
      <div className="products-page">
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

          {/* Active Search Indicator */}
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

        {/* Filters and Sort Controls */}
        <div className="products-page__controls">
          {/* Sort Dropdown */}
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

          {/* Filter Controls */}
          <div className="products-page__filters">
            {/* Brand Filter */}
            <div className="products-page__filter">
              <label htmlFor="brand-filter" className="products-page__filter-label">
                Brand:
              </label>
              <input
                id="brand-filter"
                type="text"
                className="products-page__filter-input"
                placeholder="Filter by brand..."
                value={filters.brand || ''}
                onChange={(e) => setFilters({ ...filters, brand: e.target.value || undefined })}
                aria-label="Filter by brand"
              />
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
                onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>

            {/* Category Filter */}
            <div className="products-page__filter">
              <label htmlFor="category-filter" className="products-page__filter-label">
                Category:
              </label>
              <input
                id="category-filter"
                type="text"
                className="products-page__filter-input"
                placeholder="Filter by category..."
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
                aria-label="Filter by category"
              />
            </div>

            {/* Department Filter */}
            <div className="products-page__filter">
              <label htmlFor="department-filter" className="products-page__filter-label">
                Department:
              </label>
              <input
                id="department-filter"
                type="text"
                className="products-page__filter-input"
                placeholder="Filter by department..."
                value={filters.department || ''}
                onChange={(e) => setFilters({ ...filters, department: e.target.value || undefined })}
                aria-label="Filter by department"
              />
            </div>

            {/* Clear Filters Button */}
            {(filters.brand || filters.status || filters.category || filters.department) && (
              <button
                type="button"
                className="products-page__clear-filters"
                onClick={() => setFilters({})}
                title="Clear all filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Count */}
        {!loading && items.length > 0 && (
          <div className="products-page__results-count">
            {items.length} product{items.length !== 1 ? 's' : ''}
            {hasMore && ' (more available)'}
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
            ) : (
              <p>
                Your product catalog is empty. Import products from RetailOps or add them manually.
              </p>
            )}
          </div>
        )}

        {/* Products Grid */}
        {items.length > 0 && (
          <>
            <div className="products-page__grid">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="products-page__load-more">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="load-more-button"
                  aria-label="Load more products"
                >
                  {loading ? (
                    <>
                      <div className="spinner spinner--small" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default ProductsPage;
