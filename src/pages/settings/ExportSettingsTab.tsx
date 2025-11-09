import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { runPreview } from '../../hooks/useExportRules';

type ColumnMapping = {
  exportName: string;
  productField: string;
  required: boolean;
};

type ExportSettings = {
  requiredFields: string[];
  columnMappings: ColumnMapping[];
  includeAIEnrichment: boolean;
};

const DEFAULT_SETTINGS: ExportSettings = {
  requiredFields: ['mpn', 'name', 'brand', 'department'],
  columnMappings: [
    { exportName: 'MPN', productField: 'mpn', required: true },
    { exportName: 'Product Name', productField: 'name', required: true },
    { exportName: 'Brand', productField: 'brand', required: true },
    { exportName: 'Department', productField: 'department', required: true },
    { exportName: 'Class', productField: 'class', required: false },
    { exportName: 'Category', productField: 'category', required: false },
    { exportName: 'Age Group', productField: 'ageGroup', required: false },
    { exportName: 'Gender', productField: 'gender', required: false },
    { exportName: 'Material/Fabric', productField: 'materialFabric', required: false },
    { exportName: 'Fit', productField: 'fit', required: false },
    { exportName: 'Sports Team', productField: 'sportsTeam', required: false },
    { exportName: 'League', productField: 'league', required: false },
    { exportName: 'Websites', productField: 'websites', required: false },
    { exportName: 'SKU', productField: 'variants[].sku', required: false },
    { exportName: 'Size', productField: 'variants[].size', required: false },
    { exportName: 'Color', productField: 'variants[].color', required: false },
    { exportName: 'Price', productField: 'variants[].price', required: false },
  ],
  includeAIEnrichment: true,
};

type ExportSettingsTabProps = {
  onShowToast: (message: string, type: 'success' | 'error') => void;
};

const ExportSettingsTab: React.FC<ExportSettingsTabProps> = ({ onShowToast }) => {
  const [settings, setSettings] = useState<ExportSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewRows, setPreviewRows] = useState<Record<string, any>[] | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'settings', 'export');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setSettings(docSnap.data() as ExportSettings);
      } else {
        // Initialize with defaults if not exists
        setSettings(DEFAULT_SETTINGS);
      }
    } catch (err: any) {
      const errorCode = err?.code || 'unknown';
      const errorMessage = err?.message || 'Unknown error';
      console.error('[settings] export load failed', errorCode, errorMessage);
      onShowToast(`Could not load export settings (${errorCode})`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'settings', 'export');
      
      // Remove any undefined values before saving
      const cleanedSettings = JSON.parse(JSON.stringify(settings));
      
      await setDoc(docRef, cleanedSettings, { merge: true });
      onShowToast('Export settings saved successfully', 'success');
    } catch (err: any) {
      const errorCode = err?.code || 'unknown';
      console.error('[settings] export save failed', errorCode, err?.message);
      onShowToast(`Failed to save export settings (${errorCode})`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleRequired = (index: number) => {
    const newMappings = [...settings.columnMappings];
    newMappings[index].required = !newMappings[index].required;
    
    // Update requiredFields array
    const field = newMappings[index].productField;
    const requiredFields = newMappings[index].required
      ? [...settings.requiredFields, field]
      : settings.requiredFields.filter(f => f !== field);
    
    setSettings({
      ...settings,
      columnMappings: newMappings,
      requiredFields,
    });
  };

  const updateMapping = (index: number, field: 'exportName' | 'productField', value: string) => {
    const newMappings = [...settings.columnMappings];
    newMappings[index][field] = value;
    setSettings({ ...settings, columnMappings: newMappings });
  };

  const addMapping = () => {
    setSettings({
      ...settings,
      columnMappings: [
        ...settings.columnMappings,
        { exportName: '', productField: '', required: false },
      ],
    });
  };

  const removeMapping = (index: number) => {
    const mapping = settings.columnMappings[index];
    const newMappings = settings.columnMappings.filter((_, i) => i !== index);
    const requiredFields = settings.requiredFields.filter(f => f !== mapping.productField);
    
    setSettings({
      ...settings,
      columnMappings: newMappings,
      requiredFields,
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Export Settings</h2>
      
      <div className="space-y-6">
        {/* Include AI Enrichment Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <label htmlFor="includeAIEnrichment" className="block text-sm font-medium text-gray-700">
              Include AI Enrichment
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Export AI-generated marketing content (title, bullets, SEO, paragraphs)
            </p>
          </div>
          <input
            type="checkbox"
            id="includeAIEnrichment"
            checked={settings.includeAIEnrichment}
            onChange={(e) => setSettings({ ...settings, includeAIEnrichment: e.target.checked })}
            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
        </div>

        {/* Column Mappings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Column Mappings</h3>
            <button
              onClick={addMapping}
              className="px-3 py-1 text-sm bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700"
            >
              + Add Column
            </button>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Export Column Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product Field
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Required
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {settings.columnMappings.map((mapping, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={mapping.exportName}
                        onChange={(e) => updateMapping(index, 'exportName', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder="Column name in CSV"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={mapping.productField}
                        onChange={(e) => updateMapping(index, 'productField', e.target.value)}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                        placeholder="e.g. mpn, brand, variants[].sku"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={mapping.required}
                        onChange={() => toggleRequired(index)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeMapping(index)}
                        className="text-red-600 hover:text-red-800 font-bold text-lg"
                        title="Remove mapping"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            <strong>Tip:</strong> Use <code className="bg-gray-100 px-1 rounded">variants[]</code> notation 
            to export variant-level fields (e.g., <code className="bg-gray-100 px-1 rounded">variants[].sku</code>). 
            Each variant will create a separate row in the export.
          </p>
        </div>

        {/* Required Fields Summary */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Required Fields Summary</h4>
          <p className="text-sm text-blue-800">
            {settings.requiredFields.length === 0 ? (
              <span className="italic">No required fields</span>
            ) : (
              <span>
                Products missing these fields will be exported to an error CSV: {' '}
                <code className="bg-blue-100 px-1 rounded font-mono text-xs">
                  {settings.requiredFields.join(', ')}
                </code>
              </span>
            )}
          </p>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <div className="flex gap-3">
            <button
              onClick={async () => {
                try {
                  setPreviewing(true);
                  // Build config from column mappings
                  const schema = settings.columnMappings.map(m => m.productField).filter(Boolean);
                  const config = { schema, filters: {}, transforms: [], limit: 5 };
                  const rows = await runPreview(config);
                  setPreviewRows(rows);
                  if (rows.length === 0) {
                    onShowToast('No products found for preview', 'error');
                  }
                } catch (err: any) {
                  onShowToast(err?.message || 'Preview failed', 'error');
                  setPreviewRows(null);
                } finally {
                  setPreviewing(false);
                }
              }}
              disabled={previewing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {previewing ? 'Loading...' : 'Run Preview'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Export Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview Table */}
      {previewRows && previewRows.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Preview ({previewRows.length} rows)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {settings.columnMappings.map((m, idx) => (
                    <th key={idx} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{m.productField}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewRows.map((row, idx) => (
                  <tr key={idx}>
                    {settings.columnMappings.map((m, j) => (
                      <td key={j} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{(row[m.productField] as any) ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportSettingsTab;
