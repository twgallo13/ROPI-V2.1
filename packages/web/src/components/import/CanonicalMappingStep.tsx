/**
 * Canonical Import Mapping Step Component
 * Enhanced Step 2: Map CSV headers to canonical attribute IDs
 * Uses canonicalAttributeMap.json for alias resolution
 * 
 * PVS-0.1.9
 */

import { useState, useEffect, useMemo } from 'react';
import './ImportMappingStep.css';

// Types for canonical mapping
type MappingConfidence = 'high' | 'medium' | 'low';

interface HeaderMapping {
  originalHeader: string;
  canonicalId: string | null;
  confidence: MappingConfidence;
  matchType: 'alias' | 'exact' | 'normalized' | 'unknown';
}

interface CanonicalMappingStepProps {
  headers: string[];
  onMappingComplete: (mappings: Record<string, string | null>) => void;
  onBack: () => void;
}

// Load canonical map and registry data (would come from API in production)
// For now, we'll use a client-side implementation
function toSnakeCase(s: string): string {
  if (!s) return '';
  return s
    .replace(/\./g, '_')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9_-]/g, '_')
    .replace(/__+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
}

// Inline canonical map for common aliases (subset - full map loaded from API)
const CANONICAL_ALIASES: Record<string, string> = {
  'sku': 'sku',
  'SKU': 'sku',
  'style_id': 'style_id',
  'styleId': 'style_id',
  'mpn': 'mpn',
  'MPN': 'mpn',
  'name': 'name',
  'Name': 'name',
  'Product Name': 'name',
  'brand': 'brand',
  'Brand': 'brand',
  'category': 'category',
  'Category': 'category',
  'department': 'department',
  'Department': 'department',
  'gender': 'gender',
  'Gender': 'gender',
  'age_group': 'age_group',
  'Age Group': 'age_group',
  'ageGroup': 'age_group',
  'primary_color': 'primary_color',
  'Primary Color': 'primary_color',
  'Color': 'primary_color',
  'color': 'primary_color',
  'material': 'material',
  'Material': 'material',
  'description': 'description',
  'Description': 'description',
  'msrp': 'msrp',
  'MSRP': 'msrp',
  'cost': 'cost',
  'Cost': 'cost',
};

// Known canonical attribute IDs
const CANONICAL_ATTRIBUTES = new Set([
  'sku', 'style_id', 'mpn', 'gtin', 'name', 'slug', 'brand',
  'category', 'class', 'department', 'website', 'product_is_active', 'status',
  'launch_date', 'kl_post_date', 'family_sizing', 'hype', 'first_received', 'last_received',
  'height', 'length', 'width', 'shoe_width', 'weight',
  'gender', 'age_group', 'primary_color', 'descriptive_color', 'material',
  'composition', 'closure_type', 'shoe_upper', 'shoe_lining', 'shoe_outsole', 'heel_height',
  'description', 'features', 'bullet_1', 'bullet_2', 'bullet_3', 'bullet_4', 'bullet_5',
  'cost', 'msrp', 'retail_price', 'sale_price', 'markdown_price', 'currency',
  'country_of_origin', 'vendor', 'size', 'size_chart', 'fit',
  'has_variants', 'variant_group_id', 'quantity', 'warehouse', 'location'
]);

// Required for import
const REQUIRED_FOR_IMPORT = new Set(['sku', 'category', 'department', 'gender', 'primary_color', 'material']);

function normalizeHeader(header: string): HeaderMapping {
  const originalHeader = header.trim();
  
  // 1. Check direct alias mapping (high confidence)
  if (CANONICAL_ALIASES[originalHeader]) {
    return {
      originalHeader,
      canonicalId: CANONICAL_ALIASES[originalHeader],
      confidence: 'high',
      matchType: 'alias'
    };
  }
  
  // 2. Check if header is already a canonical ID (high confidence)
  if (CANONICAL_ATTRIBUTES.has(originalHeader)) {
    return {
      originalHeader,
      canonicalId: originalHeader,
      confidence: 'high',
      matchType: 'exact'
    };
  }
  
  // 3. Try snake_case normalization (medium confidence)
  const normalized = toSnakeCase(originalHeader);
  
  if (CANONICAL_ALIASES[normalized]) {
    return {
      originalHeader,
      canonicalId: CANONICAL_ALIASES[normalized],
      confidence: 'medium',
      matchType: 'normalized'
    };
  }
  
  if (CANONICAL_ATTRIBUTES.has(normalized)) {
    return {
      originalHeader,
      canonicalId: normalized,
      confidence: 'medium',
      matchType: 'normalized'
    };
  }
  
  // 4. No match found (low confidence / unknown)
  return {
    originalHeader,
    canonicalId: null,
    confidence: 'low',
    matchType: 'unknown'
  };
}

