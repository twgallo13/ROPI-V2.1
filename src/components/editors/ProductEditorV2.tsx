/**
 * Product Editor V2
 * New sectioned layout using structured Product schema
 * Created: 2025-11-15
 */

import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Product as NewProduct } from '../../types/product-schema';
import type { Product as LegacyProduct } from '../../types';
import { legacyToNew, newToLegacy, mergeIntoLegacy, validateProduct } from '../../utils/schemaAdapter';
import { useVocab } from '../../hooks/useVocab';
import Toast from '../Toast';

interface ProductEditorV2Props {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  onSaved?: (productId: string) => void;
}

type SectionTab = 'basics' | 'attributes' | 'seo' | 'pricing' | 'launch' | 'technical' | 'rics';

const ProductEditorV2: React.FC<ProductEditorV2Props> = ({
  isOpen,
  onClose,
  productId,
  onSaved,
}) => {
  const [activeSection, setActiveSection] = useState<SectionTab>('basics');
  const [product, setProduct] = useState<Partial<NewProduct> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [warningMessages, setWarningMessages] = useState<string[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ 
    show: false, message: '', type: 'success' 
  });

  const vocab = useVocab();

  // Load product
  useEffect(() => {
    if (!isOpen || !productId) {
      setProduct(null);
      return;
    }

    const loadProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const legacyData = { id: docSnap.id, ...docSnap.data() } as Partial<LegacyProduct>;
          const newData = legacyToNew(legacyData);
          setProduct(newData);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        showToast('Error loading product', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [isOpen, productId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Validate product
  useEffect(() => {
    if (product) {
      const all = validateProduct(product);
      const hard: string[] = [];
      const soft: string[] = [];
      for (const msg of all) {
        if (msg.includes('Meta Name') || msg.includes('Meta Description')) soft.push(msg);
        else hard.push(msg);
      }
      setValidationErrors(hard);
      setWarningMessages(soft);
    }
  }, [product]);

  // Update field
  const updateField = useCallback((section: keyof NewProduct, field: string, value: any) => {
    setProduct(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
    });
  }, []);

  // Save product
  const handleSave = async () => {
    if (!product || !productId) return;

    setSaving(true);
    try {
      // Convert new schema to legacy format
      const legacyData = newToLegacy(product as NewProduct);
      
      // Write to Firestore
      const docRef = doc(db, 'products', productId);
      await setDoc(docRef, {
        ...legacyData,
        lastUpdated: serverTimestamp(),
      }, { merge: true });

      showToast('Product saved successfully', 'success');
      if (onSaved) onSaved(productId);
    } catch (error) {
      console.error('Error saving product:', error);
      showToast('Error saving product', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="fixed inset-0 overflow-hidden z-50">
      <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={onClose}></div>
      
      <div className="absolute inset-y-0 right-0 max-w-5xl w-full flex">
        <div className="relative w-full bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {product.sku_core?.name || 'Product Editor'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {product.sku_core?.brand} · {product.sku_core?.mpn}
                <span className="ml-2 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">V2 Editor</span>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || validationErrors.length > 0}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>

          {/* Validation: show hard errors blocking save and soft warnings not blocking */}
          {(validationErrors.length > 0 || warningMessages.length > 0) && (
            <div className="px-6 py-3 bg-yellow-50 border-b border-yellow-200">
              {validationErrors.length > 0 && (
                <>
                  <p className="text-sm font-medium text-yellow-800">⚠️ Required fields missing:</p>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {validationErrors.map((error, i) => (
                      <li key={`hard-${i}`}>{error}</li>
                    ))}
                  </ul>
                </>
              )}
              {warningMessages.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-yellow-800">ℹ️ Recommended for SEO (won't block save):</p>
                  <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                    {warningMessages.map((w, i) => (
                      <li key={`soft-${i}`}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Section Tabs */}
          <div className="px-6 py-3 bg-white border-b border-gray-200 overflow-x-auto">
            <nav className="flex space-x-4">
              {[
                { id: 'basics', label: 'Basics' },
                { id: 'attributes', label: 'Attributes' },
                { id: 'seo', label: 'SEO' },
                { id: 'pricing', label: 'Pricing' },
                { id: 'launch', label: 'Launch' },
                { id: 'technical', label: 'Technical' },
                { id: 'rics', label: 'RICS Data' },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as SectionTab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                    activeSection === section.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {activeSection === 'basics' && (
              <BasicsSection product={product} updateField={updateField} vocab={vocab} />
            )}
            {activeSection === 'attributes' && (
              <AttributesSection product={product} updateField={updateField} vocab={vocab} />
            )}
            {activeSection === 'seo' && (
              <SEOSection product={product} updateField={updateField} />
            )}
            {activeSection === 'pricing' && (
              <PricingSection product={product} updateField={updateField} />
            )}
            {activeSection === 'launch' && (
              <LaunchSection product={product} updateField={updateField} />
            )}
            {activeSection === 'technical' && (
              <TechnicalSection product={product} updateField={updateField} vocab={vocab} />
            )}
            {activeSection === 'rics' && (
              <RICSSection product={product} />
            )}
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}
    </div>
  );
};

// Section Components
const FormField: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ 
  label, required, children 
}) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const BasicsSection: React.FC<any> = ({ product, updateField, vocab }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
    
    <div className="grid grid-cols-2 gap-4">
      <FormField label="MPN" required>
        <input
          type="text"
          value={product.sku_core?.mpn || ''}
          onChange={(e) => updateField('sku_core', 'mpn', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="Brand" required>
        <input
          type="text"
          value={product.sku_core?.brand || ''}
          onChange={(e) => updateField('sku_core', 'brand', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="Name" required>
        <input
          type="text"
          value={product.sku_core?.name || ''}
          onChange={(e) => updateField('sku_core', 'name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md col-span-2"
        />
      </FormField>

      <FormField label="Department" required>
        <select
          value={product.sku_core?.department || ''}
          onChange={(e) => updateField('sku_core', 'department', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.departments.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Class" required>
        <select
          value={product.sku_core?.class || ''}
          onChange={(e) => updateField('sku_core', 'class', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.classes.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Category" required>
        <select
          value={product.sku_core?.category || ''}
          onChange={(e) => updateField('sku_core', 'category', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.categories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Style ID">
        <input
          type="text"
          value={product.sku_core?.styleId || ''}
          onChange={(e) => updateField('sku_core', 'styleId', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="Links related colorways"
        />
      </FormField>
    </div>

    <div className="flex items-center gap-4 pt-4 border-t">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={product.sku_core?.productIsActive ?? true}
          onChange={(e) => updateField('sku_core', 'productIsActive', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-900">Product Active</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={product.sku_core?.coreProduct ?? false}
          onChange={(e) => updateField('sku_core', 'coreProduct', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-900">Core Product</span>
      </label>
    </div>
  </div>
);

const AttributesSection: React.FC<any> = ({ product, updateField, vocab }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Attributes</h3>
    
    <div className="grid grid-cols-2 gap-4">
      <FormField label="Age Group" required>
        <select
          value={product.descriptive?.ageGroup || ''}
          onChange={(e) => updateField('descriptive', 'ageGroup', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.ageGroups.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Gender" required>
        <select
          value={product.descriptive?.gender || ''}
          onChange={(e) => updateField('descriptive', 'gender', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.genders.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Fit">
        <select
          value={product.descriptive?.fit || ''}
          onChange={(e) => updateField('descriptive', 'fit', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.fits.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Primary Color">
        <select
          value={product.descriptive?.primaryColor || ''}
          onChange={(e) => updateField('descriptive', 'primaryColor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.primaryColors.map((c: any) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Descriptive Color">
        <input
          type="text"
          value={product.descriptive?.descriptiveColor || ''}
          onChange={(e) => updateField('descriptive', 'descriptiveColor', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>
      <FormField label="Materials (Multi-Select)">
        <select
          multiple
          value={product.descriptive?.material || []}
          onChange={(e) => {
            const select = e.target as HTMLSelectElement;
            const selected = Array.from(select.selectedOptions).map(o => (o as HTMLOptionElement).value);
            updateField('descriptive', 'material', selected);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md h-28"
        >
          {vocab.materials.map((m: any) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Sports Team">
        <select
          value={product.descriptive?.sportsTeam || ''}
          onChange={(e) => updateField('descriptive', 'sportsTeam', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.sportsTeams.map((t: any) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="League">
        <select
          value={product.descriptive?.league || ''}
          onChange={(e) => updateField('descriptive', 'league', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.leagues.map((l: any) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Cut Type">
        <select
          value={product.descriptive?.cutType || ''}
          onChange={(e) => updateField('descriptive', 'cutType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.cutTypes.map((c: any) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Closure Type">
        <select
          value={product.descriptive?.closureType || ''}
          onChange={(e) => updateField('descriptive', 'closureType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.closureTypes.map((c: any) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Platform Height">
        <select
          value={product.descriptive?.platformHeight || ''}
          onChange={(e) => updateField('descriptive', 'platformHeight', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.platformHeights.map((ph: any) => (
            <option key={ph.value} value={ph.value}>{ph.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Heel Type">
        <select
          value={product.descriptive?.heelType || ''}
          onChange={(e) => updateField('descriptive', 'heelType', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.heelTypes.map((ht: any) => (
            <option key={ht.value} value={ht.value}>{ht.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Shoe Height Map">
        <select
          value={product.descriptive?.shoeHeightMap || ''}
          onChange={(e) => updateField('descriptive', 'shoeHeightMap', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Select...</option>
          {vocab.shoeHeightMaps.map((m: any) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Made In (Multi-Select)">
        <select
          multiple
          value={product.descriptive?.madeIn || []}
          onChange={(e) => {
            const select = e.target as HTMLSelectElement;
            const selected = Array.from(select.selectedOptions).map(o => (o as HTMLOptionElement).value);
            updateField('descriptive', 'madeIn', selected);
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md h-28"
        >
          {['China', 'Vietnam', 'Indonesia', 'Thailand', 'India', 'Bangladesh', 'Cambodia', 'USA', 'Mexico', 'Italy', 'Portugal', 'Spain', 'Turkey', 'Other'].map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </FormField>

    </div>

    <div className="pt-4">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={product.descriptive?.familySizing ?? false}
          onChange={(e) => updateField('descriptive', 'familySizing', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-900">Family Sizing Available</span>
      </label>
    </div>
  </div>
);

const SEOSection: React.FC<any> = ({ product, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">SEO & Metadata</h3>
    
    <FormField label="Meta Name (SEO Title)" required>
      <input
        type="text"
        value={product.descriptive?.metaName || ''}
        onChange={(e) => updateField('descriptive', 'metaName', e.target.value)}
        maxLength={60}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <p className="text-xs text-gray-500 mt-1">
        {(product.descriptive?.metaName || '').length}/60 characters
      </p>
    </FormField>

    <FormField label="Meta Description" required>
      <textarea
        value={product.descriptive?.metaDescription || ''}
        onChange={(e) => updateField('descriptive', 'metaDescription', e.target.value)}
        maxLength={155}
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
      <p className="text-xs text-gray-500 mt-1">
        {(product.descriptive?.metaDescription || '').length}/155 characters
      </p>
    </FormField>

    <FormField label="URL Slug">
      <input
        type="text"
        value={product.descriptive?.slug || ''}
        onChange={(e) => updateField('descriptive', 'slug', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder="auto-generated-from-name"
      />
    </FormField>
  </div>
);

const PricingSection: React.FC<any> = ({ product, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
    
    <div className="grid grid-cols-2 gap-4">
      <FormField label="MAP Price">
        <input
          type="number"
          value={product.pricing?.map || ''}
          onChange={(e) => updateField('pricing', 'map', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="SCOM Regular Price">
        <input
          type="number"
          value={product.pricing?.scomRegularPrice || ''}
          onChange={(e) => updateField('pricing', 'scomRegularPrice', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="SCOM Sale Price">
        <input
          type="number"
          value={product.pricing?.scomSalePrice || ''}
          onChange={(e) => updateField('pricing', 'scomSalePrice', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>
    </div>

    <div className="pt-4">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={product.pricing?.promo ?? false}
          onChange={(e) => updateField('pricing', 'promo', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-900">Promotional Product</span>
      </label>
    </div>
  </div>
);

const LaunchSection: React.FC<any> = ({ product, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Launch & Marketing</h3>
    
    <FormField label="Launch Date">
      <input
        type="date"
        value={product.launch?.launchDate?.split('T')[0] || ''}
        onChange={(e) => updateField('launch', 'launchDate', e.target.value || undefined)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
    </FormField>

    <FormField label="KL Post Date">
      <input
        type="date"
        value={product.launch?.klPostDate?.split('T')[0] || ''}
        onChange={(e) => updateField('launch', 'klPostDate', e.target.value || undefined)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      />
    </FormField>

    <div className="grid grid-cols-3 gap-4 pt-4">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={product.launch?.hype ?? false}
          onChange={(e) => updateField('launch', 'hype', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-900">HYPE</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={product.launch?.fastFashion ?? false}
          onChange={(e) => updateField('launch', 'fastFashion', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="ml-2 text-sm text-gray-900">Fast Fashion</span>
      </label>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">New Collection</span>
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            className={`px-3 py-1 text-sm border ${product.launch?.newCollection ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
            onClick={() => updateField('launch', 'newCollection', true)}
          >Yes</button>
          <button
            type="button"
            className={`px-3 py-1 text-sm border -ml-px ${!product.launch?.newCollection ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
            onClick={() => updateField('launch', 'newCollection', false)}
          >No</button>
        </div>
      </div>
    </div>
  </div>
);

const TechnicalSection: React.FC<any> = ({ product, updateField, vocab }) => {
  const mediaStatus = product.technical?.hideImageDate ? 'Images Ready' : 'Pending';
  return (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical & Shipping</h3>

    <FormField label="Websites (Multi-Select)">
      <select
        multiple
        value={product.technical?.website || []}
        onChange={(e) => {
          const select = e.target as HTMLSelectElement;
          const selected = Array.from(select.selectedOptions).map(o => (o as HTMLOptionElement).value);
          updateField('technical', 'website', selected);
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md h-28"
      >
        {vocab.websites.map((w: any) => (
          <option key={w.value} value={w.value}>{w.label}</option>
        ))}
      </select>
    </FormField>

    <div className="grid grid-cols-4 gap-4">
      <FormField label="Height">
        <input
          type="number"
          value={product.technical?.height || ''}
          onChange={(e) => updateField('technical', 'height', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="Width">
        <input
          type="number"
          value={product.technical?.width || ''}
          onChange={(e) => updateField('technical', 'width', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="Length">
        <input
          type="number"
          value={product.technical?.length || ''}
          onChange={(e) => updateField('technical', 'length', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>

      <FormField label="Weight">
        <input
          type="number"
          value={product.technical?.weight || ''}
          onChange={(e) => updateField('technical', 'weight', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>
    </div>

    <FormField label="Tax Class">
      <select
        value={product.technical?.taxClass || ''}
        onChange={(e) => updateField('technical', 'taxClass', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
      >
        <option value="">Select...</option>
        {vocab.taxClasses.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </FormField>

    <div className="grid grid-cols-3 gap-4">
      <FormField label="Standard Shipping Override">
        <input
          type="number"
          value={product.technical?.standardShippingOverride || ''}
          onChange={(e) => updateField('technical', 'standardShippingOverride', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="0.00"
        />
      </FormField>
      <FormField label="Expedited Shipping Override">
        <input
          type="number"
          value={product.technical?.expeditedOverrideShipping || ''}
          onChange={(e) => updateField('technical', 'expeditedOverrideShipping', parseFloat(e.target.value) || undefined)}
          step="0.01"
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          placeholder="0.00"
        />
      </FormField>
      <FormField label="Hide Image Date">
        <input
          type="date"
          value={product.technical?.hideImageDate?.split('T')[0] || ''}
          onChange={(e) => updateField('technical', 'hideImageDate', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </FormField>
    </div>

    <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-2">Media Status</h4>
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          product.technical?.hideImageDate 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {mediaStatus}
        </span>
      </div>
    </div>

    <details className="p-4 bg-white rounded-md border border-gray-200">
      <summary className="cursor-pointer text-sm font-medium text-gray-700">Inventory (optional)</summary>
      <div className="mt-3 grid grid-cols-3 gap-4">
        <FormField label="Last Received">
          <input
            type="date"
            value={product.technical?.lastReceived?.split('T')[0] || ''}
            onChange={(e) => updateField('technical', 'lastReceived', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </FormField>
        <FormField label="First Received">
          <input
            type="date"
            value={product.technical?.firstReceived?.split('T')[0] || ''}
            onChange={(e) => updateField('technical', 'firstReceived', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </FormField>
        <div></div>

        {[
          ['Store 1', 'store1'],
          ['Store Inv', 'storeInv'],
          ['Warehouse Inv', 'warehouseInv'],
          ['WHS Inv', 'whsInv'],
          ['Store 4', 'store4'],
          ['Total Inv', 'totalInv'],
        ].map(([label, key]: any) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
              {product.technical?.[key] ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </details>
  </div>
  );
};

const RICSSection: React.FC<any> = ({ product }) => (
  <div className="space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
      <p className="text-sm text-blue-800">
        <strong>ℹ️ Read-Only:</strong> RICS data is imported from the RICS system and cannot be edited here.
      </p>
    </div>

    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RICS Brand</label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
          {product.source?.rics?.brand || '—'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RICS Category</label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
          {product.source?.rics?.category || '—'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RICS Short Description</label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
          {product.source?.rics?.shortDescription || '—'}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">RICS Long Description</label>
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 max-h-40 overflow-y-auto">
          {product.source?.rics?.longDescription || '—'}
        </div>
      </div>
    </div>
  </div>
);

export default ProductEditorV2;
