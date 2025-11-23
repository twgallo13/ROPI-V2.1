/**
 * Attributes Command Center
 * View, add, edit, and test RO Product Attributes and Ropi (AI) attributes
 */
import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  BeakerIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import AttributeDetailDrawer from './components/AttributeDetailDrawer';
import SandboxPanel from './components/SandboxPanel';
import { useAuth } from '../../contexts/AuthContext';

interface Attribute {
  canonicalPath: string;
  label: string;
  category: string;
  dataType: string;
  importerColumns?: string[];
  importRequired?: boolean;
  requiredForExport?: boolean;
  export?: boolean;
  bulkEditable?: boolean;
  foundation?: boolean;
  description?: string;
  ai?: {
    use?: string[];
    can_write?: boolean;
    confidenceThreshold?: number;
    trusted_sources?: string[];
    notes?: string;
  };
  validation?: {
    required?: boolean;
    pattern?: string | null;
    allowedValuesRef?: string | null;
  };
  ui?: {
    hint?: string;
  };
  audit?: {
    createdBy?: string;
    createdAt?: string;
    updatedBy?: string;
    updatedAt?: string;
    version?: string;
  };
  deprecated?: boolean;
}

export default function AttributesCommandCenter() {
  const { role } = useAuth();
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [foundationFilter, setFoundationFilter] = useState(false);
  const [exportableFilter, setExportableFilter] = useState(false);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sandboxOpen, setSandboxOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const isEditorOrAdmin = role === 'admin' || role === 'editor';

  useEffect(() => {
    fetchAttributes();
  }, [page, categoryFilter, foundationFilter, exportableFilter]);

  async function fetchAttributes() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (categoryFilter) params.append('category', categoryFilter);
      if (foundationFilter) params.append('foundation', 'true');
      if (exportableFilter) params.append('exportable', 'true');
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`/api/attributes?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Failed to fetch attributes');
      
      const data = await response.json();
      setAttributes(data.attributes || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching attributes:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setPage(1);
    fetchAttributes();
  }

  function handleRowClick(attribute: Attribute) {
    setSelectedAttribute(attribute);
    setDrawerOpen(true);
  }

  function handleCreateNew() {
    setSelectedAttribute({
      canonicalPath: '',
      label: '',
      category: 'descriptive',
      dataType: 'string',
      importerColumns: [],
      importRequired: false,
      requiredForExport: false,
      export: true,
      bulkEditable: true,
      foundation: false,
      description: '',
      ai: {
        use: [],
        can_write: false,
        confidenceThreshold: 0.9,
        trusted_sources: []
      },
      validation: {
        required: false,
        pattern: null,
        allowedValuesRef: null
      },
      ui: {},
      audit: {}
    });
    setDrawerOpen(true);
  }

  async function handleSeedToStaging(dryRun: boolean = false) {
    if (!isEditorOrAdmin) {
      alert('Insufficient permissions');
      return;
    }

    const confirmed = dryRun || window.confirm(
      'This will seed the local registry to staging Firestore. Continue?'
    );

    if (!confirmed) return;

    try {
      const response = await fetch('/api/attributes/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dryRun })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(dryRun 
          ? `Dry run successful: ${result.count} attributes would be seeded`
          : `Successfully seeded ${result.count} attributes to staging`
        );
        if (!dryRun) fetchAttributes();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Seed error:', error);
      alert('Failed to seed attributes');
    }
  }

  async function handleExportRegistry() {
    try {
      const response = await fetch('/api/attributes?limit=1000', {
        credentials: 'include'
      });
      const data = await response.json();
      
      const blob = new Blob([JSON.stringify(data.attributes, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attribute-registry-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export registry');
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col ${sandboxOpen ? 'w-2/3' : 'w-full'}`}>
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Attribute Command Center</h1>
          <p className="text-indigo-100">
            Manage canonical attributes and AI policies — import/export flags, foundation attributes, and audit trails
          </p>
        </div>

        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by label, path, or description..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Filters */}
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="sku_core">SKU Core</option>
              <option value="descriptive">Descriptive</option>
              <option value="pricing">Pricing</option>
              <option value="inventory">Inventory</option>
              <option value="media">Media</option>
              <option value="compliance">Compliance</option>
              <option value="shipping">Shipping</option>
              <option value="meta">Meta</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={foundationFilter}
                onChange={(e) => setFoundationFilter(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Foundation Only
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={exportableFilter}
                onChange={(e) => setExportableFilter(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Exportable
            </label>

            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
            >
              Search
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditorOrAdmin && (
              <>
                <button
                  onClick={handleCreateNew}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500"
                >
                  <PlusIcon className="w-4 h-4" />
                  New Attribute
                </button>

                <button
                  onClick={() => handleSeedToStaging(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <BeakerIcon className="w-4 h-4" />
                  Seed (Dry Run)
                </button>

                <button
                  onClick={() => handleSeedToStaging(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
                >
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  Seed to Staging
                </button>
              </>
            )}

            <button
              onClick={handleExportRegistry}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download Registry
            </button>

            <button
              onClick={() => setSandboxOpen(!sandboxOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${
                sandboxOpen 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BeakerIcon className="w-4 h-4" />
              Sandbox
            </button>
          </div>
        </div>

        {/* Attribute Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading attributes...</div>
          ) : attributes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No attributes found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Canonical Path</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Import Req</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Export</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Foundation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Use</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">AI Write</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Modified</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attributes.map((attr) => (
                  <tr
                    key={attr.canonicalPath}
                    onClick={() => handleRowClick(attr)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{attr.label}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-mono text-xs">{attr.canonicalPath}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">{attr.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{attr.dataType}</td>
                    <td className="px-4 py-3 text-center">
                      {attr.importRequired ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {attr.export ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {attr.foundation ? (
                        <CheckCircleIcon className="w-5 h-5 text-purple-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {attr.ai?.use && attr.ai.use.length > 0 ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {attr.ai.use.join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {attr.ai?.can_write ? (
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {attr.audit?.updatedAt 
                        ? new Date(attr.audit.updatedAt).toLocaleDateString()
                        : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Sandbox Panel */}
      {sandboxOpen && (
        <div className="w-1/3 border-l border-gray-200 bg-gray-50">
          <SandboxPanel onClose={() => setSandboxOpen(false)} />
        </div>
      )}

      {/* Attribute Detail Drawer */}
      {drawerOpen && selectedAttribute && (
        <AttributeDetailDrawer
          attribute={selectedAttribute}
          isOpen={drawerOpen}
          onClose={() => {
            setDrawerOpen(false);
            setSelectedAttribute(null);
          }}
          onSave={() => {
            fetchAttributes();
            setDrawerOpen(false);
            setSelectedAttribute(null);
          }}
          isEditable={isEditorOrAdmin}
        />
      )}
    </div>
  );
}
