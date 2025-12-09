import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useProduct } from '../hooks/useProduct';
import ProductHeader from '../components/product/ProductHeader';
import CoreInformationTab from '../components/product/CoreInformationTab';
import ProductAttributesTab from '../components/product/ProductAttributesTab';
import DescriptionsTab from '../components/product/DescriptionsTab';
import LaunchMediaTab from '../components/product/LaunchMediaTab';
import AIActionsTab from '../components/product/AIActionsTab';
import ObservationsPanel from '../components/product/ObservationsPanel';
import SmartSuggestionsPanel from '../components/product/SmartSuggestionsPanel';
import ExportReadinessPanel from '../components/product/ExportReadinessPanel';
import './ProductEditorPage.css';

/**
 * Product Editor Page — AOSS_PRODUCT_EDITOR_LAYOUT_v1.1
 * 
 * Complete interactive Product Editor with:
 * - Top header bar with product metadata and actions
 * - 5 tabbed editing sections
 * - Right sidebar with Observations, Smart Suggestions, and Export Readiness panels
 * 
 * TODO: Wire to Firestore and production AI services
 * 
 * References:
 * - Product Completion Workflows (W2): https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - Section 1 — Navigation & Page Index: https://www.notion.so/eba3cfdc44fd49ef98c38b183642cc7b
 * - Admin UI Build Spec — Settings CRUD: https://www.notion.so/2b845ee1ec5a81e58df8f9633b2e0e2b
 */
function ProductEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('core');

  // Debug: Log product ID from URL
  console.debug('[ProductEditorPage] Product ID from URL:', id);

  // Defensive: Require product ID in URL
  if (!id) {
    return (
      <div className="product-editor-error">
        <h2>No product ID in URL</h2>
        <p>Please use /app/products/:id</p>
        <button onClick={() => navigate('/app/products')}>Back to Products</button>
      </div>
    );
  }

  const {
    product,
    loading,
    saveProduct,
    updateField,
    applySuggestion,
    ignoreSuggestion,
  } = useProduct(id);

  // Sync tab with URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['core', 'attributes', 'descriptions', 'launch', 'ai'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSave = () => {
    if (product) {
      saveProduct(product);
      alert('Product saved to localStorage!');
    }
  };

  const handlePublish = () => {
    if (product) {
      // TODO: Wire to actual publish endpoint
      alert('Publish functionality will be wired to backend');
    }
  };

  if (loading) {
    return <div className="product-editor-loading">Loading product...</div>;
  }

  if (!product) {
    return <div className="product-editor-error">Product not found</div>;
  }

  const tabs = [
    { id: 'core', label: 'Core Information' },
    { id: 'attributes', label: 'Product Attributes' },
    { id: 'descriptions', label: 'Descriptions & SEO' },
    { id: 'launch', label: 'Launch & Media' },
    { id: 'ai', label: 'AI Actions' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'core':
        return <CoreInformationTab product={product} onUpdate={updateField} />;
      case 'attributes':
        return <ProductAttributesTab product={product} onUpdate={updateField} />;
      case 'descriptions':
        return <DescriptionsTab product={product} onUpdate={updateField} />;
      case 'launch':
        return <LaunchMediaTab product={product} onUpdate={updateField} />;
      case 'ai':
        return <AIActionsTab product={product} onUpdate={updateField} />;
      default:
        return null;
    }
  };

  return (
    <div className="product-editor">
      {/* Product Header */}
      <ProductHeader
        product={product}
        onSave={handleSave}
        onPublish={handlePublish}
        onBack={() => navigate('/products')}
      />

      {/* Tab Bar */}
      <div className="product-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`product-tab ${activeTab === tab.id ? 'product-tab-active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area with Sidebar */}
      <div className="product-body">
        {/* Tab Content Area */}
        <div className="product-content">
          {renderTabContent()}
        </div>

        {/* Right Sidebar with Panels */}
        <div className="product-sidebar">
          <ObservationsPanel
            productId={product.id}
          />
          
          <SmartSuggestionsPanel
            suggestions={product.smartSuggestions}
            onApplySuggestion={applySuggestion}
            onIgnoreSuggestion={ignoreSuggestion}
          />
          
          <ExportReadinessPanel
            readiness={product.exportReadiness}
            websites={product.websites}
            onJumpToTab={handleTabChange}
          />
        </div>
      </div>
    </div>
  );
}

export default ProductEditorPage;
