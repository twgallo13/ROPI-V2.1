/**
 * PDP Section Renderer Component
 * 
 * Groups and renders consumer-facing product attributes by pdp_section.
 * Follows the unified attribute mapping CSV for section assignments.
 * 
 * Sections: Hero, Visuals, Highlights, Details, Specs
 * 
 * PVS-0.1.9
 */

import { useMemo } from 'react';
import './PdpSectionRenderer.css';

// PDP Section configuration
const PDP_SECTIONS = [
  { id: 'hero', label: 'Product Information', priority: 1 },
  { id: 'Overview', label: 'Overview', priority: 2 },
  { id: 'Visuals', label: 'Colors & Visuals', priority: 3 },
  { id: 'Details', label: 'Details', priority: 4 },
  { id: 'Materials', label: 'Materials & Construction', priority: 5 },
  { id: 'Measurements', label: 'Measurements', priority: 6 },
  { id: 'Pricing', label: 'Pricing', priority: 7 },
  { id: 'Lifecycle', label: 'Availability', priority: 8 },
];

// Category -> PDP section mapping (from generator script)
const CATEGORY_TO_SECTION: Record<string, string> = {
  'sku_core': 'Overview',
  'classification': 'Details',
  'lifecycle': 'Lifecycle',
  'measurements': 'Measurements',
  'dimensions': 'Measurements',
  'identity_demographic': 'Details',
  'color': 'Visuals',
  'materials_construction': 'Materials',
  'materials': 'Materials',
  'price': 'Pricing',
  'shipping': 'Measurements',
  'images': 'Visuals',
  'identifiers': 'Overview',
  'content': 'Details',
};

// Attributes that are NOT consumer-facing (internal only)
const INTERNAL_ATTRIBUTES = new Set([
  'product_is_active',
  'status',
  'kl_post_date',
  'family_sizing',
  'vendor',
  'warehouse',
  'location',
  'quantity',
  'cost',
  'first_received',
  'last_received',
  'variant_group_id',
  'has_variants',
]);

// Hero section attributes (special handling)
const HERO_ATTRIBUTES = ['name', 'brand', 'msrp', 'retail_price', 'primary_color'];

// Attribute display formatters
const FORMATTERS: Record<string, (value: any, product?: any) => React.ReactNode> = {
  primary_color: (value, product) => {
    const hex = product?.attributes?.primary_color_hex || product?.primary_color_hex;
    return (
      <span className="color-display">
        {hex && <span className="color-chip" style={{ backgroundColor: hex }} />}
        <span className="color-name">{value}</span>
      </span>
    );
  },
  
  msrp: (value) => formatCurrency(value),
  retail_price: (value) => formatCurrency(value),
  sale_price: (value) => formatCurrency(value),
  cost: (value) => formatCurrency(value),
  
  features: (value) => {
    if (!value) return null;
    const items = Array.isArray(value) ? value : String(value).split('|').map(s => s.trim());
    return (
      <ul className="feature-list">
        {items.filter(Boolean).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  },
  
  material: (value) => {
    if (Array.isArray(value)) {
      return (
        <span className="tag-list">
          {value.map((m, i) => (
            <span key={i} className="tag">{m}</span>
          ))}
        </span>
      );
    }
    return value;
  },
  
  website: (value) => {
    if (Array.isArray(value)) {
      return value.filter(w => w !== 'NOT FOR WEB').join(', ');
    }
    return value;
  },
  
  launch_date: (value) => formatDate(value),
  
  weight: (value) => value ? `${value} oz` : null,
  height: (value) => value ? `${value}"` : null,
  width: (value) => value ? `${value}"` : null,
  length: (value) => value ? `${value}"` : null,
};

function formatCurrency(value: any): string | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
}

function formatDate(value: any): string | null {
  if (!value) return null;
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value);
  }
}

// Human-readable labels for attribute IDs
const ATTRIBUTE_LABELS: Record<string, string> = {
  sku: 'SKU',
  style_id: 'Style ID',
  mpn: 'MPN',
  gtin: 'GTIN/UPC',
  name: 'Product Name',
  slug: 'URL',
  brand: 'Brand',
  category: 'Category',
  class: 'Class',
  department: 'Department',
  gender: 'Gender',
  age_group: 'Age Group',
  primary_color: 'Color',
  descriptive_color: 'Color Description',
  material: 'Material',
  composition: 'Composition',
  closure_type: 'Closure',
  shoe_upper: 'Upper Material',
  shoe_lining: 'Lining',
  shoe_outsole: 'Outsole',
  heel_height: 'Heel Height',
  description: 'Description',
  features: 'Features',
  msrp: 'Price',
  retail_price: 'Retail Price',
  sale_price: 'Sale Price',
  shoe_width: 'Width',
  size: 'Size',
  fit: 'Fit',
  country_of_origin: 'Made In',
  weight: 'Weight',
  height: 'Height',
  width: 'Width',
  length: 'Length',
  launch_date: 'Available',
  website: 'Available On',
};

