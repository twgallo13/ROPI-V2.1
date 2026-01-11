import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/common/PageLayout';
import { usePageTitle } from '../hooks/usePageTitle';
import { syncLocalToFirestore } from '../services/observations';
import { authFetch } from '../services/authFetch';
import { Observation, ObservationSeverity, ObservationStatus, ObservationCreator } from '../types/observation';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

import { listProductObservations, ProductObservation, useProductObservationSRoT } from '../services/productObservations';
import { useAuth } from '../hooks/useAuth';
import { isFirebaseAvailable } from '../firebaseConfig';
import ScanOrManualMPN, { type ResolvedProduct } from '../components/observations/ScanOrManualMPN';
import ObservationsAddModal from '../components/observations/ObservationsAddModal';

/**
 * Observations Page
 * 
 * LP-observations-consolidation-1.3.0: Replaced legacy add flow with Scan/Manual MPN.
 * Primary Add action now opens ScanOrManualMPN → ObservationsAddModal (tags-first).
 * Legacy form kept behind dropdown for migration period.
 * 
 * LP-observations-consolidation-1.4.0: Migrated to product.observation SRoT.
 * Read path now uses listProductObservations() from productObservations service.
 * Legacy observations collection retired as canonical source.
 * 
 * Displays all observations across all products with filtering and resolution capabilities.
 * Uses Firestore when available, falls back to localStorage when offline.
 * 
 * Related Notion docs:
 * - Workflow W1 — Observations Capture & Apply: https://www.notion.so/2b845ee1ec5a81b5a4a6d3ea439ec277
 * - Observations — Overview: https://www.notion.so/2b845ee1ec5a81e1aeeae43318b38039
 * - Product Completion Workflows: https://www.notion.so/2ba45ee1ec5a80698690f9492961ed8b
 */
