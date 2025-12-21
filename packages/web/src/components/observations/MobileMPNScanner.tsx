/**
 * MobileMPNScanner Component
 * 
 * LP-1.1.1: Barcode scanner for scanning product MPNs.
 * Uses native BarcodeDetector API with @zxing/library fallback.
 * 
 * LP-1.2.3: Fixed 401 error by adding Authorization header to API requests.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { getAuthHeaders } from '@/lib/authHeaders';
import './MobileMPNScanner.css';

// Product type from API
export interface ScannedProduct {
  id: string;
  product_mpn: string;
  title: string;
  thumbnail?: string;
  sku?: string;
  brand?: string;
  category?: string;
}

interface MobileMPNScannerProps {
  onProductFound: (product: ScannedProduct) => void;
  onClose: () => void;
  apiBaseUrl?: string;
}

// Debounce helper
function debounce<T extends (...args: string[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: string[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Check if native BarcodeDetector is available
const hasNativeBarcodeDetector = 'BarcodeDetector' in window;

export default function MobileMPNScanner({
  onProductFound,
  onClose,
  apiBaseUrl = '/api',
}: MobileMPNScannerProps) {
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [manualMpn, setManualMpn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  
  // LP-1.1.10: Autocomplete state
  const [searchResults, setSearchResults] = useState<ScannedProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const zxingReaderRef = useRef<any>(null);
  
  // Cleanup function
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (zxingReaderRef.current) {
      zxingReaderRef.current.reset();
      zxingReaderRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  // Lookup product by MPN (exact match)
  const lookupProduct = useCallback(async (mpn: string): Promise<ScannedProduct | null> => {
    const cleanMpn = mpn.trim();
    if (!cleanMpn) return null;
    
    try {
      // LP-1.2.3: Get auth headers with Bearer token to fix 401 error
      const headers = await getAuthHeaders();
      const response = await fetch(`${apiBaseUrl}/products/by-mpn/${encodeURIComponent(cleanMpn)}`, {
        headers,
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please sign in.');
        }
        if (response.status === 404) {
          throw new Error(`No product found with MPN: ${cleanMpn}`);
        }
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data as ScannedProduct;
    } catch (err) {
      console.error('Product lookup error:', err);
      throw err;
    }
  }, [apiBaseUrl]);

  // LP-1.1.10: Search products by partial MPN
  const searchProducts = useCallback(async (query: string): Promise<ScannedProduct[]> => {
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return [];
    
    try {
      const response = await fetch(
        `${apiBaseUrl}/products/search-mpn?q=${encodeURIComponent(cleanQuery)}&limit=10`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        console.error('Search error:', response.status);
        return [];
      }
      
      const data = await response.json();
      return data.results || [];
    } catch (err) {
      console.error('Product search error:', err);
      return [];
    }
  }, [apiBaseUrl]);

  // LP-1.1.10: Debounced search handler
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSearchResults([]);
        setShowAutocomplete(false);
        return;
      }
      
      setIsSearching(true);
      const results = await searchProducts(query);
      setSearchResults(results);
      setShowAutocomplete(results.length > 0);
      setIsSearching(false);
    }, 300),
    [searchProducts]
  );

  // LP-1.1.10: Handle MPN input change with autocomplete
  const handleMpnInputChange = useCallback((value: string) => {
    setManualMpn(value);
    setError(null);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // LP-1.1.10: Handle autocomplete selection
  const handleAutocompleteSelect = useCallback((product: ScannedProduct) => {
    setShowAutocomplete(false);
    setSearchResults([]);
    setManualMpn('');
    onProductFound(product);
  }, [onProductFound]);

  // Handle successful barcode scan
  const handleBarcodeScan = useCallback(async (code: string) => {
    // Prevent duplicate scans
    if (code === lastScannedCode || isLoading) return;
    
    setLastScannedCode(code);
    setIsLoading(true);
    setError(null);
    
    try {
      const product = await lookupProduct(code);
      if (product) {
        stopCamera();
        onProductFound(product);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup product');
      // Reset last scanned code after a delay to allow retry
      setTimeout(() => setLastScannedCode(null), 2000);
    } finally {
      setIsLoading(false);
    }
  }, [lastScannedCode, isLoading, lookupProduct, stopCamera, onProductFound]);

  // Start camera and barcode detection
  const startCamera = useCallback(async () => {
    setError(null);
    
    try {
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
        
        // Start barcode detection
        if (hasNativeBarcodeDetector) {
          // Use native BarcodeDetector
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
          });
          
          scanIntervalRef.current = window.setInterval(async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  handleBarcodeScan(barcodes[0].rawValue);
                }
              } catch (err) {
                // Ignore detection errors
              }
            }
          }, 200);
        } else {
          // Use @zxing/library fallback
          const { BrowserMultiFormatReader } = await import('@zxing/library');
          const reader = new BrowserMultiFormatReader();
          zxingReaderRef.current = reader;
          
          // Use continuous decode from video - pass null for device ID to use default camera
          reader.decodeFromVideoDevice(null, videoRef.current, (result) => {
            if (result) {
              handleBarcodeScan(result.getText());
            }
            // Ignore errors - they happen when no barcode is in frame
          });
        }
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please enable camera permissions.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please use manual entry.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      }
      setMode('manual');
    }
  }, [handleBarcodeScan]);

  // Initialize camera when in scan mode
  useEffect(() => {
    if (mode === 'scan') {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [mode, startCamera, stopCamera]);

  // Handle manual MPN submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMpn.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const product = await lookupProduct(manualMpn);
      if (product) {
        onProductFound(product);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup product');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mobile-mpn-scanner">
      {/* Mode toggle */}
      <div className="scanner-tabs">
        <button
          className={`tab-btn ${mode === 'scan' ? 'active' : ''}`}
          onClick={() => setMode('scan')}
        >
          📷 Scan
        </button>
        <button
          className={`tab-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => setMode('manual')}
        >
          ⌨️ Manual
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="scanner-error">
          {error}
        </div>
      )}

      {/* Scan mode */}
      {mode === 'scan' && (
        <div className="scan-container">
          <video
            ref={videoRef}
            className="scanner-video"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="scanner-canvas"
            style={{ display: 'none' }}
          />
          
          {/* Scan overlay */}
          <div className="scan-overlay">
            <div className="scan-frame">
              <div className="scan-corner top-left" />
              <div className="scan-corner top-right" />
              <div className="scan-corner bottom-left" />
              <div className="scan-corner bottom-right" />
            </div>
          </div>
          
          {/* Status */}
          <div className="scan-status">
            {isLoading ? (
              <span className="loading">Looking up product...</span>
            ) : isCameraReady ? (
              <span>Position barcode within frame</span>
            ) : (
              <span>Starting camera...</span>
            )}
          </div>
        </div>
      )}

      {/* Manual mode with autocomplete - LP-1.1.10 */}
      {mode === 'manual' && (
        <form className="manual-form" onSubmit={handleManualSubmit}>
          <div className="form-group autocomplete-container">
            <label htmlFor="mpn-input">Search by MPN, SKU, or Product Name</label>
            <div className="input-wrapper">
              <input
                id="mpn-input"
                type="text"
                className="mpn-input"
                value={manualMpn}
                onChange={(e) => handleMpnInputChange(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                placeholder="Type MPN, SKU, or product name..."
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                aria-autocomplete="list"
                aria-controls="mpn-autocomplete"
                aria-expanded={showAutocomplete}
              />
              {isSearching && (
                <span className="search-spinner" aria-label="Searching..." />
              )}
            </div>
            
            {/* Autocomplete dropdown - LP-1.1.10 */}
            {showAutocomplete && searchResults.length > 0 && (
              <ul
                id="mpn-autocomplete"
                className="autocomplete-list"
                role="listbox"
              >
                {searchResults.map((product) => (
                  <li
                    key={product.id}
                    role="option"
                    className="autocomplete-item"
                    onClick={() => handleAutocompleteSelect(product)}
                  >
                    {product.thumbnail && (
                      <img
                        src={product.thumbnail}
                        alt=""
                        className="autocomplete-thumb"
                      />
                    )}
                    <div className="autocomplete-details">
                      <span className="autocomplete-mpn">{product.product_mpn}</span>
                      <span className="autocomplete-title">{product.title}</span>
                      {product.brand && (
                        <span className="autocomplete-brand">{product.brand}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {/* No results message */}
            {manualMpn.length >= 2 && !isSearching && searchResults.length === 0 && showAutocomplete && (
              <div className="autocomplete-empty">
                No products found. Try a different search or enter exact MPN.
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="lookup-btn"
            disabled={!manualMpn.trim() || isLoading}
          >
            {isLoading ? 'Looking up...' : 'Find by Exact MPN'}
          </button>
        </form>
      )}

      {/* Close button */}
      <button
        className="close-scanner-btn"
        onClick={onClose}
        aria-label="Close scanner"
      >
        Cancel
      </button>
    </div>
  );
}
