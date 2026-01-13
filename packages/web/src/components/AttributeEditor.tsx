import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';

interface AttributeEditorProps {
  attributeId: string;
}

interface AttributeData {
  attribute_id: string;
  status: 'active' | 'inactive';
  aiInput?: boolean;
  ai_usage_notes?: string;
  label?: string;
  description?: string;
  type?: string;
  domain?: any[];
  required_for_completion?: boolean;
  [key: string]: any;
}

export function AttributeEditor({ attributeId }: AttributeEditorProps) {
  const [attribute, setAttribute] = useState<AttributeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAttribute();
  }, [attributeId]);

  async function loadAttribute() {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch<{ attribute: AttributeData }>(`/admin/settings/attributes/${attributeId}`);
      if (response?.attribute) {
        setAttribute(response.attribute);
      }
    } catch (err) {
      setError(`Failed to load attribute: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveAttribute() {
    if (!attribute) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      await apiFetch(`/admin/settings/attributes/${attributeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attribute),
      });
      
      setSuccessMessage('Attribute updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(`Failed to save attribute: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  function updateAttribute(field: keyof AttributeData, value: any) {
    if (!attribute) return;
    setAttribute({ ...attribute, [field]: value });
  }

  if (loading) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <div>Loading attribute...</div>
      </div>
    );
  }

  if (error && !attribute) {
    return (
      <div style={{ padding: '1rem', color: 'var(--color-error)' }}>
        <div>Error: {error}</div>
        <button onClick={loadAttribute} style={{ marginTop: '0.5rem' }}>
          Retry
        </button>
      </div>
    );
  }

  if (!attribute) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <div>Attribute not found</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h3>Attribute Editor: {attribute.attribute_id}</h3>
      
      {error && (
        <div style={{ 
          padding: '0.75rem', 
          marginBottom: '1rem', 
          backgroundColor: 'var(--color-error-bg, #fee)', 
          color: 'var(--color-error, #d00)',
          border: '1px solid var(--color-error, #d00)',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}
      
      {successMessage && (
        <div style={{ 
          padding: '0.75rem', 
          marginBottom: '1rem', 
          backgroundColor: 'var(--color-success-bg, #efe)', 
          color: 'var(--color-success, #060)',
          border: '1px solid var(--color-success, #060)',
          borderRadius: '4px'
        }}>
          {successMessage}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); saveAttribute(); }}>
        
        {/* Basic attribute info */}
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <label htmlFor="status" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Status
          </label>
          <select 
            id="status"
            value={attribute.status}
            onChange={(e) => updateAttribute('status', e.target.value)}
            style={{ 
              padding: '0.5rem', 
              border: '1px solid var(--color-border, #ccc)', 
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* AI Input for Product Descriptions */}
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              id="aiInput" 
              type="checkbox" 
              checked={attribute.aiInput || false}
              onChange={(e) => updateAttribute('aiInput', e.target.checked)}
              style={{ 
                width: '16px', 
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label 
              htmlFor="aiInput" 
              style={{ 
                fontWeight: 'bold', 
                cursor: 'pointer',
                margin: 0
              }}
            >
              AI Input for Product Descriptions
            </label>
          </div>
          <p style={{ 
            margin: '0.5rem 0 0 21px', 
            fontSize: '0.875rem', 
            color: 'var(--color-text-secondary, #666)'
          }}>
            Use this attribute as an explicit AI input for product descriptions and prompts.
          </p>
        </div>

        {/* AI Usage Notes */}
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <label 
            htmlFor="ai_usage_notes" 
            style={{ 
              display: 'block', 
              fontWeight: 'bold', 
              marginBottom: '0.25rem' 
            }}
          >
            AI Usage Notes
          </label>
          <textarea 
            id="ai_usage_notes"
            rows={3}
            value={attribute.ai_usage_notes || ''}
            onChange={(e) => updateAttribute('ai_usage_notes', e.target.value)}
            placeholder="Optional notes about how this attribute should be used in AI prompts..."
            style={{ 
              width: '100%', 
              padding: '0.5rem',
              border: '1px solid var(--color-border, #ccc)',
              borderRadius: '4px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
          <p style={{ 
            margin: '0.5rem 0 0 0', 
            fontSize: '0.875rem', 
            color: 'var(--color-text-secondary, #666)'
          }}>
            Explanatory only; not injected into prompts unless template opts in.
          </p>
        </div>

        {/* Required for Completion */}
        <div className="form-row" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              id="required_for_completion" 
              type="checkbox" 
              checked={attribute.required_for_completion || false}
              onChange={(e) => updateAttribute('required_for_completion', e.target.checked)}
              style={{ 
                width: '16px', 
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <label 
              htmlFor="required_for_completion" 
              style={{ 
                fontWeight: 'bold', 
                cursor: 'pointer',
                margin: 0
              }}
            >
              Required for Completion
            </label>
          </div>
          <p style={{ 
            margin: '0.5rem 0 0 21px', 
            fontSize: '0.875rem', 
            color: 'var(--color-text-secondary, #666)'
          }}>
            Block AI generation when this attribute is missing.
          </p>
        </div>

        {/* Save button */}
        <div style={{ marginTop: '1.5rem' }}>
          <button 
            type="submit" 
            disabled={saving}
            style={{ 
              padding: '0.75rem 1.5rem',
              backgroundColor: saving ? '#ccc' : 'var(--color-primary, #007bff)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {saving ? 'Saving...' : 'Save Attribute'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AttributeEditor;