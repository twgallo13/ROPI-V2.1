/**
 * Mobile Observation Capture Component
 * 
 * LP-1.1.1: Main UI for mobile observation capture workflow.
 * Includes MPN selection/scanning, observation entry, image capture,
 * and AI analysis integration.
 * 
 * References:
 * - Workflow W1 — Observations: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 */

import { useState, useCallback } from 'react';
import MobileMPNScanner, { ScannedProduct } from './MobileMPNScanner';
import ObservationImageUploader, { ImageFile } from './ObservationImageUploader';
import AIAnalyzeChips from './AIAnalyzeChips';
import FieldPicker from '../product/FieldPicker';
import { useObservationsSync } from '../../hooks/useObservationsSync';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { FieldLink } from '../../types/fieldLink';
import './MobileObservationCapture.css';

interface MobileObservationCaptureProps {
  // Optional props - component manages its own state
  apiBaseUrl?: string;
}

type Severity = 'low' | 'medium' | 'high';

function MobileObservationCapture({ apiBaseUrl = '/api' }: MobileObservationCaptureProps) {
  // Offline sync hook
  const { pendingCount, isOnline, isSyncing, addObservation, syncNow } = useObservationsSync({ apiBaseUrl });
  
  // LP-obs-studio-cleanup-1.3.0: Mobile detection for raw-first experience
  const isMobile = useIsMobile();
  
  // Product selection state
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Observation form state
  const [observationText, setObservationText] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [fieldLink, setFieldLink] = useState<FieldLink | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [images, setImages] = useState<ImageFile[]>([]);
  
  // LP-obs-studio-cleanup-1.0.0: Tags state
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // AI analysis state
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle MPN selection from scanner or autocomplete
  const handleProductSelect = useCallback((product: ScannedProduct) => {
    setSelectedProduct(product);
    setShowScanner(false);
    // Clear previous observation data when switching products
    setObservationText('');
    setDescription('');
    setSeverity('medium');
    setFieldLink(null);
    setImages([]);
    setTags([]);
    setTagInput('');
  }, []);

  // Handle images change from uploader
  const handleImagesChange = useCallback((newImages: ImageFile[]) => {
    setImages(newImages);
  }, []);

  // Handle AI suggestion acceptance
  const handleAcceptSuggestion = useCallback((suggestionText: string) => {
    // Add to observation text
    setObservationText(prev => {
      const trimmed = prev.trim();
      if (trimmed) {
        return `${trimmed}, ${suggestionText}`;
      }
      return suggestionText;
    });
  }, []);

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

    if (!observationText.trim()) {
      setErrorMessage('Please enter an observation');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      // Prepare observation data for offline queue
      const imageUrls = images
        .filter(img => img.status === 'uploaded' && img.url)
        .map(img => img.url);
      
      await addObservation({
        product_mpn: selectedProduct.product_mpn,
        text: observationText.trim(),
        description: description.trim() || undefined,
        severity,
        images: imageUrls,
        tags: tags.length > 0 ? tags : undefined,
        fieldLink: fieldLink ? {
          type: fieldLink.type,
          fieldPath: fieldLink.key,
          displayName: fieldLink.key.split('.').pop() || fieldLink.key,
        } : undefined,
        source: 'mobile_capture',
      });

      // LP-obs-studio-cleanup-1.0.0: Finish & Next flow
      // Show success, clear ALL state including product, and open scanner for next item
      setSuccessMessage('Observation saved!');
      setObservationText('');
      setDescription('');
      setSeverity('medium');
      setFieldLink(null);
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
  }, [selectedProduct, observationText, description, severity, fieldLink, images, addObservation, isOnline, syncNow]);

  // Handle clear/reset
  const handleClear = useCallback(() => {
    setSelectedProduct(null);
    setObservationText('');
    setDescription('');
    setSeverity('medium');
    setFieldLink(null);
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
      {/* LP-obs-studio-cleanup-1.3.0: Sync Status Banner - only show when offline or pending > 0 */}
      {(!isOnline || pendingCount > 0) && (
        <div className={`sync-banner ${isOnline ? 'pending' : 'offline'}`}>
          {!isOnline ? (
            <span>📴 Offline - observations will sync when online</span>
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
          {/* Observation Text */}
          <section className="capture-section">
            <label htmlFor="observation-text" className="section-title">
              Observation <span className="required">*</span>
            </label>
            <input
              id="observation-text"
              type="text"
              className="observation-input"
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              placeholder="e.g., hidden pocket, zipper detail..."
              autoComplete="off"
            />
            <p className="field-help">
              Enter tags or short notes (comma-separated for multiple)
            </p>
          </section>

          {/* LP-obs-studio-cleanup-1.0.0: Tags Input */}
          <section className="capture-section">
            <label htmlFor="tags-input" className="section-title">
              Tags <span className="optional">(optional)</span>
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

          {/* Description (optional) */}
          <section className="capture-section">
            <label htmlFor="description" className="section-title">
              Description <span className="optional">(optional)</span>
            </label>
            <textarea
              id="description"
              className="description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
            />
          </section>

          {/* LP-obs-studio-cleanup-1.3.0: Severity - hidden on mobile for raw-first experience */}
          {!isMobile && (
            <section className="capture-section">
              <span className="section-title">Severity</span>
              <div className="severity-options" role="radiogroup" aria-label="Severity level">
                {(['low', 'medium', 'high'] as Severity[]).map((level) => (
                  <button
                    key={level}
                    className={`severity-btn ${severity === level ? 'active' : ''} ${level}`}
                    onClick={() => setSeverity(level)}
                    role="radio"
                    aria-checked={severity === level}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* LP-obs-studio-cleanup-1.3.0: Field Link - hidden on mobile for raw-first experience */}
          {!isMobile && (
            <section className="capture-section">
              <button 
                className="collapsible-header"
                onClick={() => setShowFieldPicker(!showFieldPicker)}
                aria-expanded={showFieldPicker}
              >
                <span className="section-title">
                  Link to Field <span className="optional">(optional)</span>
                </span>
                <span className={`chevron ${showFieldPicker ? 'open' : ''}`}>▼</span>
              </button>
              
              {showFieldPicker && (
                <div className="field-picker-container">
                  <FieldPicker
                    value={fieldLink}
                    onChange={setFieldLink}
                  />
                  {fieldLink && (
                    <div className="selected-field">
                      Selected: <code>{fieldLink.key}</code>
                      <button 
                        className="clear-field-btn"
                        onClick={() => setFieldLink(null)}
                        aria-label="Clear field link"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Images */}
          <section className="capture-section">
            <span className="section-title">Images</span>
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
              disabled={saving || !observationText.trim()}
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
