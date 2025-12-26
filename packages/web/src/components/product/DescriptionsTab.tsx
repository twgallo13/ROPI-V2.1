import { useState, useMemo } from 'react';
import type { Product } from '../../types/product';
import './DescriptionsTab.css';

/**
 * Descriptions & SEO Tab — LP-0.4.2
 * 
 * Tab 6: Site-specific outputs and SEO refinement
 * 
 * Features (per LP-0.4.2):
 * - Site Outputs: descriptionShiekh, descriptionKarmaloop, descriptionMltd, descriptionSangremia
 * - Dynamic Logic: Only show fields for websites selected in Tab 1
 * - SEO Section: metaName, metaDescription, keywords
 * - "Copy to Site" / "Accept AI Output" buttons for finalizing AI-generated content
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */

interface DescriptionsTabProps {
  product: Product;
  onUpdate: (path: string, value: unknown) => void;
}

// Website configuration for site-specific descriptions (using snake_case per registry)
const WEBSITE_CONFIG: Record<string, { label: string; key: string; placeholder: string }> = {
  'shiekh.com': {
    label: 'Shiekh.com',
    key: 'description_shiekh',
    placeholder: 'Urban streetwear description for Shiekh audience...',
  },
  'karmaloop.com': {
    label: 'Karmaloop',
    key: 'description_karmaloop',
    placeholder: 'Culture-forward description for Karmaloop audience...',
  },
  'mltd.com': {
    label: 'MLTD',
    key: 'description_mltd',
    placeholder: 'Lifestyle-focused description for MLTD audience...',
  },
  'sangremia.com': {
    label: 'Sangremia',
    key: 'description_sangremia',
    placeholder: 'Premium description for Sangremia audience...',
  },
};

// Mock AI-generated content for demo
const mockAIContent: Record<string, { description: string; confidence: number }> = {
  'shiekh.com': {
    description: 'Step up your game with the latest drop. This silhouette brings serious heat with premium construction and unmistakable style. Built for the streets, designed for those who set the trends.',
    confidence: 92,
  },
  'karmaloop.com': {
    description: 'A culture-defining piece that speaks to authenticity. Crafted with attention to detail and built to last, this is more than footwear—it\'s a statement. For those who move different.',
    confidence: 89,
  },
  'mltd.com': {
    description: 'Versatile style meets everyday comfort. Whether you\'re hitting the streets or keeping it casual, this versatile piece transitions seamlessly from day to night. Quality craftsmanship in every stitch.',
    confidence: 87,
  },
  'sangremia.com': {
    description: 'Elevate your collection with this premium selection. Impeccable craftsmanship meets refined design in a piece that embodies sophistication. Limited availability for the discerning collector.',
    confidence: 94,
  },
};

