import React, { useEffect, useState } from 'react';
import type { ColumnMapping } from '../utils/csvParser';
import { getImportableAttributes, type AttributeMetadata } from '../utils/attributeRegistry';

type MappingReviewProps = {
  mappings: ColumnMapping[];
  onMappingChange: (index: number, newTargetField: string | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const MappingReview: React.FC<MappingReviewProps> = ({
  mappings,
  onMappingChange,
  onConfirm,
  onCancel,
}) => {
  const [attributes, setAttributes] = useState<AttributeMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Fetch attribute registry on mount
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        setLoading(true);
        const importableAttrs = await getImportableAttributes();
        setAttributes(importableAttrs);
        setError(null);
      } catch (err) {
        console.error('[MappingReview] Failed to load attribute registry:', err);
        setError(err instanceof Error ? err.message : 'Failed to load attribute registry');
      } finally {
        setLoading(false);
      }
    };

    loadRegistry();
  }, []);
  const getConfidenceBadge = (confidence: string, matchedAlias?: string, matchScore?: number) => {
    switch (confidence) {
      case 'Exact Match':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Exact Match{matchedAlias ? ` (via '${matchedAlias}')` : ''}
          </span>
        );
      case 'Synonym':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
            Synonym{matchedAlias ? ` (via '${matchedAlias}')` : ''}
          </span>
        );
      case 'Fuzzy':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Fuzzy{matchScore ? ` (${(matchScore * 100).toFixed(0)}%)` : ''}
          </span>
        );
      case 'Unmapped':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Unmapped</span>;
      default:
        return null;
    }
  };

  const hasConflicts = mappings.some(m => m.confidence === 'Fuzzy' || m.confidence === 'Unmapped');

  // Get unique categories for filter
  const categories = Array.from(new Set(attributes.map(a => a.category))).sort();
  
  // Filter attributes by search term and category
  const filteredAttributes = attributes.filter(a => {
    // Category filter
    if (categoryFilter !== 'All' && a.category !== categoryFilter) return false;
    
    // Search term filter (search in label, canonicalPath, and aliases)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      return (
        a.label.toLowerCase().includes(search) ||
        a.canonicalPath.toLowerCase().includes(search) ||
        a.importerColumns.some(alias => alias.toLowerCase().includes(search))
      );
    }
    
    return true;
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Review Column Mappings</h2>
        <p className="text-sm text-gray-600">
          Review and adjust the automatically detected column mappings. 
          {hasConflicts && (
            <span className="text-yellow-700 font-medium"> Some mappings need your attention.</span>
          )}
          {loading && (
            <span className="text-blue-600 font-medium ml-2">Loading attribute registry...</span>
          )}
          {error && (
            <span className="text-red-600 font-medium ml-2">Registry error: {error}</span>
          )}
        </p>
        {!loading && !error && attributes.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Search attributes by name, path, or alias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500">
              {filteredAttributes.length} of {attributes.length} importable attributes loaded from Firestore
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto border rounded-lg mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CSV Header
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Field
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((mapping, index) => (
              <tr key={index} className={`hover:bg-gray-50 ${mapping.confidence === 'Unmapped' ? 'bg-red-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {mapping.csvHeader}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {loading ? (
                    <div className="text-gray-400 italic">Loading...</div>
                  ) : error ? (
                    <div className="text-red-600 text-xs">Registry error</div>
                  ) : (
                    <select
                      value={mapping.targetField || ''}
                      onChange={(e) => onMappingChange(index, e.target.value || null)}
                      className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    >
                      <option value="">-- Ignore this column --</option>
                      {/* Group by category - use full attributes list, not filtered */}
                      {Array.from(new Set(attributes.map(a => a.category))).sort().map(category => {
                        const categoryAttrs = attributes.filter(a => a.category === category);
                        if (categoryAttrs.length === 0) return null;
                        
                        return (
                          <optgroup key={category} label={category}>
                            {categoryAttrs.map(attr => {
                              const aliasStr = attr.importerColumns.length > 0 
                                ? ` [aliases: ${attr.importerColumns.slice(0, 3).join(', ')}${attr.importerColumns.length > 3 ? '...' : ''}]`
                                : '';
                              return (
                                <option key={attr.canonicalPath} value={attr.canonicalPath} title={`Aliases: ${attr.importerColumns.join(', ')}`}>
                                  {attr.label} ({attr.canonicalPath})
                                  {attr.required ? ' *' : ''}
                                  {aliasStr}
                                </option>
                              );
                            })}
                          </optgroup>
                        );
                      })}
                    </select>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getConfidenceBadge(mapping.confidence, mapping.matchedAlias, mapping.matchScore)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {mapping.alternatives && mapping.alternatives.length > 0 && (
                    <div className="text-xs text-gray-500">
                      Alternatives: {mapping.alternatives.join(', ')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{mappings.filter(m => m.targetField).length}</span> of{' '}
          <span className="font-medium">{mappings.length}</span> columns mapped
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Confirm & Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default MappingReview;
