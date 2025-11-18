import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface AttributeMetadata {
  key: string;
  canonicalPath: string;
  label: string;
  category: string;
  dataType: string;
  required: boolean;
  export: boolean;
  description: string;
  systemFlag: boolean;
  legacyPaths: string[];
  importerColumns: string[];
  exportPath?: string;
  rules: string[];
  normalizedValues?: string[];
  normalizationNote?: string;
}

const AttributeKeyPage: React.FC = () => {
  const [attributes, setAttributes] = useState<AttributeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  useEffect(() => {
    loadAttributes();
  }, []);

  const loadAttributes = async () => {
    try {
      setLoading(true);
      const keysRef = collection(db, 'settings', 'attributes', 'keys');
      const snapshot = await getDocs(keysRef);
      
      const loaded: AttributeMetadata[] = [];
      snapshot.forEach(doc => {
        loaded.push(doc.data() as AttributeMetadata);
      });

      loaded.sort((a, b) => a.canonicalPath.localeCompare(b.canonicalPath));
      setAttributes(loaded);
      setError(null);
    } catch (err) {
      const error = err as Error;
      console.error('Failed to load attributes:', error);
      setError(error.message || 'Failed to load attribute keys');
      // Fallback: Try loading from local JSON (development mode)
      try {
        const response = await fetch('/scripts/attribute-registry-normalized.json');
        if (response.ok) {
          const fallbackData = await response.json();
          setAttributes(fallbackData);
          setError('Loaded from local fallback (Firestore unavailable)');
        }
      } catch {
        setError('Could not load attributes from Firestore or fallback');
      }
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', 'Core', 'Descriptive', 'Pricing', 'Technical', 'Launch', 'Source', 'AI'];

  const filteredAttributes = attributes.filter(attr => {
    const matchesSearch = 
      attr.canonicalPath.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attr.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attr.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || attr.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const exportToCsv = () => {
    const header = 'Canonical Path,Label,Category,Data Type,Required,Export,Legacy Paths,Importer Columns,Rules,Normalization Note\n';
    const rows = attributes.map(attr => [
      attr.canonicalPath,
      attr.label,
      attr.category,
      attr.dataType,
      attr.required,
      attr.export,
      `"${attr.legacyPaths.join(', ')}"`,
      `"${attr.importerColumns.join(', ')}"`,
      `"${attr.rules.join(', ')}"`,
      `"${attr.normalizationNote || ''}"`,
    ].join(','));

    const csv = header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attribute-registry.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Attribute Key Registry</h2>
            <p className="text-sm text-gray-600 mt-1">
              Read-only view of canonical product attributes and their mappings
            </p>
          </div>
          <button
            onClick={exportToCsv}
            className="px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Export CSV
          </button>
        </div>

        {error && (
          <div className={`p-3 rounded-md mb-4 ${error.includes('fallback') ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'}`}>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by path, label, or description..."
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>
            Showing <strong>{filteredAttributes.length}</strong> of <strong>{attributes.length}</strong> attributes
          </span>
          {categoryFilter !== 'All' && (
            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
              {categoryFilter}
            </span>
          )}
        </div>
      </div>

      {/* Attribute List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredAttributes.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No attributes match your search criteria
          </div>
        ) : (
          filteredAttributes.map(attr => (
            <div key={attr.canonicalPath} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left: Basic Info */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800">{attr.label}</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {attr.category}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-gray-600 mb-2">{attr.canonicalPath}</p>
                  <p className="text-sm text-gray-700">{attr.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                      {attr.dataType}
                    </span>
                    {attr.required && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded">
                        Required
                      </span>
                    )}
                    {attr.export && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                        Exported
                      </span>
                    )}
                  </div>
                </div>

                {/* Middle: Mappings */}
                <div className="text-sm">
                  <div className="mb-3">
                    <span className="font-medium text-gray-700">Legacy Paths:</span>
                    {attr.legacyPaths.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {attr.legacyPaths.map(path => (
                          <li key={path} className="font-mono text-gray-600 text-xs">• {path}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic text-xs mt-1">None</p>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Importer Columns:</span>
                    {attr.importerColumns.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {attr.importerColumns.map(col => (
                          <li key={col} className="font-mono text-gray-600 text-xs">• {col}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic text-xs mt-1">None</p>
                    )}
                  </div>
                </div>

                {/* Right: Rules & Notes */}
                <div className="text-sm">
                  <div className="mb-3">
                    <span className="font-medium text-gray-700">SmartDetect Rules:</span>
                    {attr.rules.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {attr.rules.map(rule => (
                          <span key={rule} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                            {rule}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-xs mt-1">None</p>
                    )}
                  </div>
                  {attr.normalizationNote && (
                    <div>
                      <span className="font-medium text-gray-700">Normalization:</span>
                      <p className="mt-1 text-xs text-gray-600 italic">{attr.normalizationNote}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AttributeKeyPage;
