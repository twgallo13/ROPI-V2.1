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
  const { attributes, loading, error, createAttribute, updateAttribute, deleteAttribute, getUsage } = useAttributes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Attribute>>({
    data_type: 'string',
    status: 'active',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [recentlyCreatedId, setRecentlyCreatedId] = useState<string | null>(null);

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
    setFormData({ data_type: 'string', status: 'active' });
    setFormError(null);
  };

  const openCreate = () => {
    setIsModalOpen(true);
    setEditingId(null);
    resetForm();
  };

  const openEdit = (attr: Attribute) => {
    setIsModalOpen(true);
    setEditingId(attr.attribute_id);
    setFormData(attr);
    setFormError(null);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = async () => {
    setFormError(null);
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
        await updateAttribute(editingId, formData);
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

  const renderForm = () => (
    <div className="attribute-modal-overlay" role="dialog" aria-modal="true" onClick={handleCancel}>
      <div className="attribute-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{editingId ? 'Edit Attribute' : 'New Attribute'}</h2>
          <button className="close-btn" aria-label="Close" onClick={handleCancel}>×</button>
        </div>

        {formError && <div className="error" data-testid="form-error">{formError}</div>}

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
              value={(formData.synonyms || []).join(', ')}
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
                    Type: {attr.data_type} | Status: {attr.status}
                  </small>
                </div>
              </div>
              <div className="attribute-item-actions">
                <button className="secondary" onClick={() => openEdit(attr)}>
                  Edit
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
