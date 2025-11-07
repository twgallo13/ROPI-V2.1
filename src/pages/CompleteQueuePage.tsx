import React, { useState, useEffect, useRef } from 'react';
import { mockVocabulary } from '../mockData';
import { Product } from '../types';
import Toast from '../components/Toast';
import { exportProductsToCSV } from '../utils/csvExport';
import { useProducts } from '../hooks/useProducts';

type ToastState = {
  show: boolean;
  message: string;
  type: 'success' | 'error';
};

const CompleteQueuePage: React.FC = () => {
  const { products, loading, error } = useProducts();
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  // State for the filters (similar to Intake Queue)
  const [statusFilter, setStatusFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, show: false });
  };

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
    }
  }, [error]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      const isIndeterminate = selectedIds.size > 0 && selectedIds.size < products.length;
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [selectedIds, products.length]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allIds = new Set(products.map(p => p.id));
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

  const handleExport = () => {
    try {
      // Get selected products
      const selectedProducts = products.filter(p => selectedIds.has(p.id));
      
      if (selectedProducts.length === 0) {
        showToast('No products selected for export', 'error');
        return;
      }

      // Export to CSV
      exportProductsToCSV(selectedProducts);
      
      // Show success toast
      const variantCount = selectedProducts.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
      showToast(
        `Successfully exported ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} (${variantCount} variant${variantCount !== 1 ? 's' : ''}) to CSV`,
        'success'
      );
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export CSV. Please try again.', 'error');
    }
  };

  // Prepare data for the filter dropdowns
  const uniqueBrands = [...new Set(products.map(p => p.brand))];
  const departments = mockVocabulary.departments;
  const statuses = ['Intake', 'In-Progress', 'Validated', 'Uploaded'];

  return (
    <div>
      <header className="mb-6 flex flex-col sm:flex-row justify-between sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Complete Queue</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Loading...' : `${products.length} products ready for export.`}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={selectedIds.size === 0}
          className="mt-4 sm:mt-0 px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Export to CSV ({selectedIds.size})
        </button>
      </header>

      {/* Filter Bar */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow flex flex-col md:flex-row items-center md:space-x-4 space-y-4 md:space-y-0">
        <div className="w-full md:flex-1">
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">Filter by Status</label>
          <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="all">All Statuses</option>
            {statuses.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <div className="w-full md:flex-1">
          <label htmlFor="brand-filter" className="block text-sm font-medium text-gray-700">Filter by Brand</label>
          <select id="brand-filter" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="all">All Brands</option>
            {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </div>
        <div className="w-full md:flex-1">
          <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700">Filter by Department</label>
          <select id="department-filter" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
            <option value="all">All Departments</option>
            {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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
                    checked={products.length > 0 && selectedIds.size === products.length}
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MPN / Style</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

export default CompleteQueuePage;