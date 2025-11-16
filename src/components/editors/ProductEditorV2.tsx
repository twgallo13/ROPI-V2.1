/**
 * Product Editor V2
 * New sectioned layout using structured Product schema
 * Created: 2025-11-15
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Product as NewProduct } from '../../types/product-schema';
import type { Product as LegacyProduct, ProductFacts } from '../../types';
import { legacyToNew, newToLegacy, mergeIntoLegacy, validateProduct, stripUndefined } from '../../utils/schemaAdapter';
import { useVocab, VocabData } from '../../hooks/useVocab';
import { useAuth } from '../../contexts/AuthContext';
import { describeProduct, DescribeProductPayload } from '../../services/describe';
import type { AIScores, AICoach, AISEO, DescribeProductResponse } from '../../services/describe';
import Toast from '../Toast';
import AIWorkflowPanel from '../ProductEditorV2/AIWorkflowPanel';

interface ProductEditorV2Props {
  isOpen: boolean;
  onClose: () => void;
  productId: string | null;
  onSaved?: (productId: string) => void;
}

type SectionTab = 'basics' | 'attributes' | 'seo' | 'pricing' | 'launch' | 'technical' | 'rics' | 'ai';

type AIDescription = {
  text: string;
  scores?: { overall?: number; factual?: number; tone?: number; seo?: number; clarity?: number };
  coach?: { reasons?: string[]; actions?: string[]; next_questions?: string[] };
  seo?: { meta_title?: string; meta_description?: string; meta_keywords?: string[] };
  facts_used?: string[];
  meta?: {
    tone?: string;
    length?: string;
    temperature?: number;
    generatedAt?: any;
    updatedAt?: any;
    title?: string;
    description?: string;
    keywords?: string[];
  };
};

// Helper to build vocabulary normalization map
function buildVocabMap(vocab: VocabData): Record<string, string> {
  const map: Record<string, string> = {};
  
  const addOptions = (options: Array<{ value: string; label: string }>) => {
    options.forEach(opt => {
      if (opt.value !== opt.label) {
        map[opt.value] = opt.label;
      }
    });
  };
  
  addOptions(vocab.genders);
  addOptions(vocab.ageGroups);
  addOptions(vocab.fits);
  addOptions(vocab.materials);
  addOptions(vocab.primaryColors);
  addOptions(vocab.descriptiveColors);
  addOptions(vocab.cutTypes);
  addOptions(vocab.closureTypes);
  addOptions(vocab.heelHeights);
  addOptions(vocab.platformHeights);
  addOptions(vocab.sportsTeams);
  addOptions(vocab.leagues);
  addOptions(vocab.categories);
  addOptions(vocab.departments);
  addOptions(vocab.classes);
  
  return map;
}

function computeOverall(scores: AIScores): number {
  const values = [scores.factual, scores.tone, scores.seo, scores.clarity].filter(v => v !== undefined) as number[];
  return values.length > 0 ? Math.round(values.reduce((sum, v) => sum + v, 0) / values.length) : 0;
}

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
  const { user } = useAuth();

  // AI functionality state
  const [aiDescriptions, setAiDescriptions] = useState<Record<string, AIDescription>>({});
  const [aiTone, setAiTone] = useState('Clean');
  const [aiLength, setAiLength] = useState('Medium');
  const [aiTemperature, setAiTemperature] = useState(0.6);
  const [generatingInline, setGeneratingInline] = useState(false);
  const [aiScores, setAiScores] = useState<AIScores | null>(null);
  const [aiCoach, setAiCoach] = useState<AICoach | null>(null);
  const [aiSEO, setAiSEO] = useState<AISEO | null>(null);
  const [usedTemplate, setUsedTemplate] = useState<{ scope: string; key: string; version: string; conditionsMatched?: string[] } | null>(null);
  const [improvementText, setImprovementText] = useState('');

  // AI Workflow Panel state
  const [aiWorkflowPanelOpen, setAiWorkflowPanelOpen] = useState(false);
  const [facts, setFacts] = useState<ProductFacts>({
    observations: '',
    materials: '',
    fit: '',
    useCases: '',
    care: '',
    teamLeague: '',
    keywords: [],
    images: [],
    updatedBy: '',
    updatedAt: null,
  });

  // Build vocab normalization map from live vocab data
  const vocabMap = useMemo(() => buildVocabMap(vocab), [vocab]);  // Load product
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

  // Load Product Facts
  useEffect(() => {
    if (!productId) {
      setFacts({
        observations: '',
        materials: '',
        fit: '',
        useCases: '',
        care: '',
        teamLeague: '',
        keywords: [],
        images: [],
        updatedBy: '',
        updatedAt: null,
      });
      return;
    }

    const loadFacts = async () => {
      try {
        const factsRef = doc(db, 'products', productId, 'facts', 'data');
        const snapshot = await getDoc(factsRef);
        
        if (snapshot.exists()) {
          setFacts(snapshot.data() as ProductFacts);
        } else {
          setFacts({
            observations: '',
            materials: '',
            fit: '',
            useCases: '',
            care: '',
            teamLeague: '',
            keywords: [],
            images: [],
            updatedBy: '',
            updatedAt: null,
          });
        }
      } catch (error) {
        console.error('Error loading facts:', error);
      }
    };

    loadFacts();
  }, [productId]);

  // Load AI descriptions
  useEffect(() => {
    if (!productId) {
      setAiDescriptions({});
      return;
    }

    const loadDescriptions = async () => {
      try {
        const descriptionsRef = collection(db, 'products', productId, 'descriptions');
        const snapshot = await getDocs(descriptionsRef);
        const descriptions: Record<string, AIDescription> = {};
        
        snapshot.forEach((doc) => {
          descriptions[doc.id] = doc.data() as AIDescription;
        });
        
        setAiDescriptions(descriptions);
      } catch (error) {
        console.error('Error loading AI descriptions:', error);
      }
    };

    loadDescriptions();
  }, [productId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  // Validate product
  useEffect(() => {
    if (product) {
      const { errors, warnings } = validateProduct(product);
      setValidationErrors(errors);
      setWarningMessages(warnings);
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

  // AI Workflow Panel update handler
  const handleAIWorkflowUpdate = useCallback((updates: any) => {
    setProduct(prev => {
      if (!prev) return prev;
      
      // Deep merge the updates into the product
      const updated = { ...prev };
      
      const applyNestedUpdate = (target: any, source: any) => {
        for (const key in source) {
          if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key]) target[key] = {};
            applyNestedUpdate(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        }
      };
      
      applyNestedUpdate(updated, updates);
      return updated;
    });
  }, []);

  // AI Generate handler
  const handleInlineGenerate = async () => {
    if (!product || !productId) {
      showToast('Product ID required', 'error');
      return;
    }

    try {
      setGeneratingInline(true);
      setAiScores(null);
      setAiCoach(null);
      setAiSEO(null);
      setUsedTemplate(null);
      
      const channel = 'RetailOps';
      
      // Convert new schema product back to legacy format for AI service
      const legacyProduct = newToLegacy(product);
      
      const payload: DescribeProductPayload = {
        productId,
        channel,
        tone: aiTone,
        length: aiLength,
        temperature: aiTemperature,
        facts: {
          observations: facts.observations,
          materials: facts.materials,
          fit: facts.fit,
          keywords: facts.keywords,
        },
        aiContext: {
          keywords: legacyProduct.aiContext?.keywords || [],
          featureBullets: legacyProduct.aiContext?.featureBullets || [],
          designNotes: legacyProduct.aiContext?.designNotes || '',
          priorDraft: legacyProduct.marketing?.paragraphDraft || undefined,
        },
        attributes: {
          name: legacyProduct.name,
          brand: legacyProduct.brand,
          mpn: legacyProduct.mpn,
          department: legacyProduct.department,
          class: legacyProduct.class,
          category: legacyProduct.category,
          ageGroup: legacyProduct.ageGroup,
          gender: legacyProduct.gender,
          material: legacyProduct.materialFabric,
          materials: legacyProduct.materials || [],
          fit: legacyProduct.fit,
          sportsTeam: legacyProduct.sportsTeam,
          league: legacyProduct.league,
          primaryColor: (legacyProduct as any).primaryColor ?? undefined,
          descriptiveColor: (legacyProduct as any).descriptiveColor ?? undefined,
          cutType: (legacyProduct as any).cutType ?? undefined,
          closureType: (legacyProduct as any).closureType ?? undefined,
          heelHeight: (legacyProduct as any).heelHeight ?? undefined,
          platformHeight: (legacyProduct as any).platformHeight ?? undefined,
          status: legacyProduct.status,
          websites: legacyProduct.websites,
          price: (legacyProduct as any).price ?? undefined,
        },
        imageUrl: facts.images[0]?.url,
      };
      
      const result = await describeProduct(payload, vocabMap);
      const description = result.description || result.text || '';
      
      if (!description) {
        showToast('No description returned from API', 'error');
        return;
      }

      // Update AI scores if available
      const scores: AIScores | undefined = result.scores || (result.seo_score || result.tone_score ? { seo: result.seo_score, tone: result.tone_score } : undefined);
      if (scores) {
        const overall = computeOverall(scores);
        setAiScores({ ...scores, overall });
      }
      setAiCoach(result.coach || null);
      setAiSEO(result.seo || null);
      setUsedTemplate((result as any).used_template || null);

      // Write to Firestore subcollection
      const descRef = doc(db, 'products', productId, 'descriptions', channel);
      let existing: any = null;
      try {
        const snap = await getDoc(descRef);
        if (snap.exists()) existing = snap.data();
      } catch { /* ignore */ }

      // Build history entry
      const newEntry = {
        text: description,
        scores: result.scores || null,
        coach: result.coach || null,
        seo: result.seo || null,
        facts_used: result.facts_used || [],
        at: Date.now(),
      };

      const prevHistoryRaw = Array.isArray(existing?.history) ? existing.history : [];
      const prevHistory = prevHistoryRaw
        .map((entry: any) => ({ ...entry, at: typeof entry?.at === 'object' ? Date.now() : entry?.at }))
        .slice(-2);

      await setDoc(
        descRef,
        {
          text: description,
          scores: result.scores || undefined,
          coach: result.coach || undefined,
          seo: result.seo || undefined,
          facts_used: result.facts_used || [],
          meta: {
            tone: aiTone,
            length: aiLength,
            temperature: aiTemperature,
            generatedAt: serverTimestamp(),
            title: result.seo?.meta_title,
            description: result.seo?.meta_description,
            keywords: result.seo?.meta_keywords,
          },
          history: [...prevHistory, newEntry],
        },
        { merge: true }
      );

      // Auto-apply to product description field
      setProduct(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          marketing: {
            ...prev.marketing,
            description: description,
          },
        };
      });

      // Reload descriptions
      const descriptionsRef = collection(db, 'products', productId, 'descriptions');
      const snapshot = await getDocs(descriptionsRef);
      const descriptions: Record<string, AIDescription> = {};
      
      snapshot.forEach((doc) => {
        descriptions[doc.id] = doc.data() as AIDescription;
      });
      
      setAiDescriptions(descriptions);
      showToast('Generated and applied to draft', 'success');
    } catch (error: any) {
      console.error('AI generation failed:', error);
      showToast(error?.message || 'Failed to generate description', 'error');
    } finally {
      setGeneratingInline(false);
    }
  };

  // Save product
  const handleSave = async () => {
    if (!product || !productId) return;

    setSaving(true);
    try {
      // Convert new schema to legacy format
      const legacyData = newToLegacy(product as NewProduct);
      
      // Strip undefined values to prevent Firestore errors
      const cleanedData = stripUndefined({
        ...legacyData,
        lastUpdated: serverTimestamp(),
      });
      
      // Write to Firestore
      const docRef = doc(db, 'products', productId);
      await setDoc(docRef, cleanedData, { merge: true });

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
                onClick={() => setAiWorkflowPanelOpen(true)}
                disabled={!productId}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>🤖</span>
                AI Assistant
              </button>
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
                { id: 'ai', label: 'AI Generate' },
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as SectionTab)}
                  className={`px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap ${
                    activeSection === section.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                  data-testid={section.id === 'ai' ? 'ai-tab' : undefined}
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
            {activeSection === 'ai' && (
              <AISection 
                product={product}
                facts={facts}
                aiDescriptions={aiDescriptions}
                aiScores={aiScores}
                aiCoach={aiCoach}
                usedTemplate={usedTemplate}
                aiTone={aiTone}
                setAiTone={setAiTone}
                aiLength={aiLength}
                setAiLength={setAiLength}
                aiTemperature={aiTemperature}
                setAiTemperature={setAiTemperature}
                generatingInline={generatingInline}
                handleInlineGenerate={handleInlineGenerate}
                improvementText={improvementText}
                setImprovementText={setImprovementText}
              />
            )}
          </div>
        </div>
      </div>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={hideToast} />
      )}

      {/* AI Workflow Panel */}
      <AIWorkflowPanel
        productId={productId || ''}
        productData={product ? newToLegacy(product as NewProduct) : null}
        onProductUpdate={handleAIWorkflowUpdate}
        isOpen={aiWorkflowPanelOpen}
        onClose={() => setAiWorkflowPanelOpen(false)}
      />
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
      <FormField label="New Collection">
        <select
          value={product.launch?.newCollection || ''}
          onChange={(e) => updateField('launch', 'newCollection', e.target.value || undefined)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">-- Select Collection --</option>
          {vocab.collections?.map((c: any) => (
            <option key={c.value || c} value={c.value || c}>
              {c.label || c}
            </option>
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
          {vocab.madeIn?.map((country: any) => (
            <option key={country.value || country} value={country.value || country}>
              {country.label || country}
            </option>
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

    <FormField label="Taxable">
      <label className="inline-flex items-center space-x-2">
        <input
          type="checkbox"
          checked={product.technical?.taxClass ?? true}
          onChange={(e) => updateField('technical', 'taxClass', e.target.checked)}
          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
        />
        <span className="text-sm text-gray-700">Charge sales tax</span>
      </label>
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

// AI Section Component
const AISection: React.FC<{
  product: Partial<NewProduct> | null;
  facts: ProductFacts;
  aiDescriptions: Record<string, AIDescription>;
  aiScores: AIScores | null;
  aiCoach: AICoach | null;
  usedTemplate: { scope: string; key: string; version: string; conditionsMatched?: string[] } | null;
  aiTone: string;
  setAiTone: (tone: string) => void;
  aiLength: string;
  setAiLength: (length: string) => void;
  aiTemperature: number;
  setAiTemperature: (temp: number) => void;
  generatingInline: boolean;
  handleInlineGenerate: () => Promise<void>;
  improvementText: string;
  setImprovementText: (text: string) => void;
}> = ({
  product,
  facts,
  aiDescriptions,
  aiScores,
  aiCoach,
  usedTemplate,
  aiTone,
  setAiTone,
  aiLength,
  setAiLength,
  aiTemperature,
  setAiTemperature,
  generatingInline,
  handleInlineGenerate,
  improvementText,
  setImprovementText
}) => {
  const legacyProduct = product ? newToLegacy(product as NewProduct) : null;
  const retailOpsDescription = aiDescriptions['RetailOps'];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Generate</h3>
      
      {/* Read-only Attribute Preview */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Product Attributes (read-only)</h3>
        <p className="text-xs text-gray-500 mb-3">Edit these in the Attributes tab</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><strong>Brand:</strong> {product?.sku_core?.brand || '—'}</div>
          <div><strong>Department:</strong> {legacyProduct?.department || '—'}</div>
          <div><strong>Category:</strong> {legacyProduct?.category || '—'}</div>
          <div><strong>Class:</strong> {legacyProduct?.class || '—'}</div>
          <div><strong>Age Group:</strong> {legacyProduct?.ageGroup || '—'}</div>
          <div><strong>Gender:</strong> {legacyProduct?.gender || '—'}</div>
          <div><strong>Material:</strong> {legacyProduct?.materialFabric || '—'}</div>
          <div><strong>Fit:</strong> {legacyProduct?.fit || '—'}</div>
          {legacyProduct?.sportsTeam && <div><strong>Team:</strong> {legacyProduct.sportsTeam}</div>}
          {legacyProduct?.league && <div><strong>League:</strong> {legacyProduct.league}</div>}
        </div>
      </div>

      {/* AI Quality Scores */}
      {aiScores && (
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50" data-testid="ai-scores">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-800">AI Quality Score</h3>
            {usedTemplate && (
              <span className="text-xs text-indigo-600 font-medium px-2 py-1 bg-indigo-100 rounded" data-testid="template-info">
                Audience: {usedTemplate.key} ({usedTemplate.version})
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-indigo-600">{aiScores.overall ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1">Overall</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-600">{aiScores.factual ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1" title="Accuracy of facts, use of observations verbatim">Factual</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-600">{aiScores.tone ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1" title="Matches requested tone and audience">Tone</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-600">{aiScores.seo ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1" title="Meta readiness and keyword use">SEO</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-indigo-600">{aiScores.clarity ?? 0}</p>
              <p className="text-xs text-gray-600 mt-1" title="Clarity and readability for buyers">Clarity</p>
            </div>
          </div>
          {aiCoach?.actions?.length ? (
            <div className="mt-3">
              <p className="text-xs text-gray-700 mb-1">To reach 10:</p>
              <div className="flex flex-wrap gap-2">
                {aiCoach.actions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    className="px-2 py-1 text-xs bg-white border border-indigo-200 text-indigo-700 rounded-full hover:bg-indigo-50"
                    onClick={async () => {
                      setImprovementText(action);
                      await handleInlineGenerate();
                    }}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* AI Settings */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">AI Settings</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tone</label>
            <select 
              value={aiTone} 
              onChange={(e) => setAiTone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="Clean">Clean</option>
              <option value="Professional">Professional</option>
              <option value="Casual">Casual</option>
              <option value="Luxury">Luxury</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Length</label>
            <select 
              value={aiLength} 
              onChange={(e) => setAiLength(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="Short">Short</option>
              <option value="Medium">Medium</option>
              <option value="Long">Long</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
            <input 
              type="number" 
              min="0" 
              max="1" 
              step="0.1"
              value={aiTemperature} 
              onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleInlineGenerate}
          disabled={generatingInline || !product}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          data-testid="generate-button"
        >
          {generatingInline ? 'Generating...' : '✨ Generate with AI'}
        </button>
      </div>

      {/* Preview */}
      {retailOpsDescription && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Generated Description</h4>
          <div className="prose prose-sm max-w-none" data-testid="preview-html">
            <div dangerouslySetInnerHTML={{ __html: retailOpsDescription.text }} />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                // Auto-apply is handled in generation, so this is just a visual confirmation
                alert('Description applied to product');
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              data-testid="approve-button"
            >
              ✓ Applied to Product
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductEditorV2;
