import { useState, useMemo } from 'react';
import type { Product, AIHistoryEntry } from '../../types/product';
import './AIActionsTab.css';

/**
 * AI Actions / Power Workspace — LP-0.4.2
 * 
 * Tab 5: Describe Engine Controls and AI Power Features
 * 
 * Features (per LP-0.4.2):
 * - Audience Template Selector (loads from /app/settings/ai-templates)
 * - Tone Preset Overrides
 * - "Generate Descriptions" primary action button
 * - Progress status for async Describe jobs
 * - AI History log
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface AIActionsTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

// Mock audience templates (would load from /app/settings/ai-templates)
const AUDIENCE_TEMPLATES = [
  { id: 'streetwear', name: 'Streetwear Enthusiast', description: 'Urban, trendy, culture-driven' },
  { id: 'athletic', name: 'Athletic Performance', description: 'Sports, fitness, performance-focused' },
  { id: 'casual', name: 'Casual Lifestyle', description: 'Everyday comfort, versatile style' },
  { id: 'luxury', name: 'Premium/Luxury', description: 'High-end, exclusive, sophisticated' },
  { id: 'youth', name: 'Youth/Gen-Z', description: 'Social-media friendly, trend-forward' },
];

// Tone presets
const TONE_PRESETS = [
  { id: 'professional', name: 'Professional', icon: '📋' },
  { id: 'enthusiastic', name: 'Enthusiastic', icon: '🔥' },
  { id: 'minimalist', name: 'Minimalist', icon: '✨' },
  { id: 'technical', name: 'Technical', icon: '⚙️' },
  { id: 'storytelling', name: 'Storytelling', icon: '📖' },
];

// Job status type
type JobStatus = 'idle' | 'preparing' | 'generating' | 'complete' | 'error';

interface JobProgress {
  status: JobStatus;
  progress: number;
  message: string;
  startTime?: number;
}

function AIActionsTab({ product, onUpdate }: AIActionsTabProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('streetwear');
  const [selectedTone, setSelectedTone] = useState<string>('professional');
  const [jobProgress, setJobProgress] = useState<JobProgress>({
    status: 'idle',
    progress: 0,
    message: '',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get selected template details
  const templateDetails = useMemo(() => 
    AUDIENCE_TEMPLATES.find(t => t.id === selectedTemplate),
    [selectedTemplate]
  );

  // Simulate async describe job - LP-0.4.2.2: Wire to Tab 6 fields
  const handleGenerateDescriptions = async () => {
    if (jobProgress.status !== 'idle') return;

    const startTime = Date.now();
    
    // Phase 1: Preparing
    setJobProgress({ status: 'preparing', progress: 10, message: 'Analyzing product attributes...', startTime });
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Phase 2: Generating site descriptions
    setJobProgress({ status: 'generating', progress: 30, message: 'Generating descriptions for Shiekh...', startTime });
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // LP-0.4.2.2: Generate and update Shiekh description
    const shiekhDesc = generateSiteDescription('shiekh', product, selectedTone, templateDetails);
    onUpdate('description_shiekh', shiekhDesc);
    
    setJobProgress({ status: 'generating', progress: 50, message: 'Generating descriptions for Karmaloop...', startTime });
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // LP-0.4.2.2: Generate and update Karmaloop description
    const karmaloopDesc = generateSiteDescription('karmaloop', product, selectedTone, templateDetails);
    onUpdate('description_karmaloop', karmaloopDesc);
    
    // LP-0.4.2.2: Generate and update MLTD description
    const mltdDesc = generateSiteDescription('mltd', product, selectedTone, templateDetails);
    onUpdate('description_mltd', mltdDesc);
    
    setJobProgress({ status: 'generating', progress: 70, message: 'Generating SEO metadata...', startTime });
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // LP-0.4.2.2: Generate and update SEO fields
    const metaName = generateMetaTitle(product);
    const metaDesc = generateMetaDescription(product, selectedTone);
    onUpdate('meta_name', metaName);
    onUpdate('meta_description', metaDesc);
    
    setJobProgress({ status: 'generating', progress: 90, message: 'Finalizing outputs...', startTime });
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Phase 3: Complete
    setJobProgress({ status: 'complete', progress: 100, message: 'Descriptions generated successfully!', startTime });

    // Add to AI history
    const newEntry: AIHistoryEntry = {
      id: `ai-${Date.now()}`,
      action: 'generate_descriptions',
      timestamp: new Date().toISOString(),
      result: `Generated descriptions using "${templateDetails?.name}" template with "${selectedTone}" tone`,
      confidence: Math.floor(Math.random() * 15) + 85, // 85-100
    };
    
    const newHistory = [...(product.aiHistory ?? []), newEntry];
    onUpdate('aiHistory', newHistory);

    // Reset after delay
    setTimeout(() => {
      setJobProgress({ status: 'idle', progress: 0, message: '' });
    }, 3000);
  };

  const handleQuickAction = (action: string) => {
    const newEntry: AIHistoryEntry = {
      id: `ai-${Date.now()}`,
      action,
      timestamp: new Date().toISOString(),
      result: `${action.replace(/_/g, ' ')} completed`,
      confidence: Math.floor(Math.random() * 20) + 80,
    };
    
    const newHistory = [...(product.aiHistory ?? []), newEntry];
    onUpdate('aiHistory', newHistory);
  };

  // Calculate elapsed time for job
  const elapsedTime = jobProgress.startTime 
    ? Math.round((Date.now() - jobProgress.startTime) / 1000) 
    : 0;

  return (
    <div className="editor-tab-content">
      {/* Describe Engine Controls */}
      <div className="form-section describe-engine-section">
        <div className="section-header-with-badge">
          <h3 className="form-section-title">Describe Engine</h3>
          <span className="power-badge">⚡ Power Feature</span>
        </div>
        <p className="form-section-description">
          Generate AI-powered product descriptions optimized for each target website.
        </p>

        {/* Audience Template Selector */}
        <div className="template-selector">
          <label className="form-label">Audience Template</label>
          <div className="template-grid">
            {AUDIENCE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                className={`template-card ${selectedTemplate === template.id ? 'template-card-selected' : ''}`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <span className="template-name">{template.name}</span>
                <span className="template-desc">{template.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tone Preset Overrides */}
        <div className="tone-selector">
          <label className="form-label">Tone Preset</label>
          <div className="tone-buttons">
            {TONE_PRESETS.map((tone) => (
              <button
                key={tone.id}
                className={`tone-button ${selectedTone === tone.id ? 'tone-button-selected' : ''}`}
                onClick={() => setSelectedTone(tone.id)}
              >
                <span className="tone-icon">{tone.icon}</span>
                <span className="tone-name">{tone.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button 
          className="advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="advanced-options">
            <div className="form-field">
              <label className="form-label">Custom Instructions</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Add any specific instructions for the AI (e.g., 'Emphasize sustainability', 'Include sizing advice')..."
              />
            </div>
            <div className="form-field">
              <label className="form-label checkbox-field-label">
                <input type="checkbox" defaultChecked />
                <span>Include SEO metadata</span>
              </label>
            </div>
            <div className="form-field">
              <label className="form-label checkbox-field-label">
                <input type="checkbox" defaultChecked />
                <span>Generate for all selected websites</span>
              </label>
            </div>
          </div>
        )}

        {/* Generate Button + Progress */}
        <div className="generate-action">
          {jobProgress.status === 'idle' ? (
            <button 
              className="generate-button"
              onClick={handleGenerateDescriptions}
            >
              <span className="generate-icon">🚀</span>
              Generate Descriptions
            </button>
          ) : (
            <div className="job-progress">
              <div className="progress-header">
                <span className={`progress-status progress-status-${jobProgress.status}`}>
                  {jobProgress.status === 'preparing' && '⏳'}
                  {jobProgress.status === 'generating' && '⚙️'}
                  {jobProgress.status === 'complete' && '✓'}
                  {jobProgress.status === 'error' && '⚠️'}
                  {' '}{jobProgress.message}
                </span>
                {jobProgress.status !== 'complete' && (
                  <span className="progress-time">{elapsedTime}s</span>
                )}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${jobProgress.progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="form-section">
        <h3 className="form-section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('fix_attributes')}
          >
            <span className="quick-action-icon">🔧</span>
            <span>Fix Attributes</span>
          </button>
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('enhance_seo')}
          >
            <span className="quick-action-icon">📈</span>
            <span>Enhance SEO</span>
          </button>
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('validate_export')}
          >
            <span className="quick-action-icon">✅</span>
            <span>Validate Export</span>
          </button>
          <button 
            className="quick-action-button"
            onClick={() => handleQuickAction('analyze_images')}
          >
            <span className="quick-action-icon">🖼️</span>
            <span>Analyze Images</span>
          </button>
        </div>
      </div>

      {/* AI History */}
      <div className="form-section">
        <h3 className="form-section-title">AI History</h3>
        <div className="ai-history-list">
          {(product.aiHistory ?? []).length === 0 ? (
            <p className="ai-history-empty">No AI actions performed yet</p>
          ) : (
            (product.aiHistory ?? []).slice().reverse().map((entry) => (
              <div key={entry.id} className="ai-history-item">
                <div className="ai-history-header">
                  <span className="ai-history-action">{formatAction(entry.action)}</span>
                  <span className="ai-history-time">{formatTime(entry.timestamp)}</span>
                </div>
                <p className="ai-history-result">{entry.result}</p>
                <div className="ai-history-footer">
                  <span className="ai-history-confidence">
                    Confidence: {entry.confidence}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Note:</strong> AI-generated content is created using product attributes, images, 
          and the selected audience template. Review outputs in the Descriptions tab before export.
        </p>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

// LP-0.4.2.2: Description generation helpers
// These simulate AI-generated content; in production, would call real AI service

interface TemplateInfo {
  id: string;
  name: string;
  description: string;
}

// Helper to safely get attribute value from product
function getProductAttr(product: Product, key: string): string {
  // Check top-level first, then attributes object
  const topLevel = (product as unknown as Record<string, unknown>)[key];
  if (typeof topLevel === 'string') return topLevel;
  
  const attrValue = product.attributes?.[key];
  if (typeof attrValue === 'string') return attrValue;
  if (Array.isArray(attrValue)) return attrValue.join(', ');
  
  return '';
}

function generateSiteDescription(
  site: 'shiekh' | 'karmaloop' | 'mltd', 
  product: Product, 
  tone: string,
  template?: TemplateInfo
): string {
  const productName = (product.name ?? getProductAttr(product, 'name')) || 'Product';
  const brandName = product.brand ?? getProductAttr(product, 'brand_name');
  const color = getProductAttr(product, 'color');
  const material = getProductAttr(product, 'materials');
  
  const audienceStyle = template?.name ?? 'Streetwear Enthusiast';
  
  // Site-specific variations
  const siteIntros: Record<string, string> = {
    shiekh: `Step up your sneaker game with the ${productName}`,
    karmaloop: `Level up your streetwear rotation with the ${productName}`,
    mltd: `Elevate your style with the ${productName}`,
  };
  
  const toneModifiers: Record<string, string> = {
    professional: 'Crafted with premium quality,',
    enthusiastic: 'Get ready to turn heads!',
    minimalist: 'Clean. Simple. Essential.',
    technical: 'Engineered for performance,',
    storytelling: 'Every step tells a story.',
  };
  
  const intro = siteIntros[site] || siteIntros.shiekh;
  const modifier = toneModifiers[tone] || toneModifiers.professional;
  
  let description = `${intro}`;
  if (brandName) description += ` from ${brandName}`;
  description += `. ${modifier}`;
  if (color) description += ` Available in ${color}.`;
  if (material) description += ` Made with ${material}.`;
  description += ` Perfect for the ${audienceStyle.toLowerCase()} lifestyle.`;
  description += ` [AI-Generated: ${template?.id ?? 'default'} template, ${tone} tone]`;
  
  return description;
}

function generateMetaTitle(product: Product): string {
  const productName = (product.name ?? getProductAttr(product, 'name')) || 'Product';
  const brandName = product.brand ?? getProductAttr(product, 'brand_name');
  
  let title = productName;
  if (brandName) title = `${brandName} ${productName}`;
  title += ' | Shop Now';
  
  // SEO best practice: keep under 60 chars
  if (title.length > 60) {
    title = title.substring(0, 57) + '...';
  }
  
  return title;
}

function generateMetaDescription(product: Product, tone: string): string {
  const productName = (product.name ?? getProductAttr(product, 'name')) || 'Product';
  const brandName = product.brand ?? getProductAttr(product, 'brand_name');
  const color = getProductAttr(product, 'color');
  
  // Use tone to vary the CTA style
  const ctaVariants: Record<string, string> = {
    professional: 'Shop now.',
    enthusiastic: 'Grab yours today!',
    minimalist: 'Shop.',
    technical: 'Order now.',
    storytelling: 'Start your journey.',
  };
  const cta = ctaVariants[tone] || ctaVariants.professional;
  
  let description = `Shop the ${productName}`;
  if (brandName) description += ` by ${brandName}`;
  description += `. `;
  if (color) description += `Available in ${color}. `;
  description += `Free shipping on orders over $75. ${cta}`;
  
  // SEO best practice: keep under 160 chars
  if (description.length > 160) {
    description = description.substring(0, 157) + '...';
  }
  
  return description;
}

export default AIActionsTab;