interface ProductAttributes {
  [key: string]: any;
}

interface Product {
  id?: string;
  sku?: string;
  attributes?: ProductAttributes;
  [key: string]: any;
}

interface PdpSectionRendererProps {
  product: Product;
  showInternalAttributes?: boolean;
  className?: string;
}

export function PdpSectionRenderer({ 
  product, 
  showInternalAttributes = false,
  className = ''
}: PdpSectionRendererProps) {
  // Merge top-level product fields with attributes
  const allAttributes = useMemo(() => {
    const merged: ProductAttributes = { ...product };
    if (product.attributes) {
      Object.assign(merged, product.attributes);
    }
    return merged;
  }, [product]);
  
  // Group attributes by section
  const sections = useMemo(() => {
    const grouped: Record<string, Array<{ id: string; label: string; value: any }>> = {};
    
    // Initialize sections
    PDP_SECTIONS.forEach(s => {
      grouped[s.id] = [];
    });
    
    // Process each attribute
    Object.entries(allAttributes).forEach(([key, value]) => {
      // Skip if no value
      if (value === null || value === undefined || value === '') return;
      
      // Skip internal attributes unless requested
      if (!showInternalAttributes && INTERNAL_ATTRIBUTES.has(key)) return;
      
      // Skip non-attribute fields
      if (['id', 'attributes', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'].includes(key)) return;
      
      // Determine section
      let section = 'Details';
      
      if (HERO_ATTRIBUTES.includes(key)) {
        section = 'hero';
      } else {
        // Look up section from category mapping
        // This would ideally come from the unified mapping JSON
        const attrCategory = getAttributeCategory(key);
        if (attrCategory && CATEGORY_TO_SECTION[attrCategory]) {
          section = CATEGORY_TO_SECTION[attrCategory];
        }
      }
      
      grouped[section]?.push({
        id: key,
        label: ATTRIBUTE_LABELS[key] || formatLabel(key),
        value
      });
    });
    
    // Filter empty sections and sort
    return PDP_SECTIONS
      .map(s => ({
        ...s,
        attributes: grouped[s.id] || []
      }))
      .filter(s => s.attributes.length > 0);
  }, [allAttributes, showInternalAttributes]);
  
  // Conditional display rules
  const shouldShowSize = useMemo(() => {
    return allAttributes.has_variants === true || 
           allAttributes.size !== undefined ||
           (allAttributes.attributes?.size !== undefined);
  }, [allAttributes]);
  
  const renderValue = (attrId: string, value: any) => {
    // Use custom formatter if available
    if (FORMATTERS[attrId]) {
      return FORMATTERS[attrId](value, product);
    }
    
    // Handle arrays
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Handle objects
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    
    return String(value);
  };
  
  return (
    <div className={`pdp-sections ${className}`}>
      {sections.map(section => (
        <section key={section.id} className={`pdp-section pdp-section-${section.id}`}>
          {section.id !== 'hero' && (
            <h3 className="section-title">{section.label}</h3>
          )}
          
          <div className={`section-content ${section.id === 'hero' ? 'hero-layout' : 'grid-layout'}`}>
            {section.attributes.map(attr => {
              // Skip size if conditionally hidden
              if (attr.id === 'size' && !shouldShowSize) return null;
              
              return (
                <div key={attr.id} className={`attribute-row attr-${attr.id}`}>
                  {section.id !== 'hero' && (
                    <span className="attr-label">{attr.label}</span>
                  )}
                  <span className="attr-value">
                    {renderValue(attr.id, attr.value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// Helper to get attribute category (simplified - would come from registry)
function getAttributeCategory(attrId: string): string | undefined {
  const categoryMap: Record<string, string> = {
    sku: 'sku_core',
    style_id: 'sku_core',
    mpn: 'sku_core',
    gtin: 'identifiers',
    name: 'sku_core',
    brand: 'sku_core',
    category: 'classification',
    class: 'classification',
    department: 'classification',
    gender: 'identity_demographic',
    age_group: 'identity_demographic',
    primary_color: 'color',
    descriptive_color: 'color',
    primary_color_hex: 'color',
    material: 'materials',
    composition: 'materials',
    closure_type: 'materials',
    shoe_upper: 'materials',
    shoe_lining: 'materials',
    shoe_outsole: 'materials',
    description: 'content',
    features: 'content',
    msrp: 'price',
    retail_price: 'price',
    sale_price: 'price',
    cost: 'price',
    height: 'measurements',
    width: 'measurements',
    length: 'measurements',
    weight: 'measurements',
    shoe_width: 'measurements',
    launch_date: 'lifecycle',
    website: 'sku_core',
  };
  
  return categoryMap[attrId];
}

// Format attribute ID to human label
function formatLabel(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default PdpSectionRenderer;
