/**
 * AttributeManager Component
 * CRUD interface for managing product attributes
 * 
 * Lisa v1.0.0
 * 
 * References:
 * - Attribute Registry: https://www.notion.so/2b845ee1ec5a81228b07ca97964cd033
 * - Attribute Validation Schema: https://www.notion.so/2b845ee1ec5a805fba0ef665dfb17396
 */

import { useEffect, useState } from 'react';
import './Settings.css';
import '../../styles/attributes.css';
import { useAttributes, type Attribute } from '../../hooks/useAttributes';
import { toSnakeCase } from '../../lib/stringUtils';
import { toastError, toastSuccess } from '../../lib/notifications';

export default function AttributeManager() {
  const { attributes, loading, error, createAttribute, updateAttribute, deleteAttribute, getUsage, refresh } = useAttributes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Attribute>>({
    data_type: 'string',
    status: 'active',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recentlyCreatedId, setRecentlyCreatedId] = useState<string | null>(null);

  const DEFAULT_ATTR = {
    data_type: 'string' as const,
    status: 'active' as const,
    required_for_export: false,
    import_required: false,
    required_for_completion: false,
    external_header: '',
    source: 'json' as const,
  };

  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isModalOpen]);

  useEffect(() => {
    if (!recentlyCreatedId) return;
    const el = document.querySelector(`[data-attribute-id="${recentlyCreatedId}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    const remove = setTimeout(() => el.classList.remove('highlight'), 1500);
    const clear = setTimeout(() => setRecentlyCreatedId(null), 1700);
    return () => {
      clearTimeout(remove);
      clearTimeout(clear);
      el.classList.remove('highlight');
    };
  }, [recentlyCreatedId, attributes.length]);

  const resetForm = () => {
    setFormData({ ...DEFAULT_ATTR });
    setFormError(null);
    setSaveDetails(null);
  };

  const openCreate = () => {
    setIsModalOpen(true);
    setEditingId(null);
    resetForm();
  };

  const openEdit = (attr: Attribute) => {
    setIsModalOpen(true);
    setEditingId(attr.attribute_id);
    setFormData({ ...DEFAULT_ATTR, ...attr });
    setFormError(null);
    setSaveDetails(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingId(null);
    resetForm();
  };

  // LP-3.0.1: State for save errors and validation details
  const [saveDetails, setSaveDetails] = useState<Array<{ path: string; message: string }> | null>(null);

  const handleSave = async () => {
    setFormError(null);
    setSaveDetails(null);
    setSaving(true);
    try {
      const rawId = (formData.attribute_id || '').trim();
      if (!rawId) {
        setFormError('Attribute ID is required.');
        setSaving(false);
        return;
      }
      const normalizedId = toSnakeCase(rawId);
      if (!formData.label) {
        setFormError('Label is required.');
        setSaving(false);
        return;
      }

      if ((formData.data_type === 'enum' || formData.data_type === 'multiSelect') &&
          (!formData.allowed_values || formData.allowed_values.length === 0)) {
        setFormError('Allowed values are required for enum/multi-select.');
        setSaving(false);
        return;
      }

      if (editingId) {
        // LP-3.0.1: Handle structured response from updateAttribute
        const result = await updateAttribute(editingId, formData);
        if (!result?.ok) {
          setFormError(result.error || 'Save failed');
          setSaveDetails(result.details || null);
          toastError(result.error || 'Failed to update attribute');
          return;
        }
        toastSuccess(`Updated attribute '${editingId}'`);
      } else {
        const toCreate = { ...formData, attribute_id: normalizedId } as Omit<Attribute, 'createdAt' | 'updatedAt'>;
        const created = await createAttribute(toCreate);
        setRecentlyCreatedId(created.attribute_id);
        toastSuccess(`Created attribute '${created.attribute_id}'`);
      }

      handleCancel();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save attribute';
      setFormError(message);
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this attribute?')) return;
    try {
      const deleted = await deleteAttribute(id);
      if (deleted) {
        toastSuccess(`Deleted attribute '${id}'`);
      } else {
        toastSuccess('Attribute not found on server — removed locally.');
      }
      if (editingId === id) {
        handleCancel();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete attribute';
      toastError(message);
    }
  };

  const showUsage = async (attrId: string) => {
    try {
      const res = await getUsage(attrId);
      const lines = [
        `Attribute: ${attrId}`,
        `Product count: ${res.count}`,
        `Sample SKUs: ${res.samples.map(s => s.sku || s.id).join(', ')}`,
      ];
      alert(lines.join('\n'));
    } catch (e) {
      alert('Failed to fetch usage: ' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const handleSync = async (_id: string) => {
    try {
      await refresh();
      toastSuccess(`Synced attributes from server.`);
    } catch (err) {
      toastError('Failed to sync attribute: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const renderForm = () => (
    <div className="attribute-modal-overlay" role="dialog" aria-modal="true" onClick={handleCancel}>
      <div className="attribute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingId ? 'Edit Attribute' : 'New Attribute'}</h2>
          <button className="close-btn" aria-label="Close" onClick={handleCancel}>×</button>
        </div>

        {/* LP-3.0.1: Display form error and validation details */}
        {formError && (
          <div className="attr-save-error" data-testid="form-error">
            <strong>Error:</strong> {formError}
            {saveDetails && saveDetails.length > 0 && (
              <details className="validation-details">
                <summary>Validation Details</summary>
                <pre className="monospace">{JSON.stringify(saveDetails, null, 2)}</pre>
              </details>
            )}
          </div>
        )}

        <div className="modal-body">
          <div className="form-row">
            <label>Attribute ID *</label>
            <input
              type="text"
              data-testid="attribute-id-input"
              aria-label="Attribute ID"
              value={formData.attribute_id || ''}
              onChange={(e) => setFormData({ ...formData, attribute_id: e.target.value })}
              disabled={!!editingId}
            />
            <small>IDs are normalized to snake_case on save</small>
          </div>

          <div className="form-row">
            <label>Label *</label>
            <input
              type="text"
              data-testid="attribute-label-input"
              aria-label="Label"
              value={formData.label || ''}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>Data Type *</label>
            <select
              data-testid="data-type-select"
              aria-label="Data Type"
              value={formData.data_type}
              onChange={(e) => setFormData({ ...formData, data_type: e.target.value as Attribute['data_type'] })}
            >
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="enum">Enum</option>
              <option value="multiSelect">Multi-Select</option>
              <option value="currency">Currency</option>
              <option value="date">Date</option>
              <option value="json">JSON</option>
            </select>
          </div>

          {(formData.data_type === 'enum' || formData.data_type === 'multiSelect') && (
            <div className="form-row">
              <label>Allowed values (comma-separated)</label>
              <input
                type="text"
                value={(formData.allowed_values || []).join(', ')}
                onChange={(e) => setFormData({ ...formData, allowed_values: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                placeholder="e.g. Men, Women, Unisex"
                data-testid="allowed-values-input"
              />
            </div>
          )}

          <div className="form-row">
            <label>Synonyms (comma-separated)</label>
            <input
              type="text"
              value={Array.isArray(formData.synonyms) ? formData.synonyms.join(', ') : ''}
              onChange={(e) => setFormData({ ...formData, synonyms: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="e.g. color, main_color"
              data-testid="synonyms-input"
            />
          </div>

          <div className="form-row">
            <label>Category</label>
            <input
              type="text"
              data-testid="category-input"
              aria-label="Category"
              value={formData.category || ''}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Attribute['status'] })}
            >
              <option value="active">Active</option>
              <option value="deprecated">Deprecated</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          <div className="form-row">
            <label>AI Usage Notes</label>
            <textarea
              value={formData.ai_usage_notes || ''}
              onChange={(e) => setFormData({ ...formData, ai_usage_notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="form-row">
            <label>External Header</label>
            <input
              type="text"
              value={formData.external_header || ''}
              onChange={(e) => setFormData({ ...formData, external_header: e.target.value })}
              placeholder="CSV header for import mapping"
            />
            <small>Header name used to match during import preview</small>
          </div>

          <div className="form-row checkbox-row">
            <label>Required for Import</label>
            <input
              type="checkbox"
              checked={!!formData.import_required}
              onChange={(e) => setFormData({ ...formData, import_required: e.target.checked })}
            />
            <small>If set, import preview will mark missing values.</small>
          </div>

          <div className="form-row checkbox-row">
            <label>Required for Export</label>
            <input
              type="checkbox"
              checked={!!formData.required_for_export}
              onChange={(e) => setFormData({ ...formData, required_for_export: e.target.checked })}
            />
          </div>

          <div className="form-row checkbox-row">
            <label>Required for Completion</label>
            <input
              type="checkbox"
              checked={!!formData.required_for_completion}
              onChange={(e) => setFormData({ ...formData, required_for_completion: e.target.checked })}
            />
          </div>

          <div className="form-row">
            <label>Source</label>
            <input type="text" value={formData.source || ''} readOnly />
            <small>Source of attribute (notion|derived|json)</small>
          </div>
        </div>

        <div className="form-actions actions">
          {editingId && (
            <button
              className="danger"
              onClick={() => handleDelete(editingId)}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <button
            className="primary"
            data-testid="save-attribute-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
          <button
            className="secondary"
            data-testid="cancel-attribute-button"
            onClick={handleCancel}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="loading">Loading attributes...</div>;
  }

  return (
    <div className="attribute-manager">
      <div className="header">
        <h1>Attribute Manager</h1>
        <button className="primary" data-testid="new-attribute-button" onClick={openCreate}>
          + New Attribute
        </button>
      </div>

      {error && <div className="error">{error}</div>}
      {isModalOpen && renderForm()}

      <div className="attribute-list">
        {attributes.length === 0 ? (
          <p>No attributes found. Click "New Attribute" to create one.</p>
        ) : (
          attributes.map((attr) => (
            <div
              key={attr.attribute_id}
              className="attribute-item"
              data-attribute-id={attr.attribute_id}
            >
              <div className="attribute-item-info">
                <strong>{attr.label}</strong>
                <span> ({attr.attribute_id})</span>
                <div>
                  <small>
                    Type: {attr.data_type || 'string'} | Status: {attr.status || 'active'}
                  </small>
                </div>
              </div>
              <div className="attribute-item-actions">
                <button className="secondary" onClick={() => openEdit(attr)}>
                  Edit
                </button>
                <button className="secondary" onClick={() => handleSync(attr.attribute_id)}>
                  Sync
                </button>
                <button className="secondary" onClick={() => showUsage(attr.attribute_id)}>
                  Usage
                </button>
                <button className="danger" onClick={() => handleDelete(attr.attribute_id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
