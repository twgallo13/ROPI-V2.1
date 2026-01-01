/**
 * Mobile Observation Capture Component
 * 
 * LP-observations-consolidation-1.0.0: Hydrates tags from product.observation (SRoT).
 * LP-obs-studio-cleanup-1.6.6: Simplified tags-only observation capture.
 * 
 * Captures product-level observation tags and stores directly on product document.
 * 
 * Workflow:
 * 1. Scan/select product by MPN
 * 2. Hydrate existing tags from product.observation (SRoT)
 * 3. Add observation tags (quick keywords)
 * 4. Optionally capture images
 * 5. Save to product.observation via PATCH endpoint
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - LP-obs-studio-cleanup-1.6.6: Collapse observations into product-level
 */

import { useState, useCallback, useEffect } from 'react';
import MobileMPNScanner, { ScannedProduct } from './MobileMPNScanner';
import ObservationImageUploader, { ImageFile } from './ObservationImageUploader';
import AIAnalyzeChips from './AIAnalyzeChips';
import { useObservationsSync } from '../../hooks/useObservationsSync';
import { listenToProductObservation, type ProductObservation } from '../../services/observations';
import './MobileObservationCapture.css';

interface MobileObservationCaptureProps {
  apiBaseUrl?: string;
}

function MobileObservationCapture({ apiBaseUrl = '/api' }: MobileObservationCaptureProps) {
  // Offline sync hook - LP-1.7.0: Added failedCount and lastSyncError
  const { 
    pendingCount, 
    failedCount, 
    isOnline, 
    isSyncing, 
    lastSyncError,
    addObservation, 
    syncNow,
    clearSyncError,
  } = useObservationsSync({ apiBaseUrl });
  
  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // LP-obs-studio-cleanup-1.6.6: Simplified tags-only observation
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [images, setImages] = useState<ImageFile[]>([]);
  
  // LP-observations-consolidation-1.0.0: Existing product observation state (for hydration display)
  const [_existingObservation, setExistingObservation] = useState<ProductObservation | null>(null);
  
  // AI analysis state
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // LP-observations-consolidation-1.0.0: Listen to product.observation when product is selected
  useEffect(() => {
    if (!selectedProduct?.id) {
      setExistingObservation(null);
      return;
    }

    const unsubscribe = listenToProductObservation(selectedProduct.id, (observation) => {
      setExistingObservation(observation);
      // Hydrate tags from product.observation if not already editing
      // Only on initial load (when tags are empty)
      if (tags.length === 0 && observation.tags.length > 0) {
        setTags(observation.tags);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
    // Only re-run when product changes, not when tags change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct?.id]);

  // Handle MPN selection from scanner or autocomplete
  const handleProductSelect = useCallback((product: ScannedProduct) => {
    setSelectedProduct(product);
    setShowScanner(false);
    // Clear previous observation data when switching products
    setImages([]);
    setTags([]);
    setTagInput('');
  }, []);

  // Handle images change from uploader
  const handleImagesChange = useCallback((newImages: ImageFile[]) => {
    setImages(newImages);
  }, []);

  // Handle AI suggestion acceptance - add as tag
  const handleAcceptSuggestion = useCallback((suggestionText: string) => {
    const newTag = suggestionText.trim().toLowerCase();
    if (newTag && !tags.includes(newTag)) {
      setTags(prev => [...prev, newTag]);
    }
  }, [tags]);

  // LP-obs-studio-cleanup-1.0.0: Tag input handlers
  const handleTagInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (newTag && !tags.includes(newTag)) {
        setTags(prev => [...prev, newTag]);
      }
      setTagInput('');
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      // Remove last tag when backspace on empty input
      setTags(prev => prev.slice(0, -1));
    }
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  // Handle save and continue
  const handleSave = useCallback(async () => {
    if (!selectedProduct) {
      setErrorMessage('Please select a product first');
      return;
    }

    if (tags.length === 0) {
      setErrorMessage('Please add at least one tag');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      // Prepare observation data for offline queue
      const imageUrls = images
        .filter(img => img.status === 'uploaded' && img.url)
        .map(img => img.url);
      
      // LP-obs-studio-cleanup-1.6.6: Simplified tags-only observation
      await addObservation({
        product_mpn: selectedProduct.product_mpn,
        productId: selectedProduct.id, // Include product ID for new endpoint
        tags,
        images: imageUrls,
        source: 'mobile_capture',
      });

      // LP-obs-studio-cleanup-1.0.0: Finish & Next flow
      // Show success, clear ALL state including product, and open scanner for next item
      setSuccessMessage('Observation saved!');
      setImages([]);
      setTags([]);
      setTagInput('');
      setSelectedProduct(null);
      
      // Open scanner for next product (Finish & Next)
      setTimeout(() => {
        setShowScanner(true);
        setSuccessMessage(null);
      }, 1000);
      
      // Try to sync if online
      if (isOnline) {
        syncNow();
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save observation');
    } finally {
      setSaving(false);
    }
  }, [selectedProduct, tags, images, addObservation, isOnline, syncNow]);

  // Handle clear/reset
  const handleClear = useCallback(() => {
    setSelectedProduct(null);
    setImages([]);
    setTags([]);
    setTagInput('');
    setErrorMessage(null);
  }, []);

  // Get uploaded image URLs for AI analysis
  const uploadedImageUrls = images
    .filter(img => img.status === 'uploaded' && img.url)
    .map(img => img.url);

  return (
    <div className="mobile-observation-capture">
      {/* LP-obs-studio-cleanup-1.7.0: Enhanced Sync Status Banner with error state */}
      {(!isOnline || pendingCount > 0 || lastSyncError || failedCount > 0) && (
        <div className={`sync-banner ${!isOnline ? 'offline' : lastSyncError || failedCount > 0 ? 'error' : 'pending'}`}>
          {!isOnline ? (
            <span>📴 Offline - observations will sync when online</span>
          ) : lastSyncError ? (
            <span>
              ⚠️ {lastSyncError}
              <button className="sync-now-btn" onClick={() => { clearSyncError(); syncNow(); }}>Retry</button>
            </span>
          ) : failedCount > 0 ? (
            <span>
              ⚠️ {failedCount} sync failed - 
              <button className="sync-now-btn" onClick={syncNow}>Retry</button>
            </span>
          ) : isSyncing ? (
            <span>🔄 Syncing {pendingCount} observation(s)...</span>
          ) : pendingCount > 0 ? (
            <span>
              📤 {pendingCount} pending observation(s)
              <button className="sync-now-btn" onClick={syncNow}>Sync Now</button>
            </span>
          ) : null}
        </div>
      )}

      {/* Product Selection */}
      <section className="capture-section product-section">
        <h2 className="section-title">Product</h2>
        
        {selectedProduct ? (
          <div className="selected-product-card">
            {selectedProduct.thumbnail && (
              <img 
                src={selectedProduct.thumbnail} 
                alt={selectedProduct.title}
                className="product-thumbnail"
              />
            )}
            <div className="product-info">
              <span className="product-mpn">{selectedProduct.product_mpn}</span>
              <span className="product-title">{selectedProduct.title}</span>
              {selectedProduct.brand && (
                <span className="product-brand">{selectedProduct.brand}</span>
              )}
            </div>
            <button 
              className="change-product-btn"
              onClick={() => setShowScanner(true)}
              aria-label="Change product"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="product-selection">
            <button 
              className="scan-btn primary"
              onClick={() => setShowScanner(true)}
            >
              <span className="scan-icon">📷</span>
              Scan or Enter MPN
            </button>
          </div>
        )}
      </section>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="scanner-modal">
          <div className="scanner-header">
            <h3>Find Product</h3>
            <button 
              className="close-btn"
              onClick={() => setShowScanner(false)}
              aria-label="Close scanner"
            >
              ✕
            </button>
          </div>
          <MobileMPNScanner
            onProductFound={handleProductSelect}
            onClose={() => setShowScanner(false)}
            apiBaseUrl={apiBaseUrl}
          />
        </div>
      )}

      {/* Observation Form (only show if product selected) */}
      {selectedProduct && (
        <>
          {/* LP-obs-studio-cleanup-1.6.6: Tags-only Input */}
          <section className="capture-section">
            <label htmlFor="tags-input" className="section-title">
              Observation Tags <span className="required">*</span>
            </label>
            <div className="tags-input-container">
              {tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button
                    type="button"
                    className="tag-remove-btn"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                id="tags-input"
                type="text"
                className="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={tags.length === 0 ? "e.g., hidden pocket, runs small" : "Add another tag..."}
                autoComplete="off"
              />
            </div>
            <p className="field-help">
              Press Enter or comma to add a tag. Backspace removes last tag.
            </p>
          </section>

          {/* Images */}
          <section className="capture-section">
            <span className="section-title">Images <span className="optional">(optional)</span></span>
            <ObservationImageUploader
              images={images}
              onImagesChange={handleImagesChange}
              productMpn={selectedProduct.product_mpn}
              maxImages={5}
            />
          </section>

          {/* AI Analysis Toggle */}
          <section className="capture-section">
            <div className="ai-toggle">
              <label htmlFor="ai-analysis-toggle" className="toggle-label">
                <span className="section-title">AI Analysis</span>
                <span className="toggle-hint">Analyze images for suggestions</span>
              </label>
              <input
                id="ai-analysis-toggle"
                type="checkbox"
                className="toggle-input"
                checked={showAIAnalysis}
                onChange={(e) => setShowAIAnalysis(e.target.checked)}
              />
            </div>
            
            {showAIAnalysis && uploadedImageUrls.length > 0 && (
              <div className="ai-analysis-section">
                <AIAnalyzeChips
                  imageUrls={uploadedImageUrls}
                  onSuggestionSelect={handleAcceptSuggestion}
                  apiBaseUrl={apiBaseUrl}
                />
              </div>
            )}
            
            {showAIAnalysis && uploadedImageUrls.length === 0 && (
              <p className="ai-hint">Upload images to enable AI analysis</p>
            )}
          </section>

          {/* Messages */}
          {errorMessage && (
            <div className="message error" role="alert">
              {errorMessage}
            </div>
          )}
          
          {successMessage && (
            <div className="message success" role="status">
              {successMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="action-buttons">
            <button
              className="save-btn primary"
              onClick={handleSave}
              disabled={saving || tags.length === 0}
            >
              {saving ? 'Saving...' : 'Finish & Next'}
            </button>
            <button
              className="clear-btn secondary"
              onClick={handleClear}
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default MobileObservationCapture;