function ObservationsPage() {
  usePageTitle('Observations');
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Create ObservationCreator from authenticated user
  const user: ObservationCreator = currentUser ? {
    uid: currentUser.uid,
    name: currentUser.displayName || currentUser.email || 'Unknown User',
  } : {
    uid: 'anonymous',
    name: 'Anonymous',
  };
  
  // LP-observations-consolidation-1.4.0: Use product.observation SRoT
  const useSRoT = useProductObservationSRoT();
  
  // State for new SRoT (product observations)
  const [productObservations, setProductObservations] = useState<ProductObservation[]>([]);
  
  // State for legacy observations (kept for migration period)
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ObservationStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<ObservationSeverity | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('');  // LP-1.4.0: Tag search
  const [isOffline, setIsOffline] = useState(!isFirebaseAvailable());
  const [syncing, setSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // LP-observations-consolidation-1.3.0: New add flow state
  const [showAddFlow, setShowAddFlow] = useState(false);
  const [resolvedProduct, setResolvedProduct] = useState<ResolvedProduct | null>(null);
  
  // Legacy add flow state (kept for migration)
  const [showLegacyDropdown, setShowLegacyDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newObservation, setNewObservation] = useState({
    title: '',
    description: '',
    severity: 'medium' as ObservationSeverity,
    productId: '123', // Default product ID for demo
  });

  // Mock product IDs for demo - legacy fallback only
  const demoProductIds = ['123', '456', '789'];

  useEffect(() => {
    loadObservations();
  }, [useSRoT]);

  async function loadObservations() {
    setLoading(true);
    setError(null);
    try {
      // LP-observations-consolidation-1.4.0: Use product.observation SRoT
      if (useSRoT) {
        const prodObs = await listProductObservations(100);
        setProductObservations(prodObs);
        setObservations([]); // Clear legacy state
      } else {
        // Legacy fallback - loop through demo products
        const { listObservations } = await import('../services/observations');
        const allObservations: Observation[] = [];
        for (const productId of demoProductIds) {
          const obs = await listObservations(productId);
          allObservations.push(...obs);
        }
        allObservations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setObservations(allObservations);
        setProductObservations([]); // Clear SRoT state
      }
      setIsOffline(!isFirebaseAvailable());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load observations');
    } finally {
      setLoading(false);
    }
  }

  // Resolve a legacy observation (kept for migration). Note: legacy write paths
  // may be disabled — this branch exists only for the migration window.
  async function handleResolve(obs: Observation) {
    try {
      // If we are using SRoT and the observation represents product-level tags,
      // prefer clearing tags via the product SRoT (deterministic).
      if (useSRoT && obs.productId) {
        await handleResolveProductObservation(obs.productId);
        return;
      }
      // Legacy path (may be deprecated)
      const { resolveObservation: legacyResolve } = await import('../services/observations');
      await legacyResolve(obs.id, obs.productId, user);
      setObservations((prev) =>
        prev.map((o) =>
          o.id === obs.id
            ? { ...o, status: 'resolved', resolvedBy: user, resolvedAt: new Date() }
            : o
        )
      );
    } catch (err) {
      alert('Failed to resolve observation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  // SRoT resolve: clear product observation (deterministic)
  async function handleResolveProductObservation(productId: string) {
    try {
      const resp = await authFetch(`${API_BASE}/api/products/${productId}/observation`, {
        method: 'DELETE',
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.message || `Server error: ${resp.status}`);
      }
      // Reload SRoT observations
      await loadObservations();
    } catch (err) {
      alert('Failed to resolve product observation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }

  async function handleSync() {
    if (!isFirebaseAvailable()) {
      alert('Firestore is not available. Cannot sync.');
      return;
    }

    setSyncing(true);
    try {
      let totalSuccess = 0;
      let totalFailed = 0;

      for (const productId of demoProductIds) {
        const result = await syncLocalToFirestore(productId);
        totalSuccess += result.success;
        totalFailed += result.failed;
      }

      alert(`Sync complete: ${totalSuccess} synced, ${totalFailed} failed`);
      await loadObservations();
    } catch (err) {
      alert('Sync failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  }

  async function handleAddObservation(e: React.FormEvent) {
    e.preventDefault();
    if (!newObservation.title.trim()) {
      alert('Title is required');
      return;
    }

    setIsSubmitting(true);
    try {
      // If SRoT is enabled, create a product.observation entry (deterministic)
      if (useSRoT) {
        // Map legacy fields to tags in a deterministic way:
        // - include the title as a note tag and severity as a tag
        const tags = [
          `note:${newObservation.title}`,
          `severity:${newObservation.severity}`,
        ];
        if (newObservation.description) {
          tags.push(`desc:${newObservation.description.substring(0, 200)}`);
        }
        const resp = await authFetch(`${API_BASE}/api/products/${newObservation.productId}/observation`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add',
            tags,
            images: [],
            source: 'observations-page',
          }),
        });
        if (!resp.ok) {
          const data = await resp.json().catch(() => ({}));
          throw new Error(data.message || `Server error: ${resp.status}`);
        }
      } else {
        // Legacy fallback (kept for migration only)
        const { addObservation: legacyAdd } = await import('../services/observations');
        await legacyAdd({
          productId: newObservation.productId,
          title: newObservation.title,
          body: newObservation.description,
          severity: newObservation.severity,
          createdBy: user,
        });
      }
      
      // Reset form and close modal
      setNewObservation({
        title: '',
        description: '',
        severity: 'medium',
        productId: '123',
      });
      setShowAddModal(false);
      
      // Show success message
      setSuccessMessage('Observation created successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload observations
      await loadObservations();
    } catch (err) {
      alert('Failed to add observation: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  }

  // LP-observations-consolidation-1.4.0: Filter product observations (SRoT)
  const filteredProductObservations = productObservations.filter((obs) => {
    if (tagFilter && !obs.tags.some(tag => 
      tag.toLowerCase().includes(tagFilter.toLowerCase())
    )) return false;
    return true;
  });
  
  // Legacy filter for migration period
  const filteredObservations = observations.filter((obs) => {
    if (filter !== 'all' && obs.status !== filter) return false;
    if (severityFilter !== 'all' && obs.severity !== severityFilter) return false;
    return true;
  });
  
  // Compute display count based on which mode is active
  const displayCount = useSRoT ? filteredProductObservations.length : filteredObservations.length;

  const getSeverityColor = (severity: ObservationSeverity) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getSeverityBadge = (severity: ObservationSeverity) => {
    const color = getSeverityColor(severity);
    return (
      <span style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: color + '20',
        color: color,
      }}>
        {severity.toUpperCase()}
      </span>
    );
  };

  return (
    <PageLayout title="Observations">
      {/* Success Message */}
      {successMessage && (
        <div
          data-testid="success-message"
          style={{
            padding: '12px 16px',
            backgroundColor: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '6px',
            marginBottom: '16px',
            color: '#065f46',
            fontWeight: '500',
          }}
        >
          ✅ {successMessage}
        </div>
      )}
      
      {isOffline && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <strong>⚠️ Offline Mode</strong>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#78716c' }}>
              Observations are saved locally. They will sync when Firestore is available.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing || !isFirebaseAvailable()}
            style={{
              padding: '8px 16px',
              backgroundColor: isFirebaseAvailable() ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isFirebaseAvailable() ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            {syncing ? 'Syncing...' : 'Retry Sync'}
          </button>
        </div>
      )}

      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* LP-observations-consolidation-1.4.0: Show tag filter for SRoT mode */}
        {useSRoT ? (
          <div>
            <label style={{ marginRight: '8px', fontSize: '14px', fontWeight: '500' }}>Search Tags:</label>
            <input
              type="text"
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              placeholder="Filter by tag..."
              data-testid="tag-filter-input"
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-background)',
                minWidth: '180px',
              }}
            />
          </div>
        ) : (
          <>
            <div>
              <label style={{ marginRight: '8px', fontSize: '14px', fontWeight: '500' }}>Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ObservationStatus | 'all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                }}
              >
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            <div>
              <label style={{ marginRight: '8px', fontSize: '14px', fontWeight: '500' }}>Severity:</label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as ObservationSeverity | 'all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                }}
              >
                <option value="all">All</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            {displayCount} product{displayCount !== 1 ? 's' : ''} with observations
          </span>
          
          {/* LP-observations-consolidation-1.3.0: New tags-first Add flow */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowAddFlow(true)}
              data-testid="add-observation-btn"
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Add Observation
            </button>
            
            {/* Legacy dropdown trigger */}
            <button
              onClick={() => setShowLegacyDropdown(!showLegacyDropdown)}
              style={{
                marginLeft: '4px',
                padding: '8px 8px',
                backgroundColor: 'transparent',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              title="More options"
            >
              ▼
            </button>
            
            {showLegacyDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  minWidth: '180px',
                }}
              >
                <button
                  onClick={() => {
                    setShowLegacyDropdown(false);
                    setShowAddModal(true);
                  }}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  📝 Legacy Add Form
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-secondary)' }}>
          Loading observations...
        </div>
      )}

      {error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          color: '#991b1b',
          marginBottom: '16px',
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && displayCount === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: 'var(--color-text-secondary)',
          backgroundColor: 'var(--color-background)',
          borderRadius: '8px',
        }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>👁️ No observations found</p>
          <p style={{ fontSize: '14px' }}>
            {useSRoT && tagFilter
              ? 'No products match your tag filter'
              : filter !== 'all' || severityFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Observations will appear here as products are analyzed'}
          </p>
        </div>
      )}

      {/* LP-observations-consolidation-1.4.0: Render product observations from SRoT */}
      {!loading && !error && useSRoT && filteredProductObservations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredProductObservations.map((obs) => (
            <div
              key={obs.productId}
              data-testid={`product-obs-${obs.productId}`}
              style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/products/${obs.productId}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                      {obs.mpn || obs.productId}
                    </h4>
                    {obs.title && (
                      <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                        {obs.title}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {obs.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#e0e7ff',
                          color: '#3730a3',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  {obs.images.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      📷 {obs.images.length} image{obs.images.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <div>Updated: {new Date(obs.updatedAt).toLocaleDateString()}</div>
                  <div>By: {obs.updatedBy}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legacy observation rendering (kept for migration period) */}
      {!loading && !error && !useSRoT && filteredObservations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredObservations.map((obs) => (
            <div
              key={obs.id}
              style={{
                padding: '16px',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
              onClick={() => navigate(`/products/${obs.productId}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
                      {obs.title}
                    </h4>
                    {getSeverityBadge(obs.severity)}
                    {obs.status === 'resolved' && (
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#22c55e20',
                        color: '#22c55e',
                      }}>
                        ✓ RESOLVED
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: '8px 0',
                    fontSize: '14px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: '1.5',
                  }}>
                    {obs.body}
                  </p>
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                  }}>
                    <span>Product: <strong>{obs.productId}</strong></span>
                    <span>Created: {obs.createdAt.toLocaleDateString()}</span>
                    <span>By: {obs.createdBy.name}</span>
                    {obs.linkedField && <span>Field: <strong>{obs.linkedField}</strong></span>}
                    {obs.resolvedBy && (
                      <span>Resolved by: {obs.resolvedBy.name} on {obs.resolvedAt?.toLocaleDateString()}</span>
                    )}
                  </div>
                  {obs.images && obs.images.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                      {obs.images.slice(0, 3).map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`Observation attachment ${idx + 1}`}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid var(--color-border)',
                          }}
                        />
                      ))}
                      {obs.images.length > 3 && (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'var(--color-background)',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          +{obs.images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {obs.status === 'open' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolve(obs);
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '32px',
        padding: '16px',
        backgroundColor: 'var(--color-background)',
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--color-text-secondary)',
      }}>
        <p style={{ margin: '0 0 8px', fontWeight: '600' }}>📋 Implementation Notes:</p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Observations are loaded from Firestore with localStorage fallback</li>
          <li>Click any observation to view the product details</li>
          <li>Use "Resolve" to mark observations as completed</li>
          <li>In offline mode, use "Retry Sync" to push local observations to Firestore</li>
          <li>Related Notion docs: Workflow W1, Observations Overview, Product Completion Workflows</li>
        </ul>
      </div>

      {/* LP-observations-consolidation-1.3.0: Scan/Manual MPN Flow */}
      {showAddFlow && !resolvedProduct && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddFlow(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <ScanOrManualMPN
              onProductResolved={(product) => {
                setResolvedProduct(product);
              }}
              onCancel={() => setShowAddFlow(false)}
            />
          </div>
        </div>
      )}

      {/* LP-observations-consolidation-1.3.0: Tags-first Add Modal */}
      {resolvedProduct && (
        <ObservationsAddModal
          product={resolvedProduct}
          onSuccess={(tags) => {
            // Show success message
            setSuccessMessage(`Observation added with ${tags.length} tag(s)`);
            setTimeout(() => setSuccessMessage(null), 3000);
            // Reload observations to reflect new data
            loadObservations();
          }}
          onClose={() => {
            setResolvedProduct(null);
            setShowAddFlow(false);
          }}
        />
      )}

      {/* Legacy Add Observation Modal (kept for migration) */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <form
            onSubmit={handleAddObservation}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>
              Add Observation
            </h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={newObservation.title}
                onChange={(e) => setNewObservation(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter observation title"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Description
              </label>
              <textarea
                name="description"
                value={newObservation.description}
                onChange={(e) => setNewObservation(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter observation description"
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
                Severity
              </label>
              <select
                name="severity"
                value={newObservation.severity}
                onChange={(e) => setNewObservation(prev => ({ ...prev, severity: e.target.value as ObservationSeverity }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {isSubmitting ? 'Adding...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
    </PageLayout>
  );
}

export default ObservationsPage;
