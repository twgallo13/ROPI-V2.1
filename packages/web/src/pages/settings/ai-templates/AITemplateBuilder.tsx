import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/apiFetch';
import PageLayout from '../../../components/common/PageLayout';
import TemplateConditionsEditor from './TemplateConditionsEditor';
import TestPreviewModal from './TestPreviewModal';

interface AITemplateBuilderProps {
  // No props needed since we'll use URL params
}

interface AITemplate {
  key: string;
  title?: string;
  status: 'active' | 'disabled';
  priority: number;
  include_name: boolean;
  include_attributes: boolean;
  include_rules: boolean;
  include_custom_attributes: boolean;
  conditions: Array<{
    id: string;
    type: 'site' | 'attribute';
    attributeId?: string;
    operator?: 'equals' | 'contains' | 'not_equals';
    value: string;
  }>;
  prompt_body: string;
  model_settings: {
    model: string;
    max_tokens: number;
    temperature: number;
  };
}

const DEFAULT_TEMPLATE: Partial<AITemplate> = {
  status: 'active',
  priority: 100,
  include_name: true,
  include_attributes: true,
  include_rules: false,
  include_custom_attributes: false,
  conditions: [],
  prompt_body: 'You are a professional product description writer for e-commerce.\n\nGenerate a compelling product description for the following product:\n\nProduct: {{product.name}} (MPN: {{product.mpn}})\nBrand: {{product.brand}}\nTarget Site: {{site}}\n\nProduct Attributes:\n{{attributes}}\n\nInstructions:\n- Write a concise, engaging description suitable for {{site}}\n- Highlight key features and benefits\n- Use the provided attributes accurately\n- Maintain a professional yet accessible tone\n- Focus on what matters most to customers\n\nGenerate a product description:',
  model_settings: {
    model: 'gemini-1.5-flash',
    max_tokens: 1024,
    temperature: 0.7
  }
};

