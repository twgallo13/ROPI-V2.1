import React, { useState } from 'react';
import { useExportRules, type ExportRulePreset, type ExportRuleTransform } from '../../hooks/useExportRules';
import Toast from '../../components/Toast';

const AVAILABLE_FIELDS = [
  'sku', 'mpn', 'name', 'brand', 'price', 'msrp', 'cost', 'status',
  'department', 'class', 'category', 'gender', 'ageGroup', 'quantity',
  'website', 'description', 'fit', 'taxClass'
];

const PRESET_TYPES: Array<'RetailOps' | 'Shopify' | 'Custom'> = ['RetailOps', 'Shopify', 'Custom'];

const ExportRulesPage: React.FC = () => {
  const { presets, loading, previewing, savePreset, deletePreset, runPreview } = useExportRules();
  
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });
  
  // Form state
  const [presetName, setPresetName] = useState('');
  const [presetType, setPresetType] = useState<'RetailOps' | 'Shopify' | 'Custom'>('Custom');
  const [selectedFields, setSelectedFields] = useState<string[]>(['sku', 'name', 'price']);
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [transforms, setTransforms] = useState<ExportRuleTransform[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => setToast((t) => ({ ...t, show: false }));

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const addFilter = () => {
    if (filterField && filterValue) {
      setFilters((prev) => ({ ...prev, [filterField]: filterValue }));
      setFilterField('');
      setFilterValue('');
    }
  };

  const removeFilter = (key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const addTransform = (type: ExportRuleTransform['type']) => {
    setTransforms((prev) => [...prev, { type, field: selectedFields[0] || '' }]);
  };

  const updateTransform = (index: number, updates: Partial<ExportRuleTransform>) => {
    setTransforms((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };

  const removeTransform = (index: number) => {
    setTransforms((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    if (selectedFields.length === 0) {
      showToast('Select at least one field', 'error');
      return;
    }

    const result = await runPreview(selectedFields, filters, transforms, 5);
    if (result.success && result.rows) {
      setPreviewRows(result.rows);
      showToast(`Preview loaded: ${result.rows.length} rows`, 'success');
    } else {
      showToast(result.error || 'Preview failed', 'error');
    }
  };

  const handleSave = async () => {
    if (!presetName.trim()) {
      showToast('Enter a preset name', 'error');
      return;
    }

    if (selectedFields.length === 0) {
      showToast('Select at least one field', 'error');
      return;
    }

    const preset: ExportRulePreset = {
      name: presetName,
      presetType,
      schema: selectedFields,
      filters,
      transforms,
    };

    const result = await savePreset(preset);
    if (result.success) {
      showToast('Preset saved', 'success');
      setPresetName('');
      setFilters({});
      setTransforms([]);
      setPreviewRows(null);
    } else {
      showToast(result.error || 'Failed to save', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this preset?')) return;
    const result = await deletePreset(id);
    if (result.success) {
      showToast('Preset deleted', 'success');
    } else {
      showToast(result.error || 'Failed to delete', 'error');
    }
  };

  const loadPreset = (preset: ExportRulePreset) => {
    setPresetName(preset.name);
    setPresetType(preset.presetType);
    setSelectedFields(preset.schema);
    setFilters(preset.filters || {});
    setTransforms(preset.transforms || []);
    setPreviewRows(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Export Rules</h2>
        <p className="text-sm text-gray-600 mt-1">Build and preview export configurations</p>
      </div>

      {/* Saved Presets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Saved Presets</h3>
        {loading ? (
          <div className="text-gray-500">Loading presets...</div>
        ) : presets.length === 0 ? (
          <div className="text-gray-400 text-sm italic">No presets saved yet</div>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
              >
                <div>
                  <div className="font-medium text-gray-900">{preset.name}</div>
                  <div className="text-xs text-gray-500">
                    {preset.presetType} • {preset.schema.length} fields
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadPreset(preset)}
                    className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Load
                  </button>
                  <button
                    onClick={() => preset.id && handleDelete(preset.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Builder Form */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-800">Build Export Rule</h3>

        {/* Preset Name & Type */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preset Name</label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="My Export Config"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preset Type</label>
            <select
              value={presetType}
              onChange={(e) => setPresetType(e.target.value as any)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {PRESET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Select Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Fields</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_FIELDS.map((field) => (
              <button
                key={field}
                onClick={() => toggleField(field)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  selectedFields.includes(field)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {field}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-500 mt-2">Selected: {selectedFields.join(', ') || 'None'}</div>
        </div>

        {/* Filters */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filters</label>
          <div className="flex gap-2 mb-2">
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Choose field...</option>
              {AVAILABLE_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              placeholder="Value"
              className="flex-grow border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              onClick={addFilter}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Add
            </button>
          </div>
          <div className="space-y-1">
            {Object.entries(filters).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded text-sm">
                <span>
                  <strong>{key}</strong> = {value}
                </span>
                <button onClick={() => removeFilter(key)} className="text-red-600 hover:text-red-800">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transforms */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Transforms</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => addTransform('uppercase')}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              + Uppercase
            </button>
            <button
              onClick={() => addTransform('lowercase')}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              + Lowercase
            </button>
            <button
              onClick={() => addTransform('trim')}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
            >
              + Trim
            </button>
          </div>
          <div className="space-y-2">
            {transforms.map((t, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded">
                <span className="text-sm font-medium text-gray-700">{t.type}</span>
                <select
                  value={t.field || ''}
                  onChange={(e) => updateTransform(i, { field: e.target.value })}
                  className="text-sm border-gray-300 rounded"
                >
                  <option value="">Choose field...</option>
                  {selectedFields.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button onClick={() => removeTransform(i)} className="ml-auto text-red-600 hover:text-red-800">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handlePreview}
            disabled={previewing || selectedFields.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {previewing ? 'Loading...' : 'Preview (5 rows)'}
          </button>
          <button
            onClick={handleSave}
            disabled={!presetName.trim() || selectedFields.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Save Preset
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {previewRows && previewRows.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview ({previewRows.length} rows)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {selectedFields.map((field) => (
                    <th
                      key={field}
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {field}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {selectedFields.map((field) => (
                      <td key={field} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">
                        {row[field] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast.show && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default ExportRulesPage;