function DescriptionsTab({ product, onUpdate }: DescriptionsTabProps) {
  // Track which sites have accepted AI content
  const [acceptedSites, setAcceptedSites] = useState<Set<string>>(new Set());
  
  // LP-3.0.2: Defensive guard for websites array
  const websites = product.websites ?? [];
  
  // Filter to only configured websites
  const activeWebsites = useMemo(() => 
    websites.filter(site => WEBSITE_CONFIG[site]),
    [websites]
  );

  // Get site-specific description value using typed Product properties (snake_case)
  const getSiteDescription = (siteKey: string): string => {
    // Map site keys to Product properties
    switch (siteKey) {
      case 'description_shiekh':
        return product.description_shiekh ?? (product.attributes?.description_shiekh as string) ?? '';
      case 'description_karmaloop':
        return product.description_karmaloop ?? (product.attributes?.description_karmaloop as string) ?? '';
      case 'description_mltd':
        return product.description_mltd ?? (product.attributes?.description_mltd as string) ?? '';
      case 'description_sangremia':
        return product.description_sangremia ?? (product.attributes?.description_sangremia as string) ?? '';
      default:
        return (product.attributes?.[siteKey] as string) ?? '';
    }
  };

  // Handle accepting AI output
  const handleAcceptAI = (site: string) => {
    const aiContent = mockAIContent[site];
    const config = WEBSITE_CONFIG[site];
    if (aiContent && config) {
      onUpdate(config.key, aiContent.description);
      setAcceptedSites(prev => new Set([...prev, site]));
    }
  };

  // Handle copying content to another site
  const handleCopyToSite = (fromSite: string, toSite: string) => {
    const fromConfig = WEBSITE_CONFIG[fromSite];
    const toConfig = WEBSITE_CONFIG[toSite];
    if (fromConfig && toConfig) {
      const content = getSiteDescription(fromConfig.key);
      onUpdate(toConfig.key, content);
    }
  };

  // Get SEO values using typed Product properties (snake_case)
  const metaName = product.meta_name ?? 
                   (product.attributes?.meta_name as string) ?? '';
  const metaDescriptionValue = product.meta_description ?? 
                               (product.attributes?.meta_description as string) ?? '';
  const keywords = product.keywords ?? 
                   (product.attributes?.keywords as string) ?? '';

  return (
    <div className="editor-tab-content">
      {/* Dynamic Site Description Warning */}
      {activeWebsites.length === 0 && (
        <div className="warning-banner">
          <strong>No websites selected.</strong> Select target websites in the Core Information tab to enable site-specific descriptions.
        </div>
      )}

      {/* Site-Specific Descriptions */}
      {activeWebsites.map(site => {
        const config = WEBSITE_CONFIG[site];
        const aiContent = mockAIContent[site];
        const currentValue = getSiteDescription(config.key);
        const hasAccepted = acceptedSites.has(site);
        
        return (
          <div key={site} className="form-section site-description-section">
            <div className="site-section-header">
              <h3 className="form-section-title">{config.label}</h3>
              <div className="site-actions">
                {activeWebsites.length > 1 && (
                  <div className="copy-dropdown">
                    <button className="copy-button">
                      Copy to...
                    </button>
                    <div className="copy-menu">
                      {activeWebsites
                        .filter(s => s !== site)
                        .map(targetSite => (
                          <button
                            key={targetSite}
                            className="copy-menu-item"
                            onClick={() => handleCopyToSite(site, targetSite)}
                          >
                            {WEBSITE_CONFIG[targetSite]?.label}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Suggestion Card */}
            {aiContent && !hasAccepted && (
              <div className="ai-suggestion-card">
                <div className="ai-suggestion-header">
                  <span className="ai-badge">🤖 AI Suggestion</span>
                  <span className="ai-confidence">Confidence: {aiContent.confidence}%</span>
                </div>
                <p className="ai-suggestion-text">{aiContent.description}</p>
                <button 
                  className="accept-ai-button"
                  onClick={() => handleAcceptAI(site)}
                >
                  ✓ Accept AI Output
                </button>
              </div>
            )}
            
            {/* Description Textarea */}
            <div className="form-field">
              <label className="form-label">
                Product Description <span className="required">*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={6}
                value={currentValue}
                onChange={(e) => onUpdate(config.key, e.target.value)}
                placeholder={config.placeholder}
                data-field={`product.${config.key}`}
                name={`product.${config.key}`}
              />
              <div className="character-count">
                {currentValue.length} characters
                {currentValue.length < 100 && (
                  <span className="count-warning"> (recommended: 100+ characters)</span>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* SEO Section */}
      <div className="form-section seo-section">
        <div className="section-header-with-icon">
          <span className="section-icon">🔍</span>
          <h3 className="form-section-title">SEO Metadata</h3>
        </div>
        <p className="form-section-description">
          Search engine optimization fields for improved discoverability.
        </p>
        
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">
              Meta Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={metaName}
              onChange={(e) => onUpdate('meta_name', e.target.value)}
              placeholder="SEO-optimized page title"
              maxLength={60}
              data-field="product.meta_name"
              name="product.meta_name"
            />
            <div className="character-count">
              {metaName.length}/60 characters
              {metaName.length > 55 && (
                <span className="count-warning"> (approaching limit)</span>
              )}
            </div>
          </div>

          <div className="form-field form-field-full">
            <label className="form-label">
              Meta Description <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={metaDescriptionValue}
              onChange={(e) => onUpdate('meta_description', e.target.value)}
              placeholder="Brief description for search engines (150-160 characters optimal)"
              maxLength={160}
              data-field="product.meta_description"
              name="product.meta_description"
            />
            <div className="character-count">
              {metaDescriptionValue.length}/160 characters
              {metaDescriptionValue.length > 0 && metaDescriptionValue.length < 120 && (
                <span className="count-info"> (aim for 150-160)</span>
              )}
            </div>
          </div>

          <div className="form-field form-field-full">
            <label className="form-label">
              Keywords
            </label>
            <input
              type="text"
              className="form-input"
              value={keywords}
              onChange={(e) => onUpdate('keywords', e.target.value)}
              placeholder="sneakers, nike, air max, streetwear (comma-separated)"
              data-field="product.keywords"
              name="product.keywords"
            />
            <span className="form-hint">Comma-separated keywords for search optimization</span>
          </div>
        </div>
      </div>

      {/* SEO Preview */}
      <div className="form-section">
        <h3 className="form-section-title">Search Preview</h3>
        <div className="seo-preview">
          <div className="seo-preview-title">
            {metaName || product.name || 'Product Title'}
          </div>
          <div className="seo-preview-url">
            shiekh.com › products › {product.sku?.toLowerCase() || 'sku'}
          </div>
          <div className="seo-preview-description">
            {metaDescriptionValue || 'Add a meta description to see how your product will appear in search results...'}
          </div>
        </div>
      </div>

      <div className="form-note">
        <p>
          <strong>Tip:</strong> Each website may have a different target audience. Use the AI suggestions as a starting 
          point, then customize for each platform's unique voice and customer base.
        </p>
      </div>
    </div>
  );
}

export default DescriptionsTab;
