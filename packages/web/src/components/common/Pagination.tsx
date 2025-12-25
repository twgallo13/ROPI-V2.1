/**
 * Pagination Controls Component
 * 
 * Provides page navigation and rows-per-page selector.
 * 
 * LP-1.3.5: Products filters & pagination
 */

import './Pagination.css';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (count: number) => void;
  loading?: boolean;
}

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

export function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  hasMore,
  onPageChange,
  onItemsPerPageChange,
  loading = false,
}: PaginationProps) {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  const canGoPrev = currentPage > 1;
  const canGoNext = hasMore || (currentPage * itemsPerPage < totalItems);

  return (
    <div className="pagination">
      {/* Rows per page selector */}
      <div className="pagination__rows-per-page">
        <label htmlFor="rows-per-page" className="pagination__label">
          Rows per page:
        </label>
        <select
          id="rows-per-page"
          className="pagination__select"
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          disabled={loading}
          aria-label="Rows per page"
        >
          {ROWS_PER_PAGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {/* Item range display */}
      <div className="pagination__info">
        {totalItems > 0 ? (
          <span>
            {startItem}–{endItem} of {totalItems}{hasMore ? '+' : ''}
          </span>
        ) : (
          <span>No items</span>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="pagination__nav">
        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev || loading}
          aria-label="Previous page"
          title="Previous page"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="pagination__btn-text">Prev</span>
        </button>

        <span className="pagination__page-indicator">
          Page {currentPage}
        </span>

        <button
          type="button"
          className="pagination__btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext || loading}
          aria-label="Next page"
          title="Next page"
        >
          <span className="pagination__btn-text">Next</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default Pagination;