export function CanonicalMappingStep({ headers, onMappingComplete, onBack }: CanonicalMappingStepProps) {
  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [approvedUnknown, setApprovedUnknown] = useState<Set<string>>(new Set());
  
  // Auto-detect mappings on mount
  const suggestedMappings = useMemo(() => {
    const result: Record<string, HeaderMapping> = {};
    headers.forEach(header => {
      result[header] = normalizeHeader(header);
    });
    return result;
  }, [headers]);
  
  // Initialize mappings from suggestions
  useEffect(() => {
    const initial: Record<string, string | null> = {};
    headers.forEach(header => {
      initial[header] = suggestedMappings[header]?.canonicalId || null;
    });
    setMappings(initial);
  }, [headers, suggestedMappings]);
  
  // Calculate stats
  const stats = useMemo(() => {
    const entries = Object.entries(mappings);
    const high = entries.filter(([h]) => suggestedMappings[h]?.confidence === 'high').length;
    const medium = entries.filter(([h]) => suggestedMappings[h]?.confidence === 'medium').length;
    const unknown = entries.filter(([h]) => !mappings[h]).length;
    
    const missingRequired = Array.from(REQUIRED_FOR_IMPORT).filter(
      req => !Object.values(mappings).includes(req)
    );
    
    const unapprovedUnknown = headers.filter(
      h => !mappings[h] && !approvedUnknown.has(h)
    );
    
    return {
      total: entries.length,
      high,
      medium,
      unknown,
      missingRequired,
      unapprovedUnknown
    };
  }, [mappings, approvedUnknown, headers, suggestedMappings]);
  
  const handleMappingChange = (header: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [header]: value || null
    }));
  };
  
  const handleApproveUnknown = (header: string) => {
    setApprovedUnknown(prev => new Set([...prev, header]));
  };
  
  const handleContinue = () => {
    if (stats.missingRequired.length > 0) {
      alert(`Missing required fields: ${stats.missingRequired.join(', ')}`);
      return;
    }
    
    if (stats.unapprovedUnknown.length > 0) {
      const confirm = window.confirm(
        `There are ${stats.unapprovedUnknown.length} unmapped columns. Continue anyway?`
      );
      if (!confirm) return;
    }
    
    onMappingComplete(mappings);
  };
  
  const getConfidenceBadge = (mapping: HeaderMapping) => {
    const colors: Record<MappingConfidence, string> = {
      high: '#22c55e',
      medium: '#eab308',
      low: '#ef4444'
    };
    
    return (
      <span
        className="confidence-badge"
        style={{
          backgroundColor: colors[mapping.confidence],
          color: mapping.confidence === 'medium' ? '#000' : '#fff',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px'
        }}
      >
        {mapping.confidence.toUpperCase()}
      </span>
    );
  };
  
  // Build dropdown options
  const fieldOptions = useMemo(() => {
    const mapped = new Set(Object.values(mappings).filter(Boolean));
    return [
      { value: '', label: '(Unmapped)' },
      ...Array.from(CANONICAL_ATTRIBUTES).sort().map(id => ({
        value: id,
        label: id,
        disabled: mapped.has(id) && !Object.entries(mappings).find(([_, v]) => v === id)
      }))
    ];
  }, [mappings]);
  
  return (
    <div className="import-mapping-step">
      <h2>Map CSV Columns to Canonical Attributes</h2>
      <p className="step-description">
        Auto-detected mappings shown below. Review and adjust as needed.
        <strong> Low-confidence (unknown) mappings require approval.</strong>
      </p>
      
      {stats.missingRequired.length > 0 && (
        <div className="mapping-warning" style={{ backgroundColor: '#fef2f2', border: '1px solid #ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠️ <strong>Missing required fields:</strong> {stats.missingRequired.join(', ')}
        </div>
      )}
      
      <div className="mapping-table-wrapper">
        <table className="mapping-table">
          <thead>
            <tr>
              <th>CSV Column</th>
              <th>Confidence</th>
              <th>Canonical Attribute</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {headers.map(header => {
              const suggestion = suggestedMappings[header];
              const currentMapping = mappings[header];
              const isUnknown = !currentMapping;
              const needsApproval = isUnknown && !approvedUnknown.has(header);
              
              return (
                <tr key={header} style={{ backgroundColor: needsApproval ? '#fef9c3' : undefined }}>
                  <td className="csv-column">
                    <code>{header}</code>
                    {suggestion.matchType !== 'unknown' && (
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        Match: {suggestion.matchType}
                      </div>
                    )}
                  </td>
                  <td>
                    {getConfidenceBadge(suggestion)}
                  </td>
                  <td className="target-field">
                    <select
                      value={currentMapping || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="field-select"
                      style={{ width: '100%', padding: '6px' }}
                    >
                      {fieldOptions.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                          {opt.label}
                          {REQUIRED_FOR_IMPORT.has(opt.value) && ' (required)'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {needsApproval && (
                      <button
                        className="btn-small"
                        onClick={() => handleApproveUnknown(header)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '12px',
                          backgroundColor: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Skip this column
                      </button>
                    )}
                    {approvedUnknown.has(header) && (
                      <span style={{ color: '#666', fontSize: '12px' }}>✓ Skipped</span>
                    )}
                    {currentMapping && REQUIRED_FOR_IMPORT.has(currentMapping) && (
                      <span style={{ color: '#22c55e', fontSize: '12px' }}>✓ Required</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      <div className="mapping-summary" style={{ display: 'flex', gap: '24px', margin: '16px 0', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
        <div className="summary-item">
          <strong>Total:</strong> {stats.total}
        </div>
        <div className="summary-item">
          <strong>High Confidence:</strong> <span style={{ color: '#22c55e' }}>{stats.high}</span>
        </div>
        <div className="summary-item">
          <strong>Medium:</strong> <span style={{ color: '#eab308' }}>{stats.medium}</span>
        </div>
        <div className="summary-item">
          <strong>Unknown:</strong> <span style={{ color: '#ef4444' }}>{stats.unknown}</span>
        </div>
        <div className="summary-item">
          <strong>Needs Approval:</strong>{' '}
          <span style={{ color: stats.unapprovedUnknown.length > 0 ? '#ef4444' : '#22c55e' }}>
            {stats.unapprovedUnknown.length}
          </span>
        </div>
      </div>
      
      <div className="mapping-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Upload
        </button>
        <button
          className="btn-primary"
          onClick={handleContinue}
          disabled={stats.missingRequired.length > 0}
          style={{
            padding: '10px 20px',
            backgroundColor: stats.missingRequired.length > 0 ? '#94a3b8' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: stats.missingRequired.length > 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Continue to Preview →
        </button>
      </div>
    </div>
  );
}

export default CanonicalMappingStep;