function AITemplateBuilder(_props: AITemplateBuilderProps = {}) {
  const { templateKey } = useParams<{ templateKey?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(templateKey);

  const [template, setTemplate] = useState<AITemplate>({ 
    key: '', 
    ...DEFAULT_TEMPLATE 
  } as AITemplate);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isEditing && templateKey) {
      loadTemplate();
    }
  }, [isEditing, templateKey]);

  async function loadTemplate() {
    if (!templateKey) return;
    
    try {
      setLoading(true);
      const data = await apiFetch<AITemplate>(`/api/admin/ai-templates/${templateKey}`);
      if (data) {
        // Ensure model_settings exists with defaults
        const safeTemplate = {
          ...data,
          model_settings: data.model_settings || {
            model: 'gemini-1.5-flash',
            max_tokens: 1024,
            temperature: 0.7
          },
          prompt_body: data.prompt_body || '',
          conditions: data.conditions || [],
          status: data.status || 'active',
          priority: data.priority || 0
        };
        setTemplate(safeTemplate);
      }
    } catch (err) {
      setError(`Failed to load template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  function validateTemplate(): string[] {
    const errors: string[] = [];
    
    if (!template.key?.trim()) {
      errors.push('Template key is required');
    }
    
    if (!template.prompt_body?.trim()) {
      errors.push('Prompt body is required');
    }
    
    if (template.prompt_body && template.prompt_body.length < 10) {
      errors.push('Prompt body must be at least 10 characters');
    }
    
    if (template.prompt_body && template.prompt_body.length > 5000) {
      errors.push('Prompt body must be less than 5000 characters');
    }
    
    return errors;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const validationErrors = validateTemplate();
    setValidationErrors(validationErrors);
    
    if (validationErrors.length > 0) {
      setSaving(false);
      return;
    }

    try {
      const templateData = { ...template };

      const endpoint = isEditing 
        ? `/api/admin/ai-templates/${templateKey}` 
        : '/api/admin/ai-templates';
      const method = isEditing ? 'PUT' : 'POST';

      await apiFetch<any>(endpoint, {
        method,
        body: JSON.stringify(templateData)
      });

      // Navigate back to templates list
      navigate('/settings/ai-templates');
    } catch (err) {
      setError(`Failed to save template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageLayout title={isEditing ? `Edit Template: ${templateKey}` : 'Create New AI Template'}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading template...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={isEditing ? `Edit Template: ${templateKey}` : 'Create New AI Template'}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1.5rem' 
      }}>
        <button
          onClick={() => navigate('/settings/ai-templates')}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'var(--color-secondary, #6c757d)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          ← Back to Templates
        </button>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setShowPreview(true)}
            disabled={!template.key || !template.prompt_body}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-info, #007bff)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              opacity: (!template.key || !template.prompt_body) ? 0.6 : 1
            }}
          >
            Test Preview
          </button>
        </div>
      </div>

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

      {validationErrors.length > 0 && (
        <div style={{ 
          padding: '0.75rem', 
          marginBottom: '1rem', 
          backgroundColor: 'var(--color-warning-bg, #fff4e6)', 
          color: 'var(--color-warning, #e67e22)',
          border: '1px solid var(--color-warning, #e67e22)',
          borderRadius: '4px'
        }}>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Template Key *
            </label>
            <input
              type="text"
              value={template.key}
              onChange={(e) => setTemplate(prev => ({ ...prev, key: e.target.value }))}
              placeholder="e.g., mens_footwear_shiekh"
              disabled={isEditing}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '0.875rem',
                backgroundColor: isEditing ? 'var(--color-bg-disabled, #f5f5f5)' : 'white'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Title
            </label>
            <input
              type="text"
              value={template.title || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Men's Footwear for Shiekh"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Status
            </label>
            <select
              value={template.status}
              onChange={(e) => setTemplate(prev => ({ ...prev, status: e.target.value as 'active' | 'disabled' }))}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Priority
            </label>
            <input
              type="number"
              value={template.priority}
              onChange={(e) => setTemplate(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
              min="1"
              max="1000"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 0.75rem 0' }}>Include Options</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={template.include_name}
                onChange={(e) => setTemplate(prev => ({ ...prev, include_name: e.target.checked }))}
              />
              Product Name
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={template.include_attributes}
                onChange={(e) => setTemplate(prev => ({ ...prev, include_attributes: e.target.checked }))}
              />
              Product Attributes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={template.include_rules}
                onChange={(e) => setTemplate(prev => ({ ...prev, include_rules: e.target.checked }))}
              />
              Smart Rules Output
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                checked={template.include_custom_attributes}
                onChange={(e) => setTemplate(prev => ({ ...prev, include_custom_attributes: e.target.checked }))}
              />
              Custom Attributes
            </label>
          </div>
        </div>

        <div>
          <TemplateConditionsEditor
            conditions={template.conditions}
            onChange={(conditions) => setTemplate(prev => ({ ...prev, conditions }))}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
            Prompt Body *
          </label>
          <textarea
            value={template.prompt_body}
            onChange={(e) => setTemplate(prev => ({ ...prev, prompt_body: e.target.value }))}
            placeholder="Enter the AI prompt template. Use placeholders like {product.name}, {site}, {attributes}, etc."
            rows={15}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border, #ccc)',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontFamily: '"Monaco", "Consolas", "Courier New", monospace',
              lineHeight: '1.4',
              resize: 'vertical'
            }}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #666)', marginTop: '0.25rem' }}>
            {template.prompt_body?.length || 0} / 5000 characters
          </div>
        </div>

        <div>
          <h4 style={{ margin: '0 0 0.75rem 0' }}>Model Settings</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Model
              </label>
              <select
                value={template.model_settings?.model || 'gemini-1.5-flash'}
                onChange={(e) => setTemplate(prev => ({ 
                  ...prev, 
                  model_settings: { ...(prev.model_settings || {}), model: e.target.value }
                }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border, #ccc)',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Max Tokens
              </label>
              <input
                type="number"
                value={template.model_settings?.max_tokens || 1024}
                onChange={(e) => setTemplate(prev => ({ 
                  ...prev, 
                  model_settings: { ...(prev.model_settings || {}), max_tokens: parseInt(e.target.value) || 300 }
                }))}
                min="50"
                max="8192"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border, #ccc)',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Temperature
              </label>
              <input
                type="number"
                value={template.model_settings?.temperature || 0.7}
                onChange={(e) => setTemplate(prev => ({ 
                  ...prev, 
                  model_settings: { ...(prev.model_settings || {}), temperature: parseFloat(e.target.value) || 0 }
                }))}
                min="0"
                max="2"
                step="0.1"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border, #ccc)',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => navigate('/settings/ai-templates')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary, #666)',
              border: '1px solid var(--color-border, #ccc)',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || validationErrors.length > 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--color-primary, #007bff)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: (saving || validationErrors.length > 0) ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {saving ? 'Saving...' : (isEditing ? 'Update Template' : 'Create Template')}
          </button>
        </div>
      </form>

      {showPreview && (
        <TestPreviewModal 
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          templateKey={template.key}
          promptBody={template.prompt_body}
          conditions={template.conditions}
          modelSettings={template.model_settings}
        />
      )}
    </PageLayout>
  );
}

export default AITemplateBuilder;