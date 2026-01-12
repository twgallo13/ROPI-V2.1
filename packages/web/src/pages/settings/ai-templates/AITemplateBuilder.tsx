import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../lib/api';
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
function AITemplateBuilder(_props: AITemplateBuilderProps = {}) {
  const { templateKey } = useParams<{ templateKey?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(templateKey);
  priority: number;
  site?: string;
  includeObservations: boolean;
  includeAttributeNotes: boolean;
  requiredAttributes: string[];
  conditions: any[];
  prompt_body: string;
  seo_rules?: string;
  tone_rules?: string;
  length_rules?: string;
  examples?: string[];
  banned_terms?: string[];
  modelSettings: {
    model: string;
    maxOutputTokens?: number;
    temperature?: number;
  };
}

const DEFAULT_TEMPLATE: Partial<AITemplate> = {
  status: 'active',
  priority: 100,
  includeObservations: false,
  includeAttributeNotes: false,
  requiredAttributes: [],
  conditions: [],
  prompt_body: 'You are a professional product description writer for e-commerce.\n\nGenerate a compelling product description for the following product:\n\nProduct: {{product.name}} (MPN: {{product.mpn}})\nBrand: {{product.brand}}\nTarget Site: {{site}}\n\nProduct Attributes:\n{{attributes}}\n\n{{observations}}\n\nInstructions:\n- Write a concise, engaging description suitable for {{site}}\n- Highlight key features and benefits\n- Use the provided attributes accurately\n- Maintain a professional yet accessible tone\n- Focus on what matters most to customers\n\nGenerate a product description:',
  examples: [],
  banned_terms: [],
  modelSettings: {
    model: 'gemini-1.5-flash',
    maxOutputTokens: 1024,
    temperature: 0.7
  }
};

function AITemplateBuilder({ templateKey, onSave, onCancel }: AITemplateBuilderProps) {
  const [template, setTemplate] = useState<Partial<AITemplate>>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const isEditing = Boolean(templateKey);

  useEffect(() => {
    if (templateKey) {
      loadTemplate();
    }
  }, [templateKey]);

  async function loadTemplate() {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch<{ template: AITemplate }>(`/admin/ai-templates/${templateKey}`);
      if (response?.template) {
        setTemplate(response.template);
      }
    } catch (err) {
      setError(`Failed to load template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  function updateTemplate<K extends keyof AITemplate>(field: K, value: AITemplate[K]) {
    setTemplate(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => prev.filter(err => !err.includes(field as string)));
  }

  function validateTemplate(): string[] {
    const errors: string[] = [];

    if (!template.key?.trim()) {
      errors.push('Template key is required');
    }

    if (!template.prompt_body?.trim()) {
      errors.push('Prompt body is required');
    }

    if (typeof template.priority !== 'number' || template.priority < 0) {
      errors.push('Priority must be a non-negative number');
    }

    // Validate prompt has required placeholders
    const prompt = template.prompt_body || '';
    if (!prompt.includes('{{product.mpn}}')) {
      errors.push('Prompt must include {{product.mpn}} placeholder');
    }
    if (!prompt.includes('{{attributes}}')) {
      errors.push('Prompt must include {{attributes}} placeholder');
    }

    return errors;
  }

  async function saveTemplate() {
    const errors = validateTemplate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setValidationErrors([]);

      const templateData = {
        ...template,
        key: template.key?.trim(),
        prompt_body: template.prompt_body?.trim(),
      };

      if (isEditing) {
        await apiFetch(`/admin/ai-templates/${templateKey}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData),
        });
      } else {
        await apiFetch('/admin/ai-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateData),
        });
      }

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
              border: '1px solid var(--color-border, #ccc)',
              borderRadius: '4px',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Cancel
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
          backgroundColor: 'var(--color-warning-bg, #fff3cd)', 
          color: 'var(--color-warning, #856404)',
          border: '1px solid var(--color-warning, #ffeaa7)',
          borderRadius: '4px'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Validation Errors:</div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); saveTemplate(); }}>
        
        {/* Basic Template Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          
          <div className="form-group">
            <label htmlFor="key" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Template Key *
            </label>
            <input
              id="key"
              type="text"
              value={template.key || ''}
              onChange={(e) => updateTemplate('key', e.target.value)}
              placeholder="e.g., mens_footwear_shiekh"
              disabled={isEditing}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '1rem',
                backgroundColor: isEditing ? 'var(--color-bg-disabled, #f5f5f5)' : 'white'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #666)', margin: '0.25rem 0 0' }}>
              {isEditing ? 'Template key cannot be changed after creation' : 'Unique identifier for this template'}
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="title" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Title
            </label>
            <input
              id="title"
              type="text"
              value={template.title || ''}
              onChange={(e) => updateTemplate('title', e.target.value)}
              placeholder="Human-readable template name"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

        </div>

        {/* Status and Priority */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          
          <div className="form-group">
            <label htmlFor="status" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Status
            </label>
            <select
              id="status"
              value={template.status}
              onChange={(e) => updateTemplate('status', e.target.value as 'active' | 'disabled')}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Priority
            </label>
            <input
              id="priority"
              type="number"
              min="0"
              value={template.priority || 100}
              onChange={(e) => updateTemplate('priority', parseInt(e.target.value) || 0)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary, #666)', margin: '0.25rem 0 0' }}>
              Higher priority templates are selected first
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="site" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
              Target Site
            </label>
            <input
              id="site"
              type="text"
              value={(template as any).site || ''}
              onChange={(e) => updateTemplate('site' as any, e.target.value || undefined)}
              placeholder="Leave empty for all sites"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid var(--color-border, #ccc)',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

        </div>

        {/* Include Options */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Include Options</h4>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={template.includeObservations || false}
                  onChange={(e) => updateTemplate('includeObservations', e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 'bold' }}>Include Observations</span>
              </label>
              <p style={{ 
                fontSize: '0.75rem', 
                color: 'var(--color-text-secondary, #666)', 
                margin: '0.25rem 0 0 21px' 
              }}>
                Include resolved AI insights in prompt context
              </p>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={template.includeAttributeNotes || false}
                  onChange={(e) => updateTemplate('includeAttributeNotes', e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 'bold' }}>Include Attribute Notes</span>
              </label>
              <p style={{ 
                fontSize: '0.75rem', 
                color: 'var(--color-text-secondary, #666)', 
                margin: '0.25rem 0 0 21px' 
              }}>
                Include AI usage notes for each attribute
              </p>
            </div>
          </div>
        </div>

        {/* Template Conditions Editor */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Template Conditions</h4>
          <TemplateConditionsEditor 
            conditions={template.conditions || []} 
            onChange={(conditions) => updateTemplate('conditions', conditions)} 
          />
        </div>

        {/* Prompt Body */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="prompt_body" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            Prompt Body *
          </label>
          <textarea
            id="prompt_body"
            value={template.prompt_body || ''}
            onChange={(e) => updateTemplate('prompt_body', e.target.value)}
            rows={12}
            placeholder="Enter your prompt template with Handlebars-style placeholders..."
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid var(--color-border, #ccc)',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontFamily: 'Monaco, "Cascadia Code", "Roboto Mono", monospace',
              lineHeight: '1.4',
              resize: 'vertical'
            }}
          />
          <div style={{ 
            fontSize: '0.75rem', 
            color: 'var(--color-text-secondary, #666)', 
            margin: '0.5rem 0 0'
          }}>
            <strong>Available placeholders:</strong> {'{{product.mpn}}'}, {'{{product.brand}}'}, {'{{product.name}}'}, {'{{site}}'}, {'{{attributes}}'}, {'{{observations}}'}
          </div>
        </div>

        {/* Model Settings */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ marginBottom: '0.75rem' }}>Model Settings</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="model" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Model
              </label>
              <select
                id="model"
                value={template.modelSettings?.model || 'gemini-1.5-flash'}
                onChange={(e) => updateTemplate('modelSettings', { 
                  ...template.modelSettings, 
                  model: e.target.value 
                })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border, #ccc)',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="maxOutputTokens" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Max Output Tokens
              </label>
              <input
                id="maxOutputTokens"
                type="number"
                min="1"
                max="8192"
                value={template.modelSettings?.maxOutputTokens || 1024}
                onChange={(e) => updateTemplate('modelSettings', { 
                  ...template.modelSettings, 
                  maxOutputTokens: parseInt(e.target.value) || 1024
                })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border, #ccc)',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="temperature" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                Temperature
              </label>
              <input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={template.modelSettings?.temperature || 0.7}
                onChange={(e) => updateTemplate('modelSettings', { 
                  ...template.modelSettings, 
                  temperature: parseFloat(e.target.value) || 0.7
                })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border, #ccc)',
                  borderRadius: '4px',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ 
          borderTop: '1px solid var(--color-border, #eee)', 
          paddingTop: '1.5rem', 
          display: 'flex', 
          gap: '0.5rem' 
        }}>
          <button
            type="submit"
            disabled={saving || validationErrors.length > 0}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: (saving || validationErrors.length > 0) 
                ? '#ccc' 
                : 'var(--color-primary, #007bff)',
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