/**
 * Attribute Detail Drawer
 * Edit attribute metadata, AI settings, validation rules, and view audit history
 * Lisa v3.3.0 - Added vocab display and product-value preview
 */
import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { getFeatureFlag } from '../../../config/appConfig';
import { AttributeMetadata } from '../../../utils/attributeRegistry';
import { 
  getAttributeValuePreview, 
  looksLikeVocabSet,
  type AttributeValuePreview 
} from '../../../utils/attributeValuePreview';
import { useAuth } from '../../../contexts/AuthContext';
import PermissionRequestModal from './PermissionRequestModal';

interface AttributeDetailDrawerProps {
  attribute: AttributeMetadata;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: AttributeMetadata) => void;
  isEditable: boolean;
}

export default function AttributeDetailDrawer({
  attribute,
  isOpen,
  onClose,
  onSave,
  isEditable
}: AttributeDetailDrawerProps) {
  const { role } = useAuth();
  const [formData, setFormData] = useState<AttributeMetadata>(() => attribute || ({} as AttributeMetadata));
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'ai' | 'validation' | 'audit'>('details');
  const [newAlias, setNewAlias] = useState('');
  const [showAiConfirmation, setShowAiConfirmation] = useState(false);
  const [valuePreview, setValuePreview] = useState<AttributeValuePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [showAttachVocabModal, setShowAttachVocabModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const aiSuggestEnabled = getFeatureFlag('AI_SUGGEST');

  useEffect(() => {
    setFormData(attribute);
    
    // Load value preview when drawer opens or attribute changes
    if (isOpen && attribute.canonicalPath) {
      loadValuePreview();
    }
  }, [attribute, isOpen]);
  
  async function loadValuePreview() {
    if (!formData.canonicalPath) return;
    
    try {
      setLoadingPreview(true);
      const preview = await getAttributeValuePreview(formData.canonicalPath);
      setValuePreview(preview);
    } catch (error) {
      console.error('[AttributeDetailDrawer] Failed to load value preview:', error);
      setValuePreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleChange(field: keyof AttributeMetadata | string, value: unknown) {
    // small, local 'any' cast for dynamic assignment only; top-level types now explicit
    setFormData((prev) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(prev as any),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [field]: value as any
    }));
  }

  function handleNestedChange(parent: string, field: string, value: unknown) {
    setFormData((prev) => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(prev as any),
      [parent]: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(prev as any)[parent],
        [field]: value
      }
    }));
  }

  function handleAddAlias() {
    if (!newAlias.trim()) return;
    
    const currentAliases = formData.importerColumns || [];
    if (!currentAliases.includes(newAlias.trim())) {
      handleChange('importerColumns', [...currentAliases, newAlias.trim()]);
    }
    setNewAlias('');
  }

  function handleRemoveAlias(index: number) {
    const currentAliases = formData.importerColumns || [];
    handleChange('importerColumns', currentAliases.filter((_: string, i: number) => i !== index));
  }

  async function handleAiSuggestAliases() {
    if (!formData.label) return;

    try {
      const response = await fetch('/api/attributes/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          canonicalPath: formData.canonicalPath,
          label: formData.label,
          category: formData.category,
          dataType: formData.dataType
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(body.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const suggestions = result.suggestions || result.aliases || [];
      
      if (suggestions.length > 0) {
        // Merge suggested aliases with existing ones (avoiding duplicates)
        const currentAliases = formData.importerColumns || [];
        const newAliases = [...currentAliases];
        
        suggestions.forEach((suggestion: string) => {
          if (!newAliases.includes(suggestion)) {
            newAliases.push(suggestion);
          }
        });
        
        handleChange('importerColumns', newAliases);
        alert(`Added ${suggestions.length} AI-suggested alias(es)`);
      } else {
        alert('No suggestions available');
      }
    } catch (error) {
      console.error('AI Suggest error:', error);
      alert(`Failed to get AI suggestions: ${(error as Error).message}`);
    }
  }

  function handleAiCanWriteToggle(value: boolean) {
    if (value && !formData.ai?.can_write) {
      setShowAiConfirmation(true);
    } else {
      handleNestedChange('ai', 'can_write', value);
    }
  }

  function confirmAiCanWrite() {
    handleNestedChange('ai', 'can_write', true);
    setShowAiConfirmation(false);
  }

  async function handleSave() {
    if (!isEditable) {
      setShowPermissionModal(true);
      return;
    }

    try {
      setSaving(true);

      const isNew = !attribute.canonicalPath || attribute.canonicalPath === '';
      const endpoint = isNew 
        ? '/api/attributes'
        : `/api/attributes/${encodeURIComponent(attribute.canonicalPath)}`;
      
      const method = isNew ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save attribute');
      }

      const result = await response.json();
      onSave(result.attribute);
    } catch (error) {
      console.error('Save error:', error);
      alert(error instanceof Error ? error.message : 'Failed to save attribute');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndSeed() {
    await handleSave();
    
    // Trigger seed to staging
    try {
      const response = await fetch('/api/attributes/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ dryRun: false })
      });

      if (response.ok) {
        alert('Attribute saved and seeded to staging');
      }
    } catch (error) {
      console.error('Seed error:', error);
    }
  }

  async function handleDelete() {
    if (!isEditable || !attribute.canonicalPath) return;

    const confirmed = window.confirm(
      `Are you sure you want to deprecate "${attribute.label}"? This action will mark it as deprecated.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/attributes/${encodeURIComponent(attribute.canonicalPath)}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to delete attribute');

      alert('Attribute marked as deprecated');
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete attribute');
    }
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-2/3 max-w-3xl bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {attribute.canonicalPath ? 'Edit Attribute' : 'New Attribute'}
            </h2>
            {attribute.canonicalPath && (
              <p className="text-sm text-gray-500 font-mono mt-1">{attribute.canonicalPath}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'details'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'ai'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4" />
              AI Settings
            </span>
          </button>
          <button
            onClick={() => setActiveTab('validation')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'validation'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Validation
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === 'audit'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Audit
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Canonical Path */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Canonical Path *
                </label>
                <input
                  type="text"
                  value={formData.canonicalPath || ''}
                  onChange={(e) => handleChange('canonicalPath', e.target.value)}
                  disabled={!isEditable || !!attribute.canonicalPath}
                  placeholder="e.g., descriptive.color"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Format: category.field_name</p>
              </div>

              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label *
                </label>
                <input
                  type="text"
                  value={formData.label || ''}
                  onChange={(e) => handleChange('label', e.target.value)}
                  disabled={!isEditable}
                  placeholder="Human-readable label"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category || 'descriptive'}
                  onChange={(e) => handleChange('category', e.target.value)}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  <option value="sku_core">SKU Core</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="pricing">Pricing</option>
                  <option value="inventory">Inventory</option>
                  <option value="media">Media</option>
                  <option value="compliance">Compliance</option>
                  <option value="shipping">Shipping</option>
                  <option value="meta">Meta</option>
                </select>
              </div>

              {/* Data Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Type *
                </label>
                <select
                  value={formData.dataType || 'string'}
                  onChange={(e) => handleChange('dataType', e.target.value)}
                  disabled={!isEditable}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                >
                  <option value="string">String</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="date">Date</option>
                  <option value="array">Array</option>
                  <option value="object">Object</option>
                  <option value="url">URL</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleChange('description', e.target.value)}
                  disabled={!isEditable}
                  rows={3}
                  placeholder="Detailed description of this attribute"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* Importer Columns (Aliases) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Importer Columns (Aliases)
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddAlias()}
                    disabled={!isEditable}
                    placeholder="Add column alias..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleAddAlias}
                    disabled={!isEditable}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                  {aiSuggestEnabled && (
                    <button
                      onClick={handleAiSuggestAliases}
                      disabled={!isEditable || !formData.label}
                      title={!isEditable ? "AI Suggestions — Editor role required" : "Get AI-suggested aliases"}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      Suggest
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(formData.importerColumns || []).map((alias: string, index: number) => (
                    <div key={index} className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full">
                      <span className="text-sm">{alias}</span>
                      {isEditable && (
                        <button onClick={() => handleRemoveAlias(index)} className="text-red-500 hover:text-red-700">
                          <TrashIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 border-t pt-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.importRequired || false}
                    onChange={(e) => handleChange('importRequired', e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Import Required</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.requiredForExport || false}
                    onChange={(e) => handleChange('requiredForExport', e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Required for Export</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.export !== false}
                    onChange={(e) => handleChange('export', e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Exportable</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.bulkEditable !== false}
                    onChange={(e) => handleChange('bulkEditable', e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Bulk Editable</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.foundation || false}
                    onChange={(e) => handleChange('foundation', e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-purple-700">Foundation Attribute</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* AI Use Cases */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Use Cases
                </label>
                <div className="space-y-2">
                  {['template_selection', 'enrichment', 'validation', 'classification', 'extraction'].map(useCase => (
                    <label key={useCase} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={(formData.ai?.use || []).includes(useCase)}
                        onChange={(e) => {
                          const currentUse = formData.ai?.use || [];
                          const newUse = e.target.checked
                            ? [...currentUse, useCase]
                            : currentUse.filter((u: string) => u !== useCase);
                          handleNestedChange('ai', 'use', newUse);
                        }}
                        disabled={!isEditable}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{useCase.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI Can Write */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={formData.ai?.can_write || false}
                    onChange={(e) => handleAiCanWriteToggle(e.target.checked)}
                    disabled={!isEditable}
                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-amber-700">AI Can Write</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-7">
                  Allow AI to automatically write values for this attribute
                </p>
              </div>

              {/* Confidence Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Threshold: {(formData.ai?.confidenceThreshold || 0.9).toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.ai?.confidenceThreshold || 0.9}
                  onChange={(e) => handleNestedChange('ai', 'confidenceThreshold', parseFloat(e.target.value))}
                  disabled={!isEditable}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0.0 (Low)</span>
                  <span>1.0 (High)</span>
                </div>
              </div>

              {/* Trusted Sources */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Trusted Sources (comma-separated)
                </label>
                <input
                  type="text"
                  value={(formData.ai?.trusted_sources || []).join(', ')}
                  onChange={(e) => handleNestedChange('ai', 'trusted_sources', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                  disabled={!isEditable}
                  placeholder="vendor_api, brand_website, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>

              {/* AI Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Notes
                </label>
                <textarea
                  value={formData.ai?.notes || ''}
                  onChange={(e) => handleNestedChange('ai', 'notes', e.target.value)}
                  disabled={!isEditable}
                  rows={3}
                  placeholder="Additional notes about AI behavior for this attribute"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          )}

          {activeTab === 'validation' && (
            <div className="space-y-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.validation?.required || false}
                  onChange={(e) => handleNestedChange('validation', 'required', e.target.checked)}
                  disabled={!isEditable}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">Required Field</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Validation Pattern (regex)
                </label>
                <input
                  type="text"
                  value={formData.validation?.pattern || ''}
                  onChange={(e) => handleNestedChange('validation', 'pattern', e.target.value || null)}
                  disabled={!isEditable}
                  placeholder="^[A-Z0-9-]+$"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Allowed Values Reference
                </label>
                <input
                  type="text"
                  value={formData.validation?.allowedValuesRef || ''}
                  onChange={(e) => handleNestedChange('validation', 'allowedValuesRef', e.target.value || null)}
                  disabled={!isEditable}
                  placeholder="settings/lists/colors"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">Reference to Firestore settings/lists/* collection</p>
              </div>

              {/* Allowed Values Display - v3.3.0 */}
              {(formData.validation?.allowedValues && formData.validation.allowedValues.length > 0) && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Allowed Values</h3>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-auto">
                    {formData.validation.allowedValues.map((value: string) => (
                      <span
                        key={value}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                      >
                        {value}
                      </span>
                    ))}
                  </div>
                  {formData.validation.allowedValuesRef && (
                    <p className="text-xs text-gray-500 mt-3">
                      Sourced from: <code className="bg-white px-1 rounded">{formData.validation.allowedValuesRef}</code>
                    </p>
                  )}
                </div>
              )}

              {/* Product Value Preview - v3.3.0 */}
              {valuePreview && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">Current Product Values</h3>
                    <span className="text-xs text-gray-500">{valuePreview.totalSampled} samples</span>
                  </div>
                  
                  {valuePreview.previewAvailable ? (
                    <div className="space-y-2">
                      {valuePreview.distribution.map((item) => (
                        <div key={item.value} className="flex items-center justify-between text-sm">
                          <span className={item.value === '(Unknown)' || item.value === '(Other)' ? 'text-gray-400 italic' : 'text-gray-700'}>
                            {item.value}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-indigo-500 h-2 rounded-full"
                                style={{ width: `${(item.count / valuePreview.totalSampled) * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-500 min-w-[3rem] text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                      
                      {/* Attach Vocab Helper */}
                      {!formData.validation?.allowedValuesRef && looksLikeVocabSet(valuePreview) && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 mb-2">
                            Ropi detected a stable set of values for this attribute. Consider attaching a vocab set to enforce consistency.
                          </p>
                          <button
                            onClick={() => setShowAttachVocabModal(true)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Attach vocab...
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {valuePreview.error || 'No product-value preview available yet'}
                    </p>
                  )}
                  
                  {loadingPreview && (
                    <p className="text-sm text-gray-500">Loading preview...</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  UI Hint
                </label>
                <input
                  type="text"
                  value={formData.ui?.hint || ''}
                  onChange={(e) => handleNestedChange('ui', 'hint', e.target.value)}
                  disabled={!isEditable}
                  placeholder="Helpful hint text for users"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                />
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Audit Trail</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-500">Created By</dt>
                    <dd className="text-sm text-gray-900">{formData.audit?.createdBy || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Created At</dt>
                    <dd className="text-sm text-gray-900">
                      {formData.audit?.createdAt 
                        ? new Date(formData.audit.createdAt).toLocaleString()
                        : '—'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Updated By</dt>
                    <dd className="text-sm text-gray-900">{formData.audit?.updatedBy || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Updated At</dt>
                    <dd className="text-sm text-gray-900">
                      {formData.audit?.updatedAt 
                        ? new Date(formData.audit.updatedAt).toLocaleString()
                        : '—'
                      }
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Version</dt>
                    <dd className="text-sm text-gray-900">{formData.audit?.version || '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="text-sm text-gray-500">
                <p>Full audit history is stored in <code className="bg-gray-100 px-1 rounded">settings/attributes/audit/*</code></p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <div>
            {isEditable && attribute.canonicalPath && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Delete (Deprecate)
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            {isEditable && (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleSaveAndSeed}
                  disabled={saving}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                >
                  Save & Seed to Staging
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Permission Request Modal */}
      <PermissionRequestModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        currentRole={role || 'viewer'}
        requiredRole="editor"
      />

      {/* AI Can Write Confirmation Modal */}
      {showAiConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Allow AI to Write Values?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  This allows AI to automatically write values for this attribute. 
                  You can require human review for AI-generated values.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={() => setShowAiConfirmation(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAiCanWrite}
                    className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attach Vocab Modal - v3.3.0 */}
      {showAttachVocabModal && valuePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Attach Vocabulary Set
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Detected values from product data:
              </p>
              <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-200 rounded max-h-40 overflow-auto">
                {valuePreview.distribution
                  .filter(d => d.value !== '(Unknown)' && d.value !== '(Other)')
                  .map((item) => (
                    <span
                      key={item.value}
                      className="px-2 py-1 bg-white border border-gray-300 rounded text-sm"
                    >
                      {item.value}
                    </span>
                  ))}
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-700 font-medium">What would you like to do?</p>
              
              <div className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="vocab-action" className="mt-1" disabled />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Attach to existing vocab ref</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Link to a settings/lists/* reference (feature coming in v3.4)
                    </p>
                  </div>
                </label>
              </div>
              
              <div className="border border-gray-200 rounded p-3 hover:bg-gray-50">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="radio" name="vocab-action" className="mt-1" defaultChecked />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Leave as-is</p>
                    <p className="text-xs text-gray-500 mt-1">
                      No changes; keep attribute validation as open text
                    </p>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowAttachVocabModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // For v3.3, this is a placeholder. In v3.4, implement actual attach logic
                  setShowAttachVocabModal(false);
                  alert('Vocab attachment will be implemented in v3.4. For now, manually set allowedValuesRef.');
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                disabled
              >
                Attach (v3.4)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
