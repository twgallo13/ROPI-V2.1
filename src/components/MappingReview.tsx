import React from 'react';
import type { ColumnMapping } from '../utils/csvParser';

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
  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'exact':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Exact Match</span>;
      case 'synonym':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Synonym</span>;
      case 'suggested-low':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Fuzzy Match</span>;
      case 'unmapped':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Unmapped</span>;
      default:
        return null;
    }
  };

  const hasConflicts = mappings.some(m => m.confidence === 'suggested-low' || m.confidence === 'unmapped');

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Review Column Mappings</h2>
        <p className="text-sm text-gray-600">
          Review and adjust the automatically detected column mappings. 
          {hasConflicts && (
            <span className="text-yellow-700 font-medium"> Some mappings need your attention.</span>
          )}
        </p>
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
              <tr key={index} className={`hover:bg-gray-50 ${mapping.confidence === 'unmapped' ? 'bg-red-50' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {mapping.csvHeader}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <select
                    value={mapping.targetField || ''}
                    onChange={(e) => onMappingChange(index, e.target.value || null)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">-- Ignore this column --</option>
                    <option value="product_id">Product ID</option>
                    <option value="sku">SKU</option>
                    <option value="name">Name</option>
                    <option value="brand">Brand</option>
                    <option value="price">Price</option>
                    <option value="stock">Stock</option>
                    <option value="images">Images</option>
                    <option value="size">Size</option>
                    <option value="color">Color</option>
                    <option value="department">Department</option>
                    <option value="class">Class</option>
                    <option value="category">Category</option>
                    <option value="age_group">Age Group</option>
                    <option value="gender">Gender</option>
                    <option value="material">Material/Fabric</option>
                    <option value="fit">Fit</option>
                    <option value="sports_team">Sports Team</option>
                    <option value="league">League</option>
                    <option value="height">Height</option>
                    <option value="width">Width</option>
                    <option value="length">Length</option>
                    <option value="weight">Weight</option>
                    <option value="rics_category">RICS Category</option>
                    <option value="rics_long_desc">RICS Long Description</option>
                    <option value="keywords">Keywords/Tags</option>
                    <option value="website">Website</option>
                    <option value="featured">Featured</option>
                    <option value="map">MAP</option>
                    <option value="promo">Promo</option>
                    <option value="hype">Hype</option>
                    <option value="fastfashion">Fast Fashion</option>
                  </select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getConfidenceBadge(mapping.confidence)}
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
