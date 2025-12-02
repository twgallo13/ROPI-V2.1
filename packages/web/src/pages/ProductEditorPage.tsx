import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './ProductEditorPage.css';

/**
 * Product Editor Page
 * 
 * TODO: Implement full product editing functionality according to:
 * - Product Completion Workflows: https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Workflow W2 — Full Product Completion: https://www.notion.so/2ba45ee1ec5a809cbc1fd8daebc3f147
 * - Observations — Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * 
 * Layout:
 * - Product header bar with SKU, name, status, website chips
 * - 5 tabs for different editing sections
 * - Right sidebar with 3 panels: Observations, Smart Suggestions, Export Readiness
 */
function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>('core');

  const tabs = [
    { id: 'core', label: 'Core Information' },
    { id: 'attributes', label: 'Product Attributes' },
    { id: 'descriptions', label: 'Descriptions & SEO' },
    { id: 'launch', label: 'Launch & Media' },
    { id: 'ai', label: 'AI Actions' },
  ];

  return (
    <div className="product-editor">
      {/* Product Header */}
      <div className="product-header">
        <div className="product-header-left">
          <button
            onClick={() => navigate('/products')}
            className="product-back-button"
          >
            ← Back to Products
          </button>
        </div>
        <div className="product-header-center">
          <div className="product-header-field">
            <span className="product-header-label">SKU:</span>
            <span className="product-header-value">PROD-{id}</span>
          </div>
          <div className="product-header-field">
            <span className="product-header-label">Name:</span>
            <span className="product-header-value">Product Name Placeholder</span>
          </div>
          <div className="product-status-chip product-status-draft">Draft</div>
          <div className="product-website-chip">Website: Main</div>
        </div>
        <div className="product-header-right">
          <button className="product-action-button product-action-secondary">
            Preview
          </button>
          <button className="product-action-button product-action-primary">
            Save
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="product-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`product-tab ${activeTab === tab.id ? 'product-tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="product-body">
        {/* Tab Content Area */}
        <div className="product-content">
          <div className="product-content-inner">
            <h3 className="product-content-title">
              {tabs.find(t => t.id === activeTab)?.label}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '1rem' }}>
              Form fields and inputs for {tabs.find(t => t.id === activeTab)?.label.toLowerCase()} will be implemented here.
            </p>
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--color-background)', borderRadius: '6px' }}>
              <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                📋 Implementation details in Notion:
              </p>
              <ul style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                <li>Product Completion Workflows</li>
                <li>Section 1 — Navigation & Page Index</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Sidebar with Panels */}
        <div className="product-sidebar">
          {/* Observations Panel */}
          <div className="product-panel">
            <div className="product-panel-header">
              <h4 className="product-panel-title">Observations</h4>
              <span className="product-panel-badge">3</span>
            </div>
            <div className="product-panel-content">
              <div className="product-panel-item">
                <div className="product-panel-item-icon">👁️</div>
                <div className="product-panel-item-text">
                  <p className="product-panel-item-title">Missing brand attribute</p>
                  <p className="product-panel-item-description">AI suggests adding brand information</p>
                </div>
              </div>
              <div className="product-panel-item">
                <div className="product-panel-item-icon">👁️</div>
                <div className="product-panel-item-text">
                  <p className="product-panel-item-title">Incomplete description</p>
                  <p className="product-panel-item-description">Product description is less than recommended length</p>
                </div>
              </div>
              <div className="product-panel-item">
                <div className="product-panel-item-icon">👁️</div>
                <div className="product-panel-item-text">
                  <p className="product-panel-item-title">Missing category</p>
                  <p className="product-panel-item-description">Primary category not assigned</p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '1rem', fontStyle: 'italic' }}>
                📋 Based on Workflow W1 — Observations Capture & Apply
              </p>
            </div>
          </div>

          {/* Smart Suggestions Panel */}
          <div className="product-panel">
            <div className="product-panel-header">
              <h4 className="product-panel-title">Smart Suggestions</h4>
              <span className="product-panel-badge">2</span>
            </div>
            <div className="product-panel-content">
              <div className="product-panel-item">
                <div className="product-panel-item-icon">⚡</div>
                <div className="product-panel-item-text">
                  <p className="product-panel-item-title">AI-Generated Title</p>
                  <p className="product-panel-item-description">Click to apply suggested title improvements</p>
                </div>
              </div>
              <div className="product-panel-item">
                <div className="product-panel-item-icon">⚡</div>
                <div className="product-panel-item-text">
                  <p className="product-panel-item-title">Related Products</p>
                  <p className="product-panel-item-description">5 similar products found for cross-reference</p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '1rem', fontStyle: 'italic' }}>
                📋 Based on Product Completion Workflows
              </p>
            </div>
          </div>

          {/* Export Readiness Panel */}
          <div className="product-panel">
            <div className="product-panel-header">
              <h4 className="product-panel-title">Export Readiness</h4>
              <span className="product-panel-badge product-panel-badge-warning">45%</span>
            </div>
            <div className="product-panel-content">
              <div className="product-readiness-bar">
                <div className="product-readiness-bar-fill" style={{ width: '45%' }}></div>
              </div>
              <div className="product-readiness-checklist">
                <div className="product-readiness-item product-readiness-complete">
                  <span>✓</span> Core information
                </div>
                <div className="product-readiness-item product-readiness-incomplete">
                  <span>○</span> Product attributes
                </div>
                <div className="product-readiness-item product-readiness-incomplete">
                  <span>○</span> Descriptions
                </div>
                <div className="product-readiness-item product-readiness-complete">
                  <span>✓</span> Media assets
                </div>
              </div>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '1rem', fontStyle: 'italic' }}>
                📋 Based on Workflow W2 — Full Product Completion
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductEditorPage;
