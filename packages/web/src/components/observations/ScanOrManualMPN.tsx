/**
 * ScanOrManualMPN Component
 * 
 * LP-observations-consolidation-1.3.0: Helper UI for product selection.
 * Presents two options: Scan barcode or Manual MPN entry.
 * Resolves product via API and returns productId for modal.
 * 
 * Used by: ObservationsPage for tags-first Add flow
 * 
 * References:
 * - LP-observations-consolidation-1.3.0: Replace legacy add flow with Scan/Manual MPN
 */

import { useState, useCallback } from 'react';
import { authFetch } from '../../services/authFetch';
import './ScanOrManualMPN.css';

export interface ResolvedProduct {
  id: string;
  mpn: string;
  title?: string;
  sku?: string;
  thumbnailUrl?: string;
}

interface ScanOrManualMPNProps {
  /** Called when a product is successfully resolved */
  onProductResolved: (product: ResolvedProduct) => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** API base URL (default: /api) */
  apiBaseUrl?: string;
}

/**
 * ScanOrManualMPN - Product selection for observations
 * 
 * Options:
 * 1. Scan - Opens camera scanner (uses MobileMPNScanner internally)
 * 2. Manual MPN - Text input with product lookup
 */
function ScanOrManualMPN({ 
  onProductResolved, 
  onCancel,
  apiBaseUrl = '/api' 
}: ScanOrManualMPNProps) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'scan'>('choose');
  const [mpnInput, setMpnInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve product by MPN
  const handleResolveMPN = useCallback(async () => {
    const mpn = mpnInput.trim();
    if (!mpn) {
      setError('Please enter an MPN');
      return;
    }

    setIsResolving(true);
    setError(null);

    try {
      const response = await authFetch(`${apiBaseUrl}/products/by-mpn/${encodeURIComponent(mpn)}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError(`Product not found for MPN: ${mpn}`);
        } else {
          const data = await response.json().catch(() => ({}));
          setError(data.message || `Error looking up product: ${response.status}`);
        }
        return;
      }

      const product = await response.json();
      
      // Successfully resolved
      onProductResolved({
        id: product.id,
        mpn: product.mpn || mpn,
        title: product.name || product.title,
        sku: product.sku,
        thumbnailUrl: product.thumbnailUrl || product.media?.thumbnail,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve product');
    } finally {
      setIsResolving(false);
    }
  }, [mpnInput, apiBaseUrl, onProductResolved]);

  // Handle Enter key in MPN input
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleResolveMPN();
    }
  }, [handleResolveMPN]);

  // Handle scan result (from camera scanner)
  const handleScanResult = useCallback(async (scannedMPN: string) => {
    setIsResolving(true);
    setError(null);

    try {
      const response = await authFetch(`${apiBaseUrl}/products/by-mpn/${encodeURIComponent(scannedMPN)}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError(`Product not found for scanned MPN: ${scannedMPN}`);
          setMode('manual');
          setMpnInput(scannedMPN);
        } else {
          setError('Error looking up scanned product');
        }
        return;
      }

      const product = await response.json();
      
      onProductResolved({
        id: product.id,
        mpn: product.mpn || scannedMPN,
        title: product.name || product.title,
        sku: product.sku,
        thumbnailUrl: product.thumbnailUrl || product.media?.thumbnail,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve scanned product');
      setMode('manual');
      setMpnInput(scannedMPN);
    } finally {
      setIsResolving(false);
    }
  }, [apiBaseUrl, onProductResolved]);

  // Render mode selection
  if (mode === 'choose') {
    return (
      <div className="scan-or-manual">
        <div className="scan-or-manual-header">
          <h3 className="scan-or-manual-title">Select Product</h3>
          {onCancel && (
            <button className="scan-or-manual-close" onClick={onCancel}>
              ×
            </button>
          )}
        </div>
        
        <p className="scan-or-manual-description">
          Choose how to find the product for your observation
        </p>
        
        <div className="scan-or-manual-options">
          <button 
            className="scan-or-manual-option scan-option"
            onClick={() => setMode('scan')}
          >
            <span className="option-icon">📷</span>
            <span className="option-label">Scan Barcode</span>
            <span className="option-hint">Use camera to scan product barcode</span>
          </button>
          
          <button 
            className="scan-or-manual-option manual-option"
            onClick={() => setMode('manual')}
          >
            <span className="option-icon">⌨️</span>
            <span className="option-label">Enter MPN</span>
            <span className="option-hint">Type the product MPN/SKU manually</span>
          </button>
        </div>
      </div>
    );
  }

  // Render manual MPN entry
  if (mode === 'manual') {
    return (
      <div className="scan-or-manual">
        <div className="scan-or-manual-header">
          <button className="scan-or-manual-back" onClick={() => setMode('choose')}>
            ← Back
          </button>
          <h3 className="scan-or-manual-title">Enter MPN</h3>
          {onCancel && (
            <button className="scan-or-manual-close" onClick={onCancel}>
              ×
            </button>
          )}
        </div>
        
        <div className="manual-mpn-form">
          <label className="manual-mpn-label">
            MPN / SKU
          </label>
          <div className="manual-mpn-input-row">
            <input
              type="text"
              className="manual-mpn-input"
              value={mpnInput}
              onChange={(e) => setMpnInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 211737-90H1-8"
              autoFocus
              disabled={isResolving}
            />
            <button
              className="manual-mpn-resolve-btn"
              onClick={handleResolveMPN}
              disabled={isResolving || !mpnInput.trim()}
            >
              {isResolving ? 'Looking up...' : 'Find Product'}
            </button>
          </div>
          
          {error && (
            <div className="scan-or-manual-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
          
          <p className="manual-mpn-hint">
            Enter the manufacturer part number or SKU to find the product
          </p>
        </div>
      </div>
    );
  }

  // Render scan mode
  if (mode === 'scan') {
    return (
      <div className="scan-or-manual">
        <div className="scan-or-manual-header">
          <button className="scan-or-manual-back" onClick={() => setMode('choose')}>
            ← Back
          </button>
          <h3 className="scan-or-manual-title">Scan Barcode</h3>
          {onCancel && (
            <button className="scan-or-manual-close" onClick={onCancel}>
              ×
            </button>
          )}
        </div>
        
        <div className="scan-mode-content">
          {isResolving ? (
            <div className="scan-resolving">
              <div className="scan-spinner" />
              <p>Looking up product...</p>
            </div>
          ) : (
            <div className="scan-placeholder">
              {/* In production, this would use a camera scanner component */}
              <div className="scan-camera-placeholder">
                <span className="camera-icon">📷</span>
                <p>Camera scanner would appear here</p>
              </div>
              
              {/* For demo/testing: manual entry fallback */}
              <div className="scan-demo-input">
                <p className="scan-demo-label">Demo: Enter scanned MPN</p>
                <div className="manual-mpn-input-row">
                  <input
                    type="text"
                    className="manual-mpn-input"
                    value={mpnInput}
                    onChange={(e) => setMpnInput(e.target.value)}
                    placeholder="Enter MPN as if scanned"
                  />
                  <button
                    className="manual-mpn-resolve-btn"
                    onClick={() => handleScanResult(mpnInput.trim())}
                    disabled={!mpnInput.trim()}
                  >
                    Simulate Scan
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="scan-or-manual-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export default ScanOrManualMPN;
