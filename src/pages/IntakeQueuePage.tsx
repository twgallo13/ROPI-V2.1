import React, { useState, useEffect, useRef } from 'react';
import { mockVocabulary } from '../mockData';
import { Product } from '../types';
import ProductEditorDrawer from '../components/ProductEditorDrawer';
import { useProducts } from '../hooks/useProducts';
import Toast from '../components/Toast';
import { exportAndDownload } from '../utils/exporter';

const IntakeQueuePage: React.FC = () => {
  const { products: firestoreProducts, loading, error } = useProducts();
  const [localProducts, setLocalProducts] = useState<Product[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  // Sync Firestore products to local state (eventual consistency)
  useEffect(() => {
    setLocalProducts(firestoreProducts);
  }, [firestoreProducts]);

  // Use local products for rendering (allows optimistic updates)
  const products = localProducts;

  // State for the new filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedProduct(null); // Clear selection on close
  };

  const handleProductSaved = (productId: string, updates: Partial<Product>) => {
    // Optimistic update: merge updates into local products list only
    setLocalProducts(prev =>
      prev.map(p => (p.id === productId ? { ...p, ...updates } : p))
    );
    // Do NOT touch selectedProduct here; the drawer owns its local state
  };

  // Count validated products (from all products, not filtered)
  const validatedCount = products.filter(p => p.status === 'validated').length;

  // Apply filters to get the filtered product list
  const filtered = products.filter(product => {
    // Status filter - map display names to internal status values
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'Intake' && product.status === 'intake') ||
      (statusFilter === 'In-Progress' && product.status === 'in-progress') ||
      (statusFilter === 'Validated' && product.status === 'validated');
    
    // Brand filter
    const brandMatch = brandFilter === 'all' || product.brand === brandFilter;
    
    // Department filter
    const departmentMatch = departmentFilter === 'all' || product.department === departmentFilter;
    
    return statusMatch && brandMatch && departmentMatch;
  });

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      setShowErrorToast(true);
    }
  }, [error]);

  // Update indeterminate state for header checkbox
  useEffect(() => {
    if (headerCheckboxRef.current) {
      const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filtered.length;
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [selectedIds, filtered.length]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(filtered.map(p => p.id));
      setSelectedIds(allIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (e.target.checked) {
      newSelectedIds.add(id);
    } else {
      newSelectedIds.delete(id);
    }
    setSelectedIds(newSelectedIds);
  };

  // Handle CSV export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportMessage(null);
      
      // Use selected IDs if any, otherwise export all validated
      const selectedIdsArray = selectedIds.size > 0 ? Array.from(selectedIds) as string[] : undefined;
      const { successCount, errorCount } = await exportAndDownload(selectedIdsArray);
      
      if (successCount > 0 && errorCount === 0) {
        setExportMessage({
          text: `Successfully exported ${successCount} row(s)`,
          type: 'success',
        });
      } else if (successCount > 0 && errorCount > 0) {
        setExportMessage({
          text: `Exported ${successCount} row(s). ${errorCount} product(s) had errors (see error CSV)`,
          type: 'success',
        });
      } else if (errorCount > 0) {
        setExportMessage({
          text: `Export failed: ${errorCount} product(s) missing required fields (see error CSV)`,
          type: 'error',
        });
      }
    } catch (err: any) {
      console.error('[intake] export failed', err);
      setExportMessage({
        text: err.message || 'Failed to export products',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Prepare data for the filter dropdowns
  const uniqueBrands = [...new Set(products.map(p => p.brand))];
  const departments = mockVocabulary.departments;
  const statuses = ['Intake', 'In-Progress', 'Validated'];

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Intake Queue</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Loading...' : `${filtered.length} products waiting for processing.`}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting || loading || (selectedIds.size === 0 && validatedCount === 0)}
          className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected product(s)` : validatedCount === 0 ? 'No validated products to export' : 'Export validated products to CSV'}
        >
          {isExporting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Exporting...
            </>
          ) : selectedIds.size > 0 ? (
            <>📥 Export selected ({selectedIds.size})</>
          ) : (
            <>📥 Export CSV (validated {validatedCount})</>
          )}
        </button>
      </header>

      {/* Filter Bar */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow flex flex-col md:flex-row items-center md:space-x-4 space-y-4 md:space-y-0">
        <div className="w-full md:flex-1">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
            Filter by Status
          </label>
          <select
            id="status-filter"
            name="status"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:flex-1">
          <label htmlFor="brand-filter" className="block text-sm font-medium text-gray-700">
            Filter by Brand
          </label>
          <select
            id="brand-filter"
            name="brand"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
          >
            <option value="all">All</option>
            {uniqueBrands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        <div className="w-full md:flex-1">
          <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700">
            Filter by Department
          </label>
          <select
            id="department-filter"
            name="department"
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="all">All</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>
      
      {error ? (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-6 max-w-2xl mx-auto">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Failed to load products
                </h3>
                <p className="text-sm text-red-700 mt-2">
                  {error}
                </p>
                <p className="text-sm text-red-600 mt-2">
                  Please check your connection and try refreshing the page.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
          <p className="text-center text-gray-600 mt-4">Loading products...</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  onChange={handleSelectAll}
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MPN / Style</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((product) => (
              <tr key={product.id} className={`hover:bg-gray-50 ${selectedIds.has(product.id) ? 'bg-indigo-50' : ''}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                    checked={selectedIds.has(product.id)}
                    onChange={(e) => handleSelectOne(e, product.id)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.brand}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.mpn}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.status === 'intake' ? 'bg-blue-100 text-blue-800' : 
                      product.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                      product.status === 'validated' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {product.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEditProduct(product)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {selectedProduct && (
        <ProductEditorDrawer 
          key={selectedProduct.id}
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          product={selectedProduct}
          onSaved={handleProductSaved}
        />
      )}

      {showErrorToast && error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setShowErrorToast(false)} 
        />
      )}

      {exportMessage && (
        <Toast 
          message={exportMessage.text} 
          type={exportMessage.type} 
          onClose={() => setExportMessage(null)} 
        />
      )}
    </div>
  );
};

export default IntakeQueuePage;