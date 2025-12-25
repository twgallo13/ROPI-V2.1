/**
 * Products Table Component
 * 
 * Table view for products list with sortable columns and row selection.
 * 
 * LP-1.3.5: Products filters & pagination
 * 
 * Features:
 * - Sortable column headers
 * - Row selection with checkboxes
 * - Responsive design with horizontal scroll on mobile
 * - Status badges with color coding
 * - Direct links to Product Editor
 */

import { Link } from 'react-router-dom';
import type { ProductSummary } from '@/hooks/useProducts';
import './ProductsTable.css';

export interface ProductsTableProps {
  products: ProductSummary[];
  selectedIds: Set<string>;
  onSelectAll: (selected: boolean) => void;
  onSelectOne: (id: string, selected: boolean) => void;
  sortBy: string;
  sortDir: 'asc' | 'desc';
  onSort: (field: string) => void;
}

/**
 * Format date for display
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Get status badge class
 */
function getStatusClass(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'products-table__status--active';
    case 'draft':
      return 'products-table__status--draft';
    case 'pending':
      return 'products-table__status--pending';
    case 'discontinued':
      return 'products-table__status--discontinued';
    default:
      return '';
  }
}

/**
 * Sort indicator component
 */
function SortIndicator({ field, currentField, direction }: { 
  field: string; 
  currentField: string; 
  direction: 'asc' | 'desc';
}) {
  if (field !== currentField) {
    return <span className="products-table__sort-icon">↕</span>;
  }
  return (
    <span className="products-table__sort-icon products-table__sort-icon--active">
      {direction === 'asc' ? '↑' : '↓'}
    </span>
  );
}

export function ProductsTable({
  products,
  selectedIds,
  onSelectAll,
  onSelectOne,
  sortBy,
  sortDir,
  onSort,
}: ProductsTableProps) {
  const allSelected = products.length > 0 && products.every(p => selectedIds.has(p.id));
  const someSelected = products.some(p => selectedIds.has(p.id)) && !allSelected;

  return (
    <div className="products-table-container">
      <table className="products-table">
        <thead>
          <tr>
            <th className="products-table__th products-table__th--checkbox">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                aria-label="Select all visible products"
              />
            </th>
            <th className="products-table__th products-table__th--sku">
              <button
                type="button"
                className="products-table__sort-btn"
                onClick={() => onSort('sku')}
                aria-label="Sort by SKU"
              >
                SKU
                <SortIndicator field="sku" currentField={sortBy} direction={sortDir} />
              </button>
            </th>
            <th className="products-table__th products-table__th--name">
              <button
                type="button"
                className="products-table__sort-btn"
                onClick={() => onSort('name')}
                aria-label="Sort by Name"
              >
                Name
                <SortIndicator field="name" currentField={sortBy} direction={sortDir} />
              </button>
            </th>
            <th className="products-table__th products-table__th--brand">
              <button
                type="button"
                className="products-table__sort-btn"
                onClick={() => onSort('brand')}
                aria-label="Sort by Brand"
              >
                Brand
                <SortIndicator field="brand" currentField={sortBy} direction={sortDir} />
              </button>
            </th>
            <th className="products-table__th products-table__th--department">
              Department
            </th>
            <th className="products-table__th products-table__th--status">
              <button
                type="button"
                className="products-table__sort-btn"
                onClick={() => onSort('status')}
                aria-label="Sort by Status"
              >
                Status
                <SortIndicator field="status" currentField={sortBy} direction={sortDir} />
              </button>
            </th>
            <th className="products-table__th products-table__th--date">
              <button
                type="button"
                className="products-table__sort-btn"
                onClick={() => onSort('createdAt')}
                aria-label="Sort by Import Date"
              >
                Import Date
                <SortIndicator field="createdAt" currentField={sortBy} direction={sortDir} />
              </button>
            </th>
            <th className="products-table__th products-table__th--date">
              <button
                type="button"
                className="products-table__sort-btn"
                onClick={() => onSort('updatedAt')}
                aria-label="Sort by Updated"
              >
                Updated
                <SortIndicator field="updatedAt" currentField={sortBy} direction={sortDir} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className={`products-table__row ${selectedIds.has(product.id) ? 'products-table__row--selected' : ''}`}
            >
              <td className="products-table__td products-table__td--checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={(e) => onSelectOne(product.id, e.target.checked)}
                  aria-label={`Select ${product.name || product.sku || product.id}`}
                />
              </td>
              <td className="products-table__td products-table__td--sku">
                <Link to={`/products/${product.id}`} className="products-table__link">
                  {product.sku || product.id}
                </Link>
              </td>
              <td className="products-table__td products-table__td--name">
                <Link to={`/products/${product.id}`} className="products-table__link">
                  {product.name || 'Unnamed Product'}
                </Link>
              </td>
              <td className="products-table__td products-table__td--brand">
                {product.brand || '—'}
              </td>
              <td className="products-table__td products-table__td--department">
                {product.department || '—'}
              </td>
              <td className="products-table__td products-table__td--status">
                {product.status && (
                  <span className={`products-table__status ${getStatusClass(product.status)}`}>
                    {product.status}
                  </span>
                )}
              </td>
              <td className="products-table__td products-table__td--date">
                {formatDate(product.createdAt)}
              </td>
              <td className="products-table__td products-table__td--date">
                {formatDate(product.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ProductsTable;
