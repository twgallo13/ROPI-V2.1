import React, { useState } from 'react';
import { mockVocabulary } from '../mockData';
import { Product } from '../types';
import ProductEditorDrawer from '../components/ProductEditorDrawer';
import { useProducts } from '../hooks/useProducts';
import Toast from '../components/Toast';

const IntakeQueuePage: React.FC = () => {
  const { products, loading, error } = useProducts();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showErrorToast, setShowErrorToast] = useState(false);

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

  // Show error toast if there's an error
  React.useEffect(() => {
    if (error) {
      setShowErrorToast(true);
    }
  }, [error]);

  // Prepare data for the filter dropdowns
  const uniqueBrands = [...new Set(products.map(p => p.brand))];
  const departments = mockVocabulary.departments;
  const statuses = ['Intake', 'In-Progress', 'Validated'];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Intake Queue</h1>
        <p className="text-gray-600 mt-1">
          {loading ? 'Loading...' : `${products.length} products waiting for processing.`}
        </p>
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
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
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

      <ProductEditorDrawer 
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        product={selectedProduct}
      />

      {showErrorToast && error && (
        <Toast 
          message={error} 
          type="error" 
          onClose={() => setShowErrorToast(false)} 
        />
      )}
    </div>
  );
};

export default IntakeQueuePage;