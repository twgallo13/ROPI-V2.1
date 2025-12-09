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

import { useState } from 'react';
import './Settings.css';
import { useAttributes, type Attribute } from '../../hooks/useAttributes';

export default function AttributeManager() {
  const { attributes, loading, error, createAttribute, updateAttribute, deleteAttribute } = useAttributes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Attribute>>({
    data_type: 'string',
    status: 'active',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData({ data_type: 'string', status: 'active' });
    setFormError(null);
  };

  const handleEdit = (attr: Attribute) => {
    setShowForm(true);
    setEditingId(attr.attribute_id);
    setFormData(attr);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);
    setSaving(true);
    try {
      if (editingId) {
        await updateAttribute(editingId, formData);
      } else {
        await createAttribute(formData as Omit<Attribute, 'createdAt' | 'updatedAt'>);
      }
      setShowForm(false);
      setFormData({ data_type: 'string', status: 'active' });
      setEditingId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save attribute';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this attribute?')) {
      try {
        await deleteAttribute(id);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to delete attribute';
        alert(`Error deleting attribute: ${message}`);
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ data_type: 'string', status: 'active' });
    setFormError(null);
  };

  if (loading) {
    return <div className="loading">Loading attributes...</div>;
  }

  return (
    <div className="attribute-manager">
      <div className="header">
        <h1>Attribute Manager</h1>
        <button className="primary" data-testid="new-attribute-button" onClick={handleCreate}>
          + New Attribute
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {showForm && (
        <div className="attribute-form">
          <h2>{editingId ? 'Edit Attribute' : 'New Attribute'}</h2>
          
          {formError && <div className="error" data-testid="form-error">{formError}</div>}
          
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

          <div className="form-actions">
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
      )}

      <div className="attribute-list">
        {attributes.length === 0 ? (
          <p>No attributes found. Click "New Attribute" to create one.</p>
        ) : (
          attributes.map((attr) => (
            <div key={attr.attribute_id} className="attribute-item">
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
                <button className="secondary" onClick={() => handleEdit(attr)}>
                  Edit
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
