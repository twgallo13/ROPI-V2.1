import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/apiFetch';
import PageLayout from '@/components/common/PageLayout';
import AITemplateBuilder from './AITemplateBuilder';

interface AITemplate {
  key: string;
  title?: string;
  status: 'active' | 'disabled';
  version?: number;
  priority: number;
  conditions?: any[];
  includeObservations: boolean;
  includeAttributeNotes: boolean;
  prompt_body?: string;
  seo_rules?: any;
  tone_rules?: any;
  length_rules?: any;
  examples?: any[];
  banned_terms?: string[];
  modelSettings?: {
    model: string;
    maxOutputTokens?: number;
    temperature?: number;
  };
  createdAt?: any;
  createdBy?: string;
  updatedAt?: any;
  updatedBy?: string;
}

interface TemplateListResponse {
  status: string;
  templates: AITemplate[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

function AITemplatesPage() {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);
      const response = await apiFetch<TemplateListResponse>('/admin/ai-templates');
      if (response?.templates) {
        setTemplates(response.templates);
      }
    } catch (err) {
      setError(`Failed to load templates: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  function handleTemplateCreated() {
    loadTemplates();
    setShowCreateForm(false);
  }

  function handleTemplateUpdated() {
    loadTemplates();
  }

  if (loading) {
    return (
      <PageLayout title="AI Templates">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          Loading AI templates...
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="AI Templates">
        <div style={{ padding: '2rem', color: 'var(--color-error, #d00)' }}>
          <div>Error: {error}</div>
          <button 
            onClick={loadTemplates} 
            style={{ 
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--color-primary, #007bff)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </PageLayout>
    );
  }

  // Show template builder if editing
  if (selectedTemplate || showCreateForm) {
    return (
      <PageLayout title={selectedTemplate ? `Edit Template: ${selectedTemplate}` : 'Create AI Template'}>
        <AITemplateBuilder 
          templateKey={selectedTemplate}
          onSave={selectedTemplate ? handleTemplateUpdated : handleTemplateCreated}
          onCancel={() => {
            setSelectedTemplate(null);
            setShowCreateForm(false);
          }}
        />
      </PageLayout>
    );
  }

  // Template list view
  return (
    <PageLayout title="AI Templates">
      <div style={{ padding: '1rem' }}>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <h2 style={{ margin: 0 }}>AI Template Management</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: 'var(--color-primary, #007bff)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Create New Template
          </button>
        </div>

        {templates.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            color: 'var(--color-text-secondary, #666)' 
          }}>
            <p>No AI templates found.</p>
            <p>Create your first template to get started with AI-powered product descriptions.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              border: '1px solid var(--color-border, #ddd)',
              backgroundColor: 'white'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-bg-secondary, #f8f9fa)' }}>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'left', 
                    borderBottom: '2px solid var(--color-border, #ddd)',
                    fontWeight: 'bold'
                  }}>
                    Template Key
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    borderBottom: '2px solid var(--color-border, #ddd)',
                    fontWeight: 'bold'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    borderBottom: '2px solid var(--color-border, #ddd)',
                    fontWeight: 'bold'
                  }}>
                    Priority
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    borderBottom: '2px solid var(--color-border, #ddd)',
                    fontWeight: 'bold'
                  }}>
                    Site
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    borderBottom: '2px solid var(--color-border, #ddd)',
                    fontWeight: 'bold'
                  }}>
                    Observations
                  </th>
                  <th style={{ 
                    padding: '0.75rem', 
                    textAlign: 'center', 
                    borderBottom: '2px solid var(--color-border, #ddd)',
                    fontWeight: 'bold'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {templates
                  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
                  .map((template) => (
                    <tr 
                      key={template.key}
                      style={{
                        borderBottom: '1px solid var(--color-border, #eee)',
                        ':hover': { backgroundColor: 'var(--color-bg-hover, #f5f5f5)' }
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                        {template.key}
                        {template.title && (
                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: 'var(--color-text-secondary, #666)',
                            fontWeight: 'normal'
                          }}>
                            {template.title}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: template.status === 'active' 
                            ? 'var(--color-success-bg, #d4edda)' 
                            : 'var(--color-warning-bg, #fff3cd)',
                          color: template.status === 'active' 
                            ? 'var(--color-success, #155724)' 
                            : 'var(--color-warning, #856404)',
                        }}>
                          {template.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {template.priority || 0}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {(template as any).site || 'All Sites'}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <span style={{
                          color: template.includeObservations 
                            ? 'var(--color-success, #28a745)' 
                            : 'var(--color-text-secondary, #666)'
                        }}>
                          {template.includeObservations ? '✓' : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => setSelectedTemplate(template.key)}
                          style={{
                            padding: '0.375rem 0.75rem',
                            backgroundColor: 'var(--color-secondary, #6c757d)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default AITemplatesPage;