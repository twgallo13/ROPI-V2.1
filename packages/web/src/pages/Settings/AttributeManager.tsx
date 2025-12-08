/**
 * AttributeManager Component
 * CRUD interface for managing product attributes
 * 
 * Lisa v0.2.0
 */

import { useState, useEffect } from 'react';
import './Settings.css';

interface Attribute {
  attribute_id: string;
  label: string;
  external_header?: string;
  category?: string;
  data_type: 'string' | 'number' | 'boolean' | 'enum' | 'currency' | 'json';
  allowed_values?: string[];
  synonyms?: string[];
  required_for_completion?: boolean;
  required_for_export?: boolean;
  import_required?: boolean;
  ai_usage_notes?: string;
  status?: 'active' | 'deprecated' | 'hidden';
  createdBy?: string;
  createdAt?: string;
  updatedBy?: string;
  updatedAt?: string;
}

// API hooks (TODO: implement with actual API calls)
function useAttributes() {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Fetch from /admin/settings/attributes
    setLoading(false);
    setAttributes([]);
  }, []);

  const createAttribute = async (data: Omit<Attribute, 'createdAt' | 'updatedAt'>) => {
    // TODO: POST to /admin/settings/attributes
    console.log('Creating attribute:', data);
  };

  const updateAttribute = async (id: string, data: Partial<Attribute>) => {
    // TODO: PUT to /admin/settings/attributes/:id
    console.log('Updating attribute:', id, data);
  };

  const deleteAttribute = async (id: string) => {
    // TODO: DELETE /admin/settings/attributes/:id
    console.log('Deleting attribute:', id);
  };

  return { attributes, loading, error, createAttribute, updateAttribute, deleteAttribute };
}

export default function AttributeManager() {
  const { attributes, loading, error, createAttribute, updateAttribute, deleteAttribute } = useAttributes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Attribute>>({
    data_type: 'string',
    status: 'active',
  });

  const handleCreate = () => {
    setShowForm(true);
    setEditingId(null);
    setFormData({ data_type: 'string', status: 'active' });
  };

  const handleEdit = (attr: Attribute) => {
    setShowForm(true);
    setEditingId(attr.attribute_id);
    setFormData(attr);
  };

  const handleSave = async () => {
    if (editingId) {
      await updateAttribute(editingId, formData);
    } else {
      await createAttribute(formData as Omit<Attribute, 'createdAt' | 'updatedAt'>);
    }
    setShowForm(false);
    setFormData({ data_type: 'string', status: 'active' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this attribute?')) {
      await deleteAttribute(id);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ data_type: 'string', status: 'active' });
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
              <option value="currency">Currency</option>
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
            <button className="primary" data-testid="save-attribute-button" onClick={handleSave}>
              {editingId ? 'Update' : 'Create'}
            </button>
            <button className="secondary" data-testid="cancel-attribute-button" onClick={handleCancel}>
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
