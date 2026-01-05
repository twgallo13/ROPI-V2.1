import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useProduct } from '../hooks/useProduct';
import { useProductCompletion } from '../hooks/useProductCompletion';
import { isFirebaseAvailable } from '../firebaseConfig';
import ProductHeader from '../components/product/ProductHeader';
import CoreInformationTab from '../components/product/CoreInformationTab';
import ProductAttributesTab from '../components/product/ProductAttributesTab';
import LaunchMediaTab from '../components/product/LaunchMediaTab';
import TechnicalTab from '../components/product/TechnicalTab';
import AIActionsTab from '../components/product/AIActionsTab';
import DescriptionsTab from '../components/product/DescriptionsTab';
import ObservationsPanel from '../components/product/ObservationsPanel';
import SmartSuggestionsPanel from '../components/product/SmartSuggestionsPanel';
import ExportReadinessPanel from '../components/product/ExportReadinessPanel';
import { CompletionExportGatePanel } from '../components/product/CompletionExportGatePanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { safeArray } from '../lib/productUtils';
import './ProductEditorPage.css';

/**
 * Product Editor Page — AOSS_PRODUCT_EDITOR_LAYOUT_v1.1, LP-export-unlock-1.0.0
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
        <p>Please use /products/:id</p>
        <button onClick={() => navigate('/products')}>Back to Products</button>
      </div>
    );
  }

  const {
    product,
    loading,
    saveProduct,
    updateField,
    updateFields,
    applySuggestion,
    ignoreSuggestion,
  } = useProduct(id);

  // LP-export-unlock-1.0.0: Fetch product completion for publish gating
  const { 
    loading: completionLoading, 
    canPublish 
  } = useProductCompletion(id);

  // Sync tab with URL query param
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['core', 'attributes', 'launch', 'technical', 'ai', 'descriptions'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSave = async () => {
    if (product) {
      const success = await saveProduct(product);
      // LP-1.4.6.4: Accurate save feedback based on actual persistence target
      const target = isFirebaseAvailable() ? 'Firestore' : 'localStorage';
      if (success) {
        console.log(`[ProductEditorPage] Product ${product.id} saved to ${target}`);
        alert(`Product saved to ${target}`);
      } else {
        console.error(`[ProductEditorPage] Failed to save product ${product.id} to ${target}`);
        alert(`Failed to save product to ${target}. Check console for details.`);
      }
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

  // LP-3.0.7: Ensure safe defaults for product data
  const safeExportReadiness = product.exportReadiness ?? { overall: 0, byWebsite: {} };
  const safeWebsites = safeArray(product.websites);
  const safeSuggestions = safeArray(product.smartSuggestions);

  // LP-0.4.2: Updated tab order - Technical (4), AI Actions (5), Descriptions (6)
  const tabs = [
    { id: 'core', label: 'Core Information' },
    { id: 'attributes', label: 'Product Attributes' },
    { id: 'launch', label: 'Launch & Media' },
    { id: 'technical', label: 'Technical' },
    { id: 'ai', label: 'AI Actions' },
    { id: 'descriptions', label: 'Descriptions & SEO' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'core':
        return <CoreInformationTab product={product} onUpdate={updateField} onUpdateMultiple={updateFields} />;
      case 'attributes':
        return <ProductAttributesTab product={product} onUpdate={updateField} />;
      case 'launch':
        return <LaunchMediaTab product={product} onUpdate={updateField} />;
      case 'technical':
        return <TechnicalTab product={product} onUpdate={updateField} />;
      case 'ai':
        return <AIActionsTab product={product} onUpdate={updateField} />;
      case 'descriptions':
        return <DescriptionsTab product={product} onUpdate={updateField} />;
      default:
        return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="product-editor">
        {/* Product Header — LP-export-unlock-1.0.0: Publish gated by completion.ready */}
        <ProductHeader
          product={product}
          onSave={handleSave}
          onPublish={handlePublish}
          onBack={() => navigate('/products')}
          canPublish={canPublish}
          publishReadinessLoading={completionLoading}
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
            <CompletionExportGatePanel
              productId={product.id}
            />
            
            <ObservationsPanel
              productId={product.id}
            />
            
            <SmartSuggestionsPanel
              suggestions={safeSuggestions}
              onApplySuggestion={applySuggestion}
              onIgnoreSuggestion={ignoreSuggestion}
            />
            
            <ExportReadinessPanel
              readiness={safeExportReadiness}
              websites={safeWebsites}
              onJumpToTab={handleTabChange}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default ProductEditorPage;
